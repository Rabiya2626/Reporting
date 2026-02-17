import prisma from '../../../prisma/client.js';

/**
 * Service for handling aggregated email report stats
 * This reduces database storage by 90%+ and improves query performance
 */
class AggregatedReportService {
  /**
   * Aggregate raw report rows by eId + date and save to aggregated table
   * @param {number} clientId - Client ID
   * @param {Array} reportRows - Raw report rows from Mautic API
   * @returns {Promise<Object>} Save results
   */
  async saveAggregatedReports(clientId, reportRows) {
    try {
      console.log(`📊 [AggregatedReportService] Aggregating ${reportRows.length} email report records for client ${clientId}...`);

      if (reportRows.length === 0) {
        console.log(`✅ [AggregatedReportService] No email reports to aggregate`);
        return { success: true, created: 0, updated: 0, total: 0, originalRows: 0, reductionPercent: 0 };
      }

      // Group by eId + date
      const grouped = new Map();

      for (const row of reportRows) {
        if (!row.e_id || !row.date_sent) {
          console.log(`   ⚠️  Skipping row with missing e_id or date_sent:`, { e_id: row.e_id, date_sent: row.date_sent });
          continue;
        }

        const eId = parseInt(row.e_id);
        const dateSent = new Date(row.date_sent);
        
        // Extract date only (no time)
        const dateOnly = new Date(dateSent.getFullYear(), dateSent.getMonth(), dateSent.getDate());
        const key = `${eId}_${dateOnly.toISOString().split('T')[0]}`;

        if (!grouped.has(key)) {
          grouped.set(key, {
            eId,
            date: dateOnly,
            sentCount: 0,
            readCount: 0,
            subject: row.subject1 || row.subject || null
          });
        }

        const group = grouped.get(key);
        group.sentCount++;
        if (row.date_read && row.date_read.trim()) {
          group.readCount++;
        }
      }

      const aggregated = Array.from(grouped.values());
      console.log(`   ⚡ [AggregatedReportService] Aggregated ${reportRows.length} rows into ${aggregated.length} grouped records (${Math.round((1 - aggregated.length / reportRows.length) * 100)}% reduction)`);

      if (aggregated.length === 0) {
        console.log(`   ⚠️  [AggregatedReportService] No valid records to save after aggregation`);
        return { success: true, created: 0, updated: 0, total: 0, originalRows: reportRows.length, reductionPercent: 0 };
      }

      // Fetch existing aggregated records to update them
      const eIds = [...new Set(aggregated.map(a => a.eId))];
      const dates = [...new Set(aggregated.map(a => a.date))];

      console.log(`   🔍 [AggregatedReportService] Checking for existing records (${eIds.length} unique eIds, ${dates.length} unique dates)...`);

      const existing = await prisma.mauticEmailReportAggregated.findMany({
        where: {
          clientId,
          eId: { in: eIds },
          date: { in: dates }
        },
        select: {
          id: true,
          eId: true,
          date: true,
          sentCount: true,
          readCount: true
        }
      });

      // Build lookup map
      const existingMap = new Map();
      existing.forEach(e => {
        const key = `${e.eId}_${e.date.toISOString().split('T')[0]}`;
        existingMap.set(key, e);
      });

      console.log(`   Found ${existing.length} existing aggregated records to update`);

      // Separate into creates and updates
      const toCreate = [];
      const toUpdate = [];

      for (const agg of aggregated) {
        const key = `${agg.eId}_${agg.date.toISOString().split('T')[0]}`;
        const existingRecord = existingMap.get(key);

        if (existingRecord) {
          // Update: add to existing counts
          toUpdate.push({
            id: existingRecord.id,
            sentCount: existingRecord.sentCount + agg.sentCount,
            readCount: existingRecord.readCount + agg.readCount
          });
        } else {
          // Create new record
          toCreate.push({
            clientId,
            eId: agg.eId,
            date: agg.date,
            sentCount: agg.sentCount,
            readCount: agg.readCount,
            subject: agg.subject
          });
        }
      }

      let created = 0;
      let updated = 0;

      // Batch create new records
      if (toCreate.length > 0) {
        console.log(`   💾 [AggregatedReportService] Creating ${toCreate.length} new aggregated records...`);
        const BATCH_SIZE = 1000;
        for (let i = 0; i < toCreate.length; i += BATCH_SIZE) {
          const batch = toCreate.slice(i, i + BATCH_SIZE);
          try {
            const result = await prisma.mauticEmailReportAggregated.createMany({
              data: batch,
              skipDuplicates: true
            });
            created += result.count;
            console.log(`      Batch ${Math.floor(i / BATCH_SIZE) + 1}: Created ${result.count} records`);
          } catch (batchError) {
            console.error(`      ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchError.message);
            throw batchError;
          }
        }
        console.log(`   ✅ Created ${created} new aggregated records`);
      }

      // Batch update existing records
      if (toUpdate.length > 0) {
        console.log(`   🔄 [AggregatedReportService] Updating ${toUpdate.length} existing aggregated records...`);
        for (const update of toUpdate) {
          try {
            await prisma.mauticEmailReportAggregated.update({
              where: { id: update.id },
              data: {
                sentCount: update.sentCount,
                readCount: update.readCount
              }
            });
            updated++;
          } catch (updateError) {
            console.error(`      ❌ Update failed for record ${update.id}:`, updateError.message);
          }
        }
        console.log(`   ✅ Updated ${updated} existing aggregated records`);
      }

      console.log(`✅ [AggregatedReportService] Aggregated reports saved: ${created} created, ${updated} updated`);

      return {
        success: true,
        created,
        updated,
        total: aggregated.length,
        originalRows: reportRows.length,
        reductionPercent: Math.round((1 - aggregated.length / reportRows.length) * 100)
      };
    } catch (error) {
      console.error('❌ [AggregatedReportService] Error saving aggregated reports:', error);
      console.error('   Stack:', error.stack);
      throw new Error(`Failed to save aggregated reports: ${error.message}`);
    }
  }

  /**
   * Get aggregated report stats for a client
   * @param {number} clientId - Client ID
   * @param {Object} filters - Optional filters (fromDate, toDate, eId)
   * @returns {Promise<Array>} Aggregated stats
   */
  async getAggregatedReports(clientId, filters = {}) {
    try {
      const where = { clientId };

      if (filters.fromDate || filters.toDate) {
        where.date = {};
        if (filters.fromDate) {
          where.date.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          where.date.lte = new Date(filters.toDate);
        }
      }

      if (filters.eId) {
        where.eId = parseInt(filters.eId);
      }

      const results = await prisma.mauticEmailReportAggregated.findMany({
        where,
        orderBy: { date: 'desc' }
      });

      return results;
    } catch (error) {
      console.error('Error fetching aggregated reports:', error);
      throw new Error(`Failed to fetch aggregated reports: ${error.message}`);
    }
  }

  /**
   * Get aggregated stats summary for a client
   * @param {number} clientId - Client ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} Summary stats
   */
  async getAggregatedSummary(clientId, filters = {}) {
    try {
      const where = { clientId };

      if (filters.fromDate || filters.toDate) {
        where.date = {};
        if (filters.fromDate) {
          where.date.gte = new Date(filters.fromDate);
        }
        if (filters.toDate) {
          where.date.lte = new Date(filters.toDate);
        }
      }

      const summary = await prisma.mauticEmailReportAggregated.aggregate({
        where,
        _sum: {
          sentCount: true,
          readCount: true
        },
        _count: {
          id: true
        }
      });

      const totalSent = summary._sum.sentCount || 0;
      const totalRead = summary._sum.readCount || 0;
      const readRate = totalSent > 0 ? ((totalRead / totalSent) * 100).toFixed(2) : 0;

      return {
        totalSent,
        totalRead,
        readRate: parseFloat(readRate),
        recordCount: summary._count.id || 0
      };
    } catch (error) {
      console.error('Error fetching aggregated summary:', error);
      throw new Error(`Failed to fetch aggregated summary: ${error.message}`);
    }
  }
}

export default new AggregatedReportService();
