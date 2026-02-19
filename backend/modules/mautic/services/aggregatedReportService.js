import prisma from '../../../prisma/client.js';

/**
 * Service for handling aggregated email report stats
 * This reduces database storage by 90%+ and improves query performance
 * 
 * IMPORTANT: saveAggregatedReports should be called ONCE with ALL data,
 * not per-batch! The grouping logic must see all rows to aggregate correctly.
 */
class AggregatedReportService {
  /**
   * Aggregate raw report rows by eId + date and save to aggregated table
   * Uses same grouping logic as aggEmailReports.js script
   * 
   * @param {number} clientId - Client ID
   * @param {Array} reportRows - ALL raw report rows from Mautic API (not per-batch!)
   * @returns {Promise<Object>} Save results
   */
  async saveAggregatedReports(clientId, reportRows) {
    try {
      console.log(`📊 [AggregatedReportService] Aggregating ${reportRows.length} email report records for client ${clientId}...`);

      if (reportRows.length === 0) {
        console.log(`✅ [AggregatedReportService] No email reports to aggregate`);
        return { success: true, created: 0, updated: 0, total: 0, originalRows: 0, reductionPercent: 0 };
      }

      // Group by eId + date (same logic as aggEmailReports.js)
      const grouped = {};

      for (const row of reportRows) {
        const e_id = row.e_id;
        const date = row.date_sent?.slice(0, 10); // Extract YYYY-MM-DD
        
        if (!e_id || !date) {
          continue; // Skip invalid rows
        }

        const key = `${e_id}_${date}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            eId: parseInt(e_id),
            date: new Date(date + 'T00:00:00Z'), // Parse as UTC date
            sentCount: 0,
            readCount: 0,
            subject: row.subject1 || row.subject || null
          };
        }

        grouped[key].sentCount++;
        if (row.date_read?.trim()) {
          grouped[key].readCount++;
        }
      }

      const aggregated = Object.values(grouped);
      console.log(`   ⚡ [AggregatedReportService] Aggregated ${reportRows.length} rows into ${aggregated.length} grouped records (${Math.round((1 - aggregated.length / reportRows.length) * 100)}% reduction)`);

      if (aggregated.length === 0) {
        console.log(`   ⚠️  [AggregatedReportService] No valid records to save after aggregation`);
        return { success: true, created: 0, updated: 0, total: 0, originalRows: reportRows.length, reductionPercent: 0 };
      }

      // Sort by date (earliest to latest)
      aggregated.sort((a, b) => a.date - b.date);
      console.log(`   📅 Date range: ${aggregated[0].date.toISOString().split('T')[0]} → ${aggregated[aggregated.length - 1].date.toISOString().split('T')[0]}`);

      // Save to database in batches
      console.log(`   💾 [AggregatedReportService] Saving ${aggregated.length} aggregated records...`);
      
      const BATCH_SIZE = 1000;
      let created = 0;

      for (let i = 0; i < aggregated.length; i += BATCH_SIZE) {
        const batch = aggregated.slice(i, i + BATCH_SIZE);
        try {
          const result = await prisma.mauticEmailReportAggregated.createMany({
            data: batch.map(agg => ({
              clientId,
              eId: agg.eId,
              date: agg.date,
              sentCount: agg.sentCount,
              readCount: agg.readCount,
              subject: agg.subject
            })),
            skipDuplicates: true // Skip if already exists (prevents duplicates)
          });
          created += result.count;
          console.log(`      Batch ${Math.floor(i / BATCH_SIZE) + 1}: Created ${result.count} records`);
        } catch (batchError) {
          console.error(`      ❌ Batch ${Math.floor(i / BATCH_SIZE) + 1} failed:`, batchError.message);
          throw batchError;
        }
      }

      console.log(`✅ [AggregatedReportService] Aggregated reports saved: ${created} created`);

      return {
        success: true,
        created,
        updated: 0,
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
