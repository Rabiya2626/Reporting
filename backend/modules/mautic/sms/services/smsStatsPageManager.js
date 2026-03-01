/**
 * SMS Stats Page Manager - Handles persisting SMS stats pages to disk
 * before database insertion, enabling safe resumption from crashes
 * 
 * Mirrors the pattern used for email reports in .temp_pages
 */

import fs from 'fs';
import path from 'path';
import logger from '../../../../utils/logger.js';

class SmsStatsPageManager {
  constructor() {
    // Base temp directory - same as email reports
    this.baseTemp = path.join(process.cwd(), '.temp_pages');
    this.ensureBaseDir();
  }

  /**
   * Ensure base temp directory exists
   */
  ensureBaseDir() {
    try {
      if (!fs.existsSync(this.baseTemp)) {
        fs.mkdirSync(this.baseTemp, { recursive: true });
        logger.info(`📁 Created .temp_pages directory: ${this.baseTemp}`);
      }
    } catch (e) {
      logger.warn(`⚠️ Failed to ensure .temp_pages directory:`, e.message);
    }
  }

  /**
   * Get directory for SMS stats pages with date-based organization
   * @param {string} dateStr - Date string (YYYY-MM-DD or ISO)
   * @returns {string} Directory path
   */
  getPageDir(dateStr = null) {
    // Use YYYY-MM format like email reports
    let monthKey = 'sms-stats';
    
    if (dateStr) {
      try {
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          monthKey = `sms-${y}-${m}`;
        }
      } catch (e) {
        logger.debug(`Failed to parse date for monthKey: ${dateStr}`);
      }
    }

    return path.join(this.baseTemp, monthKey);
  }

  /**
   * Save a page of SMS stats to disk
   * @param {number} pageNumber - Page number
   * @param {Array} pageData - Array of SMS stat objects
   * @param {string} dateStr - Optional date for directory organization
   * @returns {boolean} Success status
   */
  savePage(pageNumber, pageData, dateStr = null) {
    try {
      const dir = this.getPageDir(dateStr);
      
      // Ensure directory exists
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const filename = `sms_stats_page_${pageNumber}.json`;
      const filepath = path.join(dir, filename);

      // Write with metadata
      const payload = {
        pageNumber,
        totalRecords: pageData.length,
        savedAt: new Date().toISOString(),
        data: pageData
      };

      fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));
      logger.info(`💾 Saved SMS stats page ${pageNumber} (${pageData.length} records) to ${filename}`);
      
      return true;
    } catch (e) {
      logger.error(`❌ Failed to save SMS stats page ${pageNumber}:`, e.message);
      return false;
    }
  }

  /**
   * Load a saved page from disk
   * @param {number} pageNumber - Page number
   * @param {string} dateStr - Optional date for directory lookup
   * @returns {Array|null} Page data or null if not found
   */
  loadPage(pageNumber, dateStr = null) {
    try {
      const dir = this.getPageDir(dateStr);
      const filename = `sms_stats_page_${pageNumber}.json`;
      const filepath = path.join(dir, filename);

      if (!fs.existsSync(filepath)) {
        return null;
      }

      const content = fs.readFileSync(filepath, 'utf-8');
      const payload = JSON.parse(content);
      
      logger.info(`📖 Loaded SMS stats page ${pageNumber} from disk (${payload.data.length} records)`);
      return payload.data;
    } catch (e) {
      logger.error(`❌ Failed to load SMS stats page ${pageNumber}:`, e.message);
      return null;
    }
  }

  /**
   * Delete a page file after successful insertion
   * @param {number} pageNumber - Page number
   * @param {string} dateStr - Optional date for directory lookup
   * @returns {boolean} Success status
   */
  deletePage(pageNumber, dateStr = null) {
    try {
      const dir = this.getPageDir(dateStr);
      const filename = `sms_stats_page_${pageNumber}.json`;
      const filepath = path.join(dir, filename);

      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        logger.info(`🗑️  Deleted SMS stats page ${pageNumber} after successful insertion`);
      }
      
      return true;
    } catch (e) {
      logger.error(`❌ Failed to delete SMS stats page ${pageNumber}:`, e.message);
      return false;
    }
  }

  /**
   * Find all orphaned page files (from interrupted syncs)
   * @returns {Array} List of found page files with metadata
   */
  findOrphanedPages() {
    try {
      const orphanedPages = [];

      // Check all subdirectories under .temp_pages
      if (!fs.existsSync(this.baseTemp)) {
        return orphanedPages;
      }

      const subdirs = fs.readdirSync(this.baseTemp);

      for (const subdir of subdirs) {
        const subdirPath = path.join(this.baseTemp, subdir);
        
        // Skip if not a directory
        if (!fs.statSync(subdirPath).isDirectory()) {
          continue;
        }

        // Only process SMS stats directories
        if (!subdir.startsWith('sms-')) {
          continue;
        }

        const files = fs.readdirSync(subdirPath);

        for (const file of files) {
          const match = file.match(/^sms_stats_page_(\d+)\.json$/);
          if (match) {
            const pageNumber = parseInt(match[1], 10);
            const filepath = path.join(subdirPath, file);

            orphanedPages.push({
              pageNumber,
              filepath,
              dir: subdir,
              filename: file
            });
          }
        }
      }

      if (orphanedPages.length > 0) {
        logger.warn(`⚠️  Found ${orphanedPages.length} orphaned SMS stats pages from interrupted syncs`);
        orphanedPages.forEach(p => {
          logger.info(`   - Page ${p.pageNumber} in ${p.dir}/${p.filename}`);
        });
      }

      return orphanedPages;
    } catch (e) {
      logger.error(`❌ Error finding orphaned pages:`, e.message);
      return [];
    }
  }

  /**
   * Recover and load all orphaned pages in order
   * @returns {Array} Array of {pageNumber, data} objects
   */
  recoverOrphanedPages() {
    try {
      const orphaned = this.findOrphanedPages();

      if (orphaned.length === 0) {
        return [];
      }

      logger.info(`🔄 Recovering ${orphaned.length} orphaned SMS stats pages...`);

      const recovered = [];

      // Sort by page number to maintain order
      orphaned.sort((a, b) => a.pageNumber - b.pageNumber);

      for (const page of orphaned) {
        try {
          const content = fs.readFileSync(page.filepath, 'utf-8');
          const payload = JSON.parse(content);
          
          recovered.push({
            pageNumber: page.pageNumber,
            data: payload.data,
            filepath: page.filepath
          });

          logger.info(`📖 Recovered page ${page.pageNumber} (${payload.data.length} records)`);
        } catch (e) {
          logger.error(`❌ Failed to recover page ${page.pageNumber}:`, e.message);
        }
      }

      return recovered;
    } catch (e) {
      logger.error(`❌ Error recovering orphaned pages:`, e.message);
      return [];
    }
  }

  /**
   * Clean up all SMS stats page files
   * @returns {number} Number of files deleted
   */
  cleanupAll() {
    try {
      let deleted = 0;

      if (!fs.existsSync(this.baseTemp)) {
        return deleted;
      }

      const subdirs = fs.readdirSync(this.baseTemp);

      for (const subdir of subdirs) {
        const subdirPath = path.join(this.baseTemp, subdir);

        if (!fs.statSync(subdirPath).isDirectory() || !subdir.startsWith('sms-')) {
          continue;
        }

        const files = fs.readdirSync(subdirPath);

        for (const file of files) {
          if (file.match(/^sms_stats_page_\d+\.json$/)) {
            try {
              fs.unlinkSync(path.join(subdirPath, file));
              deleted++;
            } catch (e) {
              logger.warn(`Failed to delete ${file}:`, e.message);
            }
          }
        }
      }

      if (deleted > 0) {
        logger.info(`🗑️  Cleaned up ${deleted} SMS stats page files`);
      }

      return deleted;
    } catch (e) {
      logger.error(`❌ Error cleaning up SMS stats pages:`, e.message);
      return 0;
    }
  }
}

export default new SmsStatsPageManager();
