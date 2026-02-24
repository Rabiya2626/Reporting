import logger from '../../../utils/logger.js';
import prisma from '../../../prisma/client.js';

/**
 * SMS Enrichment Service - handles incremental, contact-by-contact population
 * of mobile_number, message_text, reply_text for SMS stats
 * 
 * This service is designed to run as a background worker/cron job,
 * processing one contact at a time to ensure partial results are committed
 * frequently and the frontend can display data immediately.
 */
class SmsEnrichmentService {
  constructor() {
    this.isRunning = false;
    this.currentBatch = null;
  }

  /**
   * Get enrichment progress stats
   * @returns {Promise<Object>} Progress metrics
   */
  async getProgressStats() {
    try {
      const totalRecords = await prisma.mauticSmsStat.count();
      const syncedRecords = await prisma.mauticSmsStat.count({ where: { isSynced: true } });
      const unsyncedRecords = await prisma.mauticSmsStat.count({ where: { isSynced: false } });
      const failedRecords = await prisma.mauticSmsStat.count({
        where: {
          isSynced: false,
          syncError: { not: null }
        }
      });

      return {
        total: totalRecords,
        synced: syncedRecords,
        unsynced: unsyncedRecords,
        failed: failedRecords,
        progress: totalRecords > 0 ? ((syncedRecords / totalRecords) * 100).toFixed(1) : 0,
        isRunning: this.isRunning
      };
    } catch (error) {
      logger.error('Failed to get enrichment progress:', error.message);
      return { error: error.message };
    }
  }

  /**
   * Retry helper with exponential backoff
   * @param {Function} fn - Async function to retry
   * @param {number} maxRetries - Max retry attempts
   * @param {number} initialDelay - Initial delay in ms
   */
  async retryWithBackoff(fn, maxRetries = 3, initialDelay = 500) {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        const isRetryable =
          error.code === 'ETIMEDOUT' ||
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNREFUSED' ||
          error.message.includes('socket hang up') ||
          error.response?.status === 429 ||
          error.response?.status === 503;

        if (!isRetryable || i === maxRetries - 1) {
          throw error;
        }

        const delay = Math.min(initialDelay * Math.pow(2, i), 10000); // Cap at 10s
        logger.debug(`   Retry ${i + 1}/${maxRetries} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  /**
   * Enrich one SMS stat record with mobile, message, and reply data
   * @param {Object} stat - MauticSmsStat record
   * @param {Object} client - Mautic client configuration
   * @returns {Promise<Object>} Enrichment result
   */
  async enrichSingleRecord(stat, client) {
    try {
      const mauticAPI = (await import('./mauticAPI.js')).default;

      let enrichedData = {
        lastSyncedAt: new Date(),
        isSynced: false,
        syncError: null
      };

      // 1. Fetch mobile number if not already present
      if (!stat.mobile) {
        try {
          const contactDetails = await this.retryWithBackoff(() =>
            mauticAPI.fetchContactDetails(client, stat.leadId)
          );

          if (contactDetails.mobile) {
            enrichedData.mobile = contactDetails.mobile;
          }
        } catch (error) {
          logger.warn(`   ⚠️ Failed to fetch mobile for lead ${stat.leadId}: ${error.message}`);
        }
      }

      // 2. Fetch SMS message text and reply data if not already present
      if (!stat.messageText || !stat.replyText) {
        try {
          const smsActivity = await this.retryWithBackoff(() =>
            mauticAPI.fetchContactSmsActivity(client, stat.leadId, stat.mauticSmsId)
          );

          if (Array.isArray(smsActivity) && smsActivity.length > 0) {
            // Get sent message
            const sentEvent = smsActivity.find(e => e.event === 'sms.sent');
            if (sentEvent && sentEvent.details?.message) {
              enrichedData.messageText = sentEvent.details.message;
            }

            // Get reply (most recent first)
            const replyEvent = smsActivity.find(e => e.event === 'sms_reply' || e.event === 'sms.reply');
            if (replyEvent) {
              enrichedData.replyText = replyEvent.details?.message || null;
              enrichedData.replyCategory = this.categorizeReply(replyEvent.details?.message || '');
              enrichedData.repliedAt = replyEvent.timestamp ? new Date(replyEvent.timestamp) : new Date();
            }
          }
        } catch (error) {
          logger.warn(`   ⚠️ Failed to fetch SMS activity for lead ${stat.leadId}: ${error.message}`);
        }
      }

      // Mark as synced if we have at least some enrichment
      if (enrichedData.mobile || enrichedData.messageText) {
        enrichedData.isSynced = true;
      }

      // Update record with enriched data
      await prisma.mauticSmsStat.update({
        where: { id: stat.id },
        data: enrichedData
      });

      return {
        success: true,
        statId: stat.id,
        leadId: stat.leadId,
        fieldsEnriched: Object.keys(enrichedData).filter(k => enrichedData[k])
      };
    } catch (error) {
      logger.error(`   ❌ Failed to enrich stat ${stat.id}:`, error.message);

      // Record the error for retry logic
      await prisma.mauticSmsStat.update({
        where: { id: stat.id },
        data: {
          syncError: error.message.substring(0, 255),
          lastSyncedAt: new Date()
        }
      });

      return {
        success: false,
        statId: stat.id,
        leadId: stat.leadId,
        error: error.message
      };
    }
  }

  /**
   * Categorize SMS reply text
   * @param {string} text - Reply text
   * @returns {string} Category: "Stop", "Unsubscribe", or "Other"
   */
  categorizeReply(text) {
    if (!text) return 'Other';
    const lowerText = text.toLowerCase().trim();

    if (lowerText === 'stop' || lowerText.startsWith('stop ')) {
      return 'Stop';
    } else if (lowerText.includes('unsubscribe')) {
      return 'Unsubscribe';
    }
    return 'Other';
  }

  /**
   * Process batch of unsynced SMS stats incrementally
   * Fetches data for one contact at a time, commits frequently
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Results
   */
  async processBatch(options = {}) {
    const {
      batchSize = 50, // Process X unsynced records per run
      maxDuration = 300000 // Max 5 minutes per batch
    } = options;

    if (this.isRunning) {
      logger.warn('SMS enrichment already in progress');
      return { success: false, message: 'Already processing' };
    }

    this.isRunning = true;
    const startTime = Date.now();
    let processed = 0;
    let successful = 0;
    let failed = 0;

    try {
      logger.info(`📨 Starting SMS enrichment batch (max ${batchSize} records, ${maxDuration}ms timeout)`);

      // Get mapping of SMS ID to client credentials
      const clientsMap = await this.getClientMap();

      if (Object.keys(clientsMap).length === 0) {
        logger.warn('⚠️ No active Mautic clients found for SMS enrichment');
        return {
          success: false,
          message: 'No active Mautic clients',
          processed: 0
        };
      }

      // Get unsynced records that need enrichment
      // Prioritize: records with no mobile number, then records not yet attempted
      const unsyncedRecords = await prisma.mauticSmsStat.findMany({
        where: {
          isSynced: false,
          mauticSmsId: { not: null }
        },
        include: { sms: { include: { client: true } } },
        orderBy: [
          { mobile: 'asc' }, // Non-null mobile first (already partially enriched)
          { lastSyncedAt: 'asc' }, // Then by sync time (never synced first)
          { id: 'asc' } // Then chronologically
        ],
        take: batchSize
      });

      if (unsyncedRecords.length === 0) {
        logger.info('✅ No unsynced SMS records - enrichment complete!');
        this.isRunning = false;
        return {
          success: true,
          message: 'All SMS records synced',
          processed: 0,
          successful: 0,
          failed: 0
        };
      }

      logger.info(`   Processing ${unsyncedRecords.length} unsynced records...`);

      // Process each record one by one (pure sequential)
      for (const record of unsyncedRecords) {
        // Check timeout
        if (Date.now() - startTime > maxDuration) {
          logger.info(`⏱️ Time limit reached (${maxDuration}ms), stopping batch`);
          break;
        }

        try {
          processed++;

          // Get client for this SMS
          let client = record.sms?.client;

          if (!client && clientsMap[record.mauticSmsId]) {
            client = clientsMap[record.mauticSmsId];
          }

          if (!client) {
            logger.debug(`✗ No client found for SMS ${record.mauticSmsId}`);
            failed++;
            continue;
          }

          logger.debug(`   [${processed}/${unsyncedRecords.length}] Enriching lead ${record.leadId} (SMS: ${record.mauticSmsId})...`);

          // Enrich this single record
          const result = await this.enrichSingleRecord(record, client);

          if (result.success) {
            successful++;
            logger.debug(`   ✅ Enriched: ${result.fieldsEnriched.join(', ')}`);
          } else {
            failed++;
          }

          // Commit frequently (every record) to allow partial UI updates
          // No explicit commit needed with Prisma - each update is atomic
        } catch (error) {
          logger.error(`Error processing record ${record.id}:`, error.message);
          failed++;
        }

        // Small delay between requests to prevent API overload
        await new Promise(r => setTimeout(r, 100));
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      logger.info(`✅ Batch complete in ${duration}s:`);
      logger.info(`   Processed: ${processed}`);
      logger.info(`   Successful: ${successful}`);
      logger.info(`   Failed: ${failed}`);

      this.isRunning = false;

      return {
        success: true,
        processed,
        successful,
        failed,
        durationSeconds: parseFloat(duration)
      };
    } catch (error) {
      logger.error('❌ Batch processing failed:', error.message);
      this.isRunning = false;
      return {
        success: false,
        error: error.message,
        processed,
        successful,
        failed
      };
    }
  }

  /**
   * Get mapping of MauticSmsId to client credentials
   * @returns {Promise<Object>} Map of mauticSmsId -> client
   */
  async getClientMap() {
    try {
      const clients = await prisma.mauticClient.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          mauticUrl: true,
          username: true,
          password: true,
          smsCampaigns: {
            select: { mauticId: true }
          }
        }
      });

      const map = {};
      for (const client of clients) {
        // Map each SMS campaign to its client
        client.smsCampaigns?.forEach(sms => {
          map[sms.mauticId] = client;
        });
      }

      return map;
    } catch (error) {
      logger.error('Failed to build client map:', error.message);
      return {};
    }
  }

  /**
   * Retry failed records that had temporary errors
   * Only retries records that had errors, skips successfully synced ones
   * @param {Object} options - Processing options
   * @returns {Promise<Object>} Results
   */
  async retryFailed(options = {}) {
    const { maxRetries = 20 } = options;

    logger.info(`🔄 Retrying failed SMS enrichment records (max ${maxRetries})...`);

    // Get failed records (those with syncError)
    const failedRecords = await prisma.mauticSmsStat.findMany({
      where: {
        isSynced: false,
        syncError: { not: null }
      },
      include: { sms: { include: { client: true } } },
      orderBy: { lastSyncedAt: 'asc' },
      take: maxRetries
    });

    if (failedRecords.length === 0) {
      logger.info('✅ No failed records to retry');
      return { retried: 0, successful: 0, failed: 0 };
    }

    let successful = 0;
    let failed = 0;

    for (const record of failedRecords) {
      try {
        const result = await this.enrichSingleRecord(record, record.sms.client);
        if (result.success) {
          successful++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }

      await new Promise(r => setTimeout(r, 100));
    }

    logger.info(`✅ Retry complete: ${successful} successful, ${failed} failed`);

    return {
      retried: failedRecords.length,
      successful,
      failed
    };
  }

  /**
   * Force full re-sync of all records (clears isSynced flags)
   * Use with caution - for manual maintenance only
   * @param {number} smsId - Optional: only re-sync this SMS campaign
   */
  async forceFullResync(smsId = null) {
    logger.warn(`⚠️ Forcing full re-sync ${smsId ? `for SMS ${smsId}` : 'for all SMS'}...`);

    const where = smsId
      ? { smsId }
      : {};

    const result = await prisma.mauticSmsStat.updateMany({
      where,
      data: {
        isSynced: false,
        syncError: null,
        lastSyncedAt: null
      }
    });

    logger.info(`Cleared sync status for ${result.count} records`);
    return result;
  }
}

export default new SmsEnrichmentService();
