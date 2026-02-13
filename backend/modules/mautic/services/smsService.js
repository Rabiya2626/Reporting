import prisma from '../../../prisma/client.js';
import logger from '../../../utils/logger.js';

class SmsService {
  /**
   * Categorize SMS campaigns based on first-word matching with Mautic client names
   * @param {Array} smsCampaigns - Array of SMS campaigns from Mautic
   * @param {Array} mauticClients - Array of all Mautic clients (EXCLUDING sms-only clients)
   * @returns {Object} Categorized SMS campaigns
   */
  categorizeSms(smsCampaigns, mauticClients) {
    const categorized = {
      matched: [], // SMS with first-word match to client (e.g., "JAE Distro SMS 1" matches "JAE Automation")
      unmatched: [] // SMS without first-word match (goes to SMS Clients)
    };

    // Filter out sms-only clients from matching to avoid conflicts
    const regularClients = mauticClients.filter(client => client.reportId !== 'sms-only');
    
    // Build a map of client first words to client data
    const clientFirstWordMap = new Map();
    for (const client of regularClients) {
      const firstWord = client.name.split(/[\s_\-:]+/)[0].toLowerCase(); // Extract first word
      if (!clientFirstWordMap.has(firstWord)) {
        clientFirstWordMap.set(firstWord, { id: client.id, name: client.name });
      }
    }

    for (const sms of smsCampaigns) {
      const smsName = sms.name;
      const smsFirstWord = smsName.split(/[\s_\-:]+/)[0].toLowerCase(); // Extract first word from SMS name
      let matched = false;

      // Check if SMS first word matches any client's first word (case-insensitive)
      // Examples: "JAE Distro SMS 1" matches "JAE Automation", "S4_Campaign" matches "S4: Something"
      if (clientFirstWordMap.has(smsFirstWord)) {
        const clientData = clientFirstWordMap.get(smsFirstWord);
        categorized.matched.push({
          ...sms,
          clientId: clientData.id,
          clientName: clientData.name
        });
        matched = true;
        logger.info(`✅ Matched SMS "${smsName}" to client "${clientData.name}" (first word "${smsFirstWord}" matches)`);
      }

      if (!matched) {
        categorized.unmatched.push(sms);
        logger.info(`❌ No client match for SMS "${smsName}" (first word "${smsFirstWord}" has no matching client)`);
      }
    }

    logger.info(`Categorization complete: ${categorized.matched.length} matched, ${categorized.unmatched.length} unmatched`);
    return categorized;
  }

  /**
   * Store SMS campaigns from an SMS client with automatic Mautic client creation
   * Matched SMS go to existing Mautic clients, unmatched SMS auto-create a new Mautic client
   * ✅ TRACKS ORIGIN: Sets originMauticUrl and originUsername to track which credentials fetched each campaign
   * @param {Object} smsClient - SMS Client object (needs name, mauticUrl, username, password)
   * @param {Array} smsCampaigns - Array of SMS campaigns
   * @param {Array} mauticClients - Array of Mautic clients for prefix matching
   * @returns {Promise<Object>} Store results
   */
  async storeSmsWithAutoClient(smsClient, smsCampaigns, mauticClients = []) {
    try {
      logger.info(`Storing ${smsCampaigns.length} SMS campaigns for SMS client ${smsClient.name}`);
      
      const categorized = this.categorizeSms(smsCampaigns, mauticClients);
      let created = 0, updated = 0;
      let autoCreatedClient = null;

      // If there are unmatched SMS, create/find a Mautic client for them
      if (categorized.unmatched.length > 0) {
        logger.info(`Found ${categorized.unmatched.length} unmatched SMS, creating/finding Mautic client...`);
        
        // Check if Mautic client with SMS client name already exists
        autoCreatedClient = await prisma.mauticClient.findFirst({
          where: { 
            name: smsClient.name 
          }
        });

        // Create new Mautic client if it doesn't exist
        if (!autoCreatedClient) {
          autoCreatedClient = await prisma.mauticClient.create({
            data: {
              name: smsClient.name,
              mauticUrl: smsClient.mauticUrl,
              username: smsClient.username,
              password: smsClient.password,
              reportId: 'sms-only', // Default report ID for SMS-only clients
              isActive: true
            }
          });
          logger.info(`✅ Created new Mautic client "${smsClient.name}" (ID: ${autoCreatedClient.id}) for unmatched SMS`);
        } else {
          logger.info(`✅ Using existing Mautic client "${smsClient.name}" (ID: ${autoCreatedClient.id}) for unmatched SMS`);
        }

        // Assign auto-created client to unmatched SMS
        categorized.unmatched = categorized.unmatched.map(sms => ({
          ...sms,
          clientId: autoCreatedClient.id,
          clientName: autoCreatedClient.name
        }));
      }

      // Store ALL SMS as matched (now that unmatched have been assigned to auto-created client)
      const allSms = [...categorized.matched, ...categorized.unmatched];
      
      // ✅ ORIGIN TRACKING: Normalize URL for consistent matching
      const normalizedOriginUrl = smsClient.mauticUrl.trim().replace(/\/$/, '').toLowerCase();
      const originUsername = smsClient.username.trim();
      
      for (const sms of allSms) {
        const result = await prisma.mauticSms.upsert({
          where: { mauticId: sms.id },
          update: {
            name: sms.name,
            category: sms.category,
            sentCount: sms.sentCount || 0,
            clientId: sms.clientId,
            smsClientId: null,
            // ✅ Set origin tracking on update (in case it wasn't set before)
            originMauticUrl: normalizedOriginUrl,
            originUsername: originUsername,
            updatedAt: new Date()
          },
          create: {
            mauticId: sms.id,
            name: sms.name,
            category: sms.category,
            sentCount: sms.sentCount || 0,
            clientId: sms.clientId,
            smsClientId: null,
            // ✅ Set origin tracking on create
            originMauticUrl: normalizedOriginUrl,
            originUsername: originUsername
          }
        });
        
        // Check if it was created or updated by checking if createdAt equals updatedAt
        const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
        if (wasCreated) {
          created++;
        } else {
          updated++;
        }
      }

      logger.info(`SMS storage complete: ${created} created, ${updated} updated`);
      logger.info(`  - Matched to existing Mautic clients: ${categorized.matched.length}`);
      logger.info(`  - Auto-assigned to "${smsClient.name}": ${categorized.unmatched.length}`);
      logger.info(`  - Origin tracked: ${normalizedOriginUrl} / ${originUsername}`);

      return { 
        created, 
        updated, 
        total: created + updated,
        matched: categorized.matched.length,
        unmatched: categorized.unmatched.length,
        autoCreatedClientId: autoCreatedClient?.id
      };
    } catch (error) {
      const errorMsg = error?.message || error?.code || 'SMS storage failed';
      logger.error('Failed to store SMS campaigns with auto-client:', { error: errorMsg.substring(0, 200) });
      throw new Error(errorMsg.substring(0, 200));
    }
  }

  /**
   * Store SMS campaigns from a Mautic client
   * Respects existing categorization from SMS sync to avoid overwriting clientId
   * Also performs smart categorization based on campaign name prefixes
   * ✅ TRACKS ORIGIN: Sets originMauticUrl and originUsername to track which credentials fetched each campaign
   * @param {Int} mauticClientId - Mautic Client ID
   * @param {Array} smsCampaigns - Array of SMS campaigns
   * @param {Array} mauticClients - Optional array of all Mautic clients for categorization
   * @returns {Promise<Object>} Store results
   */
  async storeSmsForMauticClient(mauticClientId, smsCampaigns, mauticClients = []) {
    try {
      logger.info(`Storing ${smsCampaigns.length} SMS campaigns for Mautic client ${mauticClientId}`);
      
      // ✅ Get the Mautic client to extract origin credentials
      const mauticClient = await prisma.mauticClient.findUnique({
        where: { id: mauticClientId },
        select: { mauticUrl: true, username: true }
      });

      if (!mauticClient) {
        throw new Error(`Mautic client ${mauticClientId} not found`);
      }

      // ✅ ORIGIN TRACKING: Normalize URL for consistent matching
      const normalizedOriginUrl = mauticClient.mauticUrl.trim().replace(/\/$/, '').toLowerCase();
      const originUsername = mauticClient.username.trim();
      
      let created = 0, updated = 0;
      let preservedClientAssignments = 0;
      let categorized = 0;

      // Build a map of client first words for categorization (excluding sms-only clients)
      const regularClients = mauticClients.filter(client => !client.reportId || client.reportId !== 'sms-only');
      const clientFirstWordMap = new Map();
      for (const client of regularClients) {
        const firstWord = client.name.split(/[\s_\-:]+/)[0].toLowerCase(); // Extract first word
        if (!clientFirstWordMap.has(firstWord)) {
          clientFirstWordMap.set(firstWord, { id: client.id, name: client.name });
        }
      }

      // Store all SMS, but preserve existing clientId if already assigned
      // Also perform smart categorization based on first-word matching
      for (const sms of smsCampaigns) {
        // Check if SMS already exists in database
        const existing = await prisma.mauticSms.findUnique({
          where: { mauticId: sms.id }
        });

        let updateData = {
          name: sms.name,
          category: sms.category,
          sentCount: sms.sentCount || 0,
          // ✅ Always update origin tracking (in case credentials changed)
          originMauticUrl: normalizedOriginUrl,
          originUsername: originUsername,
          updatedAt: new Date()
        };

        // If SMS already exists with a clientId assignment, preserve it
        // This respects the categorization from the SMS sync
        if (existing && existing.clientId) {
          logger.info(`✅ Preserving existing client assignment for SMS "${sms.name}" (mauticId: ${sms.id}) - already assigned to clientId ${existing.clientId}`);
          preservedClientAssignments++;
          // Update metadata only, preserve clientId
          await prisma.mauticSms.update({
            where: { mauticId: sms.id },
            data: updateData
          });
          updated++;
          continue;
        }

        // For new SMS or SMS without clientId, try to categorize based on first-word matching
        let targetClientId = mauticClientId; // Default to originating client
        const smsFirstWord = sms.name.split(/[\s_\-:]+/)[0].toLowerCase(); // Extract first word from SMS name
        
        // Check if SMS first word matches any known client's first word
        if (clientFirstWordMap.has(smsFirstWord)) {
          const clientData = clientFirstWordMap.get(smsFirstWord);
          targetClientId = clientData.id;
          categorized++;
          logger.info(`✅ Categorized SMS "${sms.name}" to client "${clientData.name}" (first word "${smsFirstWord}" matches)`);
        }

        updateData.clientId = targetClientId;
        updateData.smsClientId = null;

        const result = await prisma.mauticSms.upsert({
          where: { mauticId: sms.id },
          update: updateData,
          create: {
            mauticId: sms.id,
            name: sms.name,
            category: sms.category,
            sentCount: sms.sentCount || 0,
            clientId: targetClientId,
            smsClientId: null,
            // ✅ Set origin tracking on create
            originMauticUrl: normalizedOriginUrl,
            originUsername: originUsername
          }
        });
        
        const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
        if (wasCreated) {
          created++;
          const sourceMsg = targetClientId === mauticClientId ? `originating Mautic client ${mauticClientId}` : `matched client ${targetClientId}`;
          logger.info(`✨ Created new SMS "${sms.name}" (mauticId: ${sms.id}) under ${sourceMsg}`);
        } else {
          updated++;
          logger.info(`🔄 Updated SMS "${sms.name}" (mauticId: ${sms.id})`);
        }
      }

      logger.info(`✅ SMS storage complete for Mautic client ${mauticClientId}: ${created} created, ${updated} updated, ${preservedClientAssignments} preserved from SMS sync, ${categorized} categorized by name`);
      logger.info(`  - Origin tracked: ${normalizedOriginUrl} / ${originUsername}`);

      return { 
        created, 
        updated, 
        total: created + updated,
        preserved: preservedClientAssignments,
        categorized: categorized,
        matchedCount: smsCampaigns.length,
        unmatchedCount: 0
      };
    } catch (error) {
      logger.error('Failed to store SMS campaigns for Mautic client:', { error: error.message });
      throw error;
    }
  }

  /**
   * Store SMS campaigns in database with proper categorization
   * @param {Int} smsClientId - SMS Client ID
   * @param {Array} smsCampaigns - Array of SMS campaigns
   * @param {Array} mauticClients - Array of Mautic clients for prefix matching
   * @returns {Promise<Object>} Store results
   */
  async storeSms(smsClientId, smsCampaigns, mauticClients = []) {
    try {
      logger.info(`Storing ${smsCampaigns.length} SMS campaigns for SMS client ${smsClientId}`);
      
      const categorized = this.categorizeSms(smsCampaigns, mauticClients);
      let created = 0, updated = 0;

      // Store matched SMS (linked to Mautic clients)
      for (const sms of categorized.matched) {
        const result = await prisma.mauticSms.upsert({
          where: { mauticId: sms.id },
          update: {
            name: sms.name,
            category: sms.category,
            sentCount: sms.sentCount || 0,
            clientId: sms.clientId,
            smsClientId: null,
            updatedAt: new Date()
          },
          create: {
            mauticId: sms.id,
            name: sms.name,
            category: sms.category,
            sentCount: sms.sentCount || 0,
            clientId: sms.clientId,
            smsClientId: null
          }
        });
        
        const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
        if (wasCreated) {
          created++;
        } else {
          updated++;
        }
      }

      // Store unmatched SMS (linked to SMS client)
      for (const sms of categorized.unmatched) {
        // Check if already exists with a clientId (don't overwrite)
        const existing = await prisma.mauticSms.findUnique({
          where: { mauticId: sms.id }
        });

        if (existing && existing.clientId) {
          // Skip if already assigned to a Mautic client
          continue;
        }

        const result = await prisma.mauticSms.upsert({
          where: { mauticId: sms.id },
          update: {
            name: sms.name,
            category: sms.category,
            sentCount: sms.sentCount || 0,
            smsClientId,
            updatedAt: new Date()
          },
          create: {
            mauticId: sms.id,
            name: sms.name,
            category: sms.category,
            sentCount: sms.sentCount || 0,
            clientId: null,
            smsClientId
          }
        });
        
        const wasCreated = result.createdAt.getTime() === result.updatedAt.getTime();
        if (wasCreated) {
          created++;
        } else {
          updated++;
        }
      }

      logger.info(`SMS storage complete: ${created} created, ${updated} updated`);
      logger.info(`  - Matched to Mautic clients: ${categorized.matched.length}`);
      logger.info(`  - Unmatched (SMS client): ${categorized.unmatched.length}`);

      return { 
        created, 
        updated, 
        total: created + updated,
        matched: categorized.matched.length,
        unmatched: categorized.unmatched.length
      };
    } catch (error) {
      logger.error('Failed to store SMS campaigns:', { error: error.message });
      throw error;
    }
  }

  /**
   * Store SMS statistics
   * @param {Int} smsId - Local SMS ID (from MauticSms table)
   * @param {Int} mauticSmsId - Original Mautic SMS campaign ID
   * @param {Array} stats - Array of SMS statistics
   * @returns {Promise<Object>} Store results
   */
  async storeSmsStats(smsId, mauticSmsId, stats) {
    try {
      logger.info(`📥 Storing ${stats.length} SMS stats for SMS ${smsId} (Mautic ID: ${mauticSmsId})`);
      
      if (!Array.isArray(stats) || stats.length === 0) {
        logger.warn(`⚠️  No stats to store (received ${typeof stats})`);
        return { created: 0, skipped: 0, total: 0 };
      }

      let created = 0, skipped = 0, errors = 0;

      // Log sample stat for debugging
      logger.info(`   Sample stat: ${JSON.stringify(stats[0])}`);

      for (const stat of stats) {
        try {
          // Handle different field name formats from Mautic API
          // Some APIs use lead_id, others use leadId, etc.
          const leadId = stat.lead_id || stat.leadId || stat.contact_id || stat.contactId;
          const dateSent = stat.date_sent || stat.dateSent || stat.sent_date || stat.sentDate;
          const isFailed = stat.is_failed || stat.isFailed || stat.failed || '0';

          if (!leadId) {
            logger.warn(`   ⚠️  Skipping stat with no lead ID: ${JSON.stringify(stat)}`);
            errors++;
            continue;
          }

          // Check if already exists
          const existing = await prisma.mauticSmsStat.findUnique({
            where: {
              mauticSmsId_leadId: {
                mauticSmsId: mauticSmsId,
                leadId: parseInt(leadId)
              }
            }
          });

          if (!existing) {
            await prisma.mauticSmsStat.create({
              data: {
                smsId,
                mauticSmsId,
                leadId: parseInt(leadId),
                dateSent: dateSent ? new Date(dateSent) : null,
                isFailed: String(isFailed) // Ensure it's a string
              }
            });
            created++;
            
            // Log first few creates for verification
            if (created <= 3) {
              logger.info(`   ✅ Created stat: leadId=${leadId}, dateSent=${dateSent}, isFailed=${isFailed}`);
            }
          } else {
            skipped++;
          }
        } catch (statError) {
          logger.error(`   ❌ Error storing individual stat:`, {
            error: statError.message,
            stat: JSON.stringify(stat)
          });
          errors++;
        }
      }

      logger.info(`✅ SMS stats stored: ${created} created, ${skipped} skipped, ${errors} errors`);
      return { created, skipped, errors, total: created + skipped };
    } catch (error) {
      logger.error('❌ Failed to store SMS stats:', { error: error.message, stack: error.stack });
      throw error;
    }
  }

  /**
   * Get SMS campaigns for a specific client (Mautic or SMS client)
   * @param {Int} clientId - Client ID
   * @param {String} clientType - 'mautic' or 'sms'
   * @returns {Promise<Array>} SMS campaigns
   */
  async getClientSmsCampaigns(clientId, clientType = 'mautic') {
    try {
      const where = clientType === 'mautic' 
        ? { clientId } 
        : { smsClientId: clientId };

      const campaigns = await prisma.mauticSms.findMany({
        where,
        orderBy: { name: 'asc' }
      });

      return campaigns;
    } catch (error) {
      logger.error('Failed to get client SMS campaigns:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get SMS campaign statistics with pagination
   * @param {Int} smsId - Local SMS ID
   * @param {Object} options - Pagination options
   * @returns {Promise<Object>} SMS statistics
   */
  async getCampaignStats(smsId, options = {}) {
    try {
      const { page = 1, limit = 100 } = options;
      const skip = (page - 1) * limit;

      const [stats, totalRecords] = await Promise.all([
        prisma.mauticSmsStat.findMany({
          where: { smsId },
          orderBy: { dateSent: 'desc' },
          skip,
          take: limit
        }),
        prisma.mauticSmsStat.count({
          where: { smsId }
        })
      ]);

      const totalSuccessful = await prisma.mauticSmsStat.count({
        where: { smsId, isFailed: '0' }
      });

      const totalFailed = await prisma.mauticSmsStat.count({
        where: { smsId, isFailed: '1' }
      });

      return {
        stats,
        totalRecords,
        totalSuccessful,
        totalFailed,
        page,
        limit,
        totalPages: Math.ceil(totalRecords / limit)
      };
    } catch (error) {
      logger.error('Failed to get campaign stats:', { error: error.message });
      throw error;
    }
  }

  /**
   * Reassign orphaned SMS to matching Mautic clients
   * This runs after a new Mautic client is added
   * @param {Int} mauticClientId - Newly added Mautic client ID
   * @returns {Promise<Int>} Number of SMS reassigned
   */
  async reassignOrphanedSms(mauticClientId) {
    try {
      const mauticClient = await prisma.mauticClient.findUnique({
        where: { id: mauticClientId }
      });

      if (!mauticClient) {
        throw new Error(`Mautic client ${mauticClientId} not found`);
      }

      const clientNameLower = mauticClient.name.toLowerCase();

      // Find orphaned SMS that match this client's prefix
      const orphanedSms = await prisma.mauticSms.findMany({
        where: {
          clientId: null,
          smsClientId: { not: null }
        },
        select: { id: true, name: true }
      });

      // Filter matching SMS in memory (faster than individual updates)
      const matchingIds = orphanedSms
        .filter(sms => sms.name.toLowerCase().startsWith(clientNameLower))
        .map(sms => sms.id);

      if (matchingIds.length === 0) {
        return 0;
      }

      // Bulk update all matching SMS at once
      const result = await prisma.mauticSms.updateMany({
        where: { id: { in: matchingIds } },
        data: {
          clientId: mauticClientId,
          smsClientId: null,
          updatedAt: new Date()
        }
      });

      logger.info(`Reassigned ${result.count} SMS campaigns to Mautic client "${mauticClient.name}"`);
      return result.count;
    } catch (error) {
      logger.error('Failed to reassign orphaned SMS:', { error: error.message });
      throw error;
    }
  }

  /**
   * Get all SMS campaigns (for Services page)
   * @param {Array} accessibleClientIds - Optional array of accessible Mautic client IDs
   * @returns {Promise<Array>} All SMS campaigns
   */
  async getAllSmsCampaigns(accessibleClientIds = null) {
    try {
      const where = {};
      
      if (accessibleClientIds && accessibleClientIds.length > 0) {
        where.OR = [
          { clientId: { in: accessibleClientIds } },
          { smsClientId: { not: null } } // Include SMS client campaigns
        ];
      }

      const campaigns = await prisma.mauticSms.findMany({
        where,
        include: {
          client: {
            select: { id: true, name: true }
          },
          smsClient: {
            select: { id: true, name: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      return campaigns.map(c => ({
        id: c.id,
        mauticId: c.mauticId,
        name: c.name,
        category: c.category,
        sentCount: c.sentCount,
        clientId: c.clientId,
        clientName: c.client?.name || c.smsClient?.name || 'Unknown',
        clientType: c.clientId ? 'mautic' : 'sms'
      }));
    } catch (error) {
      logger.error('Failed to get all SMS campaigns:', { error: error.message });
      throw error;
    }
  }
}

export default new SmsService();
