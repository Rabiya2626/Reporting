/**
 * Script to update replyCategory column in mautic_sms_stats table
 * Sets replyCategory to 'Stop' for any replyText containing 'STOP' (case-insensitive)
 * Sets replyCategory to 'Other' for other replies
 * Run: node updateReplyCategories.js
 */

import prisma from '../prisma/client.js';
import logger from './logger.js';

async function updateReplyCategories() {
  try {
    logger.info('🔄 Starting to update replyCategory column...');

    // Find all stats with replyText but NULL replyCategory
    const statsToUpdate = await prisma.mauticSmsStat.findMany({
      where: {
        replyText: { not: null },
        replyCategory: null
      },
      select: {
        id: true,
        replyText: true
      }
    });

    logger.info(`Found ${statsToUpdate.length} records to update`);

    let stopeCount = 0;
    let otherCount = 0;
    const errors = [];

    // Update each record
    for (const stat of statsToUpdate) {
      try {
        // Check if replyText contains 'STOP' (case-insensitive)
        const category = stat.replyText.toUpperCase().includes('STOP') ? 'Stop' : 'Other';

        await prisma.mauticSmsStat.update({
          where: { id: stat.id },
          data: { replyCategory: category }
        });

        if (category === 'Stop') {
          stopeCount++;
        } else {
          otherCount++;
        }
      } catch (error) {
        errors.push({
          statId: stat.id,
          error: error.message
        });
        logger.error(`Error updating stat ${stat.id}:`, error.message);
      }
    }

    logger.info(`✅ Update complete:`);
    logger.info(`   ${stopeCount} records categorized as "Stop"`);
    logger.info(`   ${otherCount} records categorized as "Other"`);

    if (errors.length > 0) {
      logger.error(`   ${errors.length} errors encountered`);
      errors.forEach(e => {
        logger.error(`   - Stat ${e.statId}: ${e.error}`);
      });
    }

    // Verify the updates
    const updated = await prisma.mauticSmsStat.groupBy({
      by: ['replyCategory'],
      where: { replyText: { not: null } },
      _count: true
    });

    logger.info(`\n📊 Final stats:`);
    updated.forEach(row => {
      logger.info(`   ${row.replyCategory || 'NULL'}: ${row._count} records`);
    });

    process.exit(0);
  } catch (error) {
    logger.error('❌ Failed to update reply categories:', error);
    process.exit(1);
  }
}

updateReplyCategories();
