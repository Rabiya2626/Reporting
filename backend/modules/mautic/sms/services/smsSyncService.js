import prisma from '../../../../prisma/client.js';
import logger from '../../../../utils/logger.js';
import axios from 'axios';
import https from 'https';

class SmsSyncService {
  /**
   * Create authenticated HTTP client for Mautic API
   * Uses efficient connection pooling & parallel requests like campaignWise.js
   */
  createHttpClient(baseUrl, username, password, maxConcurrent = 50) {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    const httpsAgent = new https.Agent({ 
      keepAlive: true, 
      maxSockets: maxConcurrent 
    });
    
    return axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      timeout: 120000,
      httpsAgent
    });
  }

  /**
   * High-speed parallel fetcher (based on campaignWise.js pattern)
   * Fetches all pages of data with configurable concurrent requests
   */
  async fetchAllPages(apiClient, endpoint, dataKey, pageSize = 500, maxConcurrent = 50) {
    try {
      logger.info(`📡 Fetching all data from ${endpoint}...`);
      
      // Get total count with first request
      const separator = endpoint.includes('?') ? '&' : '?';
      const firstUrl = `${endpoint}${separator}limit=1`;
      const { data: initial } = await apiClient.get(firstUrl);
      const total = initial.total || 0;

      if (total === 0) {
        logger.info(`   ✅ No records found`);
        return [];
      }

      const totalPages = Math.ceil(total / pageSize);
      logger.info(`   📊 Total: ${total} records, ${totalPages} pages (${pageSize} per page)`);

      // Parallel fetch all pages
      const results = new Array(totalPages);
      let activeRequests = 0;
      let finishedPages = 0;
      let currentPageIndex = 0;

      return new Promise((resolve, reject) => {
        const scheduleNextRequest = () => {
          while (activeRequests < maxConcurrent && currentPageIndex < totalPages) {
            const pageIndex = currentPageIndex++;
            const start = pageIndex * pageSize;
            activeRequests++;

            const url = `${endpoint}${separator}start=${start}&limit=${pageSize}`;
            
            apiClient.get(url)
              .then(res => {
                results[pageIndex] = res.data[dataKey] || {};
                activeRequests--;
                finishedPages++;
                
                // Show progress
                const progress = ((finishedPages / totalPages) * 100).toFixed(1);
                process.stdout.write(`\r   ⚡ Progress: ${progress}% (${finishedPages}/${totalPages})`);
                
                if (finishedPages === totalPages) {
                  console.log();
                  resolve(results);
                } else {
                  scheduleNextRequest();
                }
              })
              .catch(err => {
                logger.error(`   ❌ Failed to fetch page ${pageIndex}: ${err.message}`);
                activeRequests--;
                // Continue with remaining pages
                scheduleNextRequest();
              });
          }
        };

        scheduleNextRequest();
      });

    } catch (error) {
      logger.error('❌ Failed to fetch all pages:', error.message);
      throw error;
    }
  }

  /**
   * 1️⃣ FETCH ALL CONTACTS WITH MOBILE NUMBERS (BULK)
   * Uses: GET /api/contacts?limit=500&start=N&search=!is:anonymous
   * Parallel fetches all pages efficiently
   */
  async fetchContactsWithMobile(apiClient, pageSize = 500, maxConcurrent = 50) {
    try {
      logger.info(`📞 Fetching all contacts with mobile numbers (bulk - parallel)...`);
      
      // Fetch all contact pages in parallel
      const endpoint = '/contacts?search=!is:anonymous';
      const allContactPages = await this.fetchAllPages(apiClient, endpoint, 'contacts', pageSize, maxConcurrent);

      // Extract and filter contacts with mobile numbers
      const allContacts = [];
      let totalProcessed = 0;

      for (const contactsObj of allContactPages) {
        if (!contactsObj || typeof contactsObj !== 'object') continue;

        for (const [contactId, contact] of Object.entries(contactsObj)) {
          totalProcessed++;

          // Extract mobile number from fields.all or fields.core
          let mobile = '';
          const allMobile = contact.fields?.all?.mobile;
          const coreMobile = contact.fields?.core?.mobile;

          if (allMobile && typeof allMobile === 'object' && 'value' in allMobile) {
            mobile = allMobile.value || '';
          } else if (coreMobile && typeof coreMobile === 'object' && 'value' in coreMobile) {
            mobile = coreMobile.value || '';
          } else if (typeof allMobile === 'string') {
            mobile = allMobile;
          } else if (typeof coreMobile === 'string') {
            mobile = coreMobile;
          }

          // Only include contacts with valid mobile number
          if (mobile && mobile.trim()) {
            allContacts.push({
              leadId: parseInt(contactId),
              mobile: mobile.trim(),
              firstName: contact.fields?.all?.firstname?.value || contact.fields?.core?.firstname?.value || '',
              lastName: contact.fields?.all?.lastname?.value || contact.fields?.core?.lastname?.value || '',
              email: contact.fields?.all?.email?.value || contact.fields?.core?.email?.value || '',
            });
          }
        }
      }

      logger.info(`✅ Processed ${totalProcessed} total contacts, ${allContacts.length} with mobile numbers`);
      return allContacts;

    } catch (error) {
      logger.error('❌ Failed to fetch contacts:', error.message);
      throw error;
    }
  }

  /**
   * 2️⃣ FETCH ALL SMS REPLIES IN BULK (PARALLEL)
   * Uses: GET /api/stats/lead_event_log with type=sms_reply filter
   * Alternative: Use lead contact activity if bulk endpoint unavailable
   * Bulk fetches all reply events efficiently
   */
  async fetchSmsReplies(apiClient, pageSize = 500, maxConcurrent = 50) {
    try {
      logger.info(`💬 Fetching all SMS replies in bulk (parallel)...`);
      
      // Try primary endpoint: lead event log filtered for SMS replies
      // Mautic filters: type=sms_reply or action=reply
      const endpoint = '/stats/lead_event_log?where[0][col]=type&where[0][expr]=eq&where[0][val]=sms_reply';
      
      try {
        const allReplyPages = await this.fetchAllPages(apiClient, endpoint, 'stats', pageSize, maxConcurrent);

        // Extract and format replies
        const allReplies = [];
        let totalProcessed = 0;

        for (const statsObj of allReplyPages) {
          if (!statsObj || typeof statsObj !== 'object') continue;

          for (const [recordId, stat] of Object.entries(statsObj)) {
            totalProcessed++;

            const leadId = parseInt(stat.lead_id || stat.leadId || 0);
            
            // Extract reply message from properties or description
            let replyMessage = stat.description || stat.properties || 'STOP';
            if (stat.properties && typeof stat.properties === 'string') {
              try {
                const parsed = JSON.parse(stat.properties);
                replyMessage = parsed.message || parsed.body || parsed.text || stat.properties;
              } catch {
                // Keep original properties string
              }
            }

            if (leadId > 0) {
              allReplies.push({
                leadId,
                reply: String(replyMessage).trim().substring(0, 255),
                dateAdded: stat.date_added || stat.dateAdded || new Date().toISOString(),
              });
            }
          }
        }

        logger.info(`✅ Processed ${totalProcessed} total events, ${allReplies.length} SMS replies extracted`);
        return allReplies;
      } catch (primaryError) {
        logger.warn(`   ⚠️ Primary endpoint failed, trying fallback...`);
        
        // Fallback: Try alternate filter format
        const fallbackEndpoint = '/stats/lead_event_log';
        const allReplyPages = await this.fetchAllPages(apiClient, fallbackEndpoint, 'stats', pageSize, maxConcurrent);

        const allReplies = [];
        let matchedCount = 0;
        let totalProcessed = 0;

        for (const statsObj of allReplyPages) {
          if (!statsObj || typeof statsObj !== 'object') continue;

          for (const [recordId, stat] of Object.entries(statsObj)) {
            totalProcessed++;
            
            // Filter for SMS reply events
            const type = stat.type || stat.action || '';
            if (!type.toLowerCase().includes('reply') && !type.toLowerCase().includes('sms')) continue;

            const leadId = parseInt(stat.lead_id || stat.leadId || 0);
            if (leadId <= 0) continue;

            let replyMessage = stat.description || stat.properties || 'STOP';
            allReplies.push({
              leadId,
              reply: String(replyMessage).trim().substring(0, 255),
              dateAdded: stat.date_added || stat.dateAdded || new Date().toISOString(),
            });
            matchedCount++;
          }
        }

        logger.info(`✅ Fallback processed ${totalProcessed} total events, ${matchedCount} SMS replies extracted`);
        return allReplies;
      }

    } catch (error) {
      logger.error('❌ Failed to fetch SMS replies:', error.message);
      logger.warn(`   ℹ️ Continuing without replies - they can be fetched via enrichment service`);
      return []; // Return empty array instead of throwing, allow sync to continue
    }
  }

  /**
   * 3️⃣ MAP REPLIES TO CONTACTS
   * Cross-reference lead_id to build complete SMS stats records with mobile numbers
   */
  mapRepliesToContacts(contacts, replies) {
    try {
      logger.info(`🔗 Mapping ${replies.length} replies to ${contacts.length} contacts...`);

      // Build quick lookup map for contacts by leadId
      const contactMap = new Map();
      for (const contact of contacts) {
        contactMap.set(contact.leadId, contact);
      }

      // Match each reply to contact
      const mappedStats = [];
      let matchedCount = 0;
      let unmatchedCount = 0;

      for (const reply of replies) {
        const contact = contactMap.get(reply.leadId);
        
        if (contact) {
          mappedStats.push({
            leadId: reply.leadId,
            mobile: contact.mobile,
            replyText: reply.reply,
            repliedAt: reply.dateAdded,
            replyCategory: reply.reply && reply.reply.toUpperCase().includes('STOP') ? 'Stop' : 'Other',
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
          });
          matchedCount++;
        } else {
          unmatchedCount++;
          if (unmatchedCount <= 5) {
            logger.debug(`   ⚠️  Reply from lead_id ${reply.leadId} has no matching contact with mobile`);
          }
        }
      }

      logger.info(`✅ Mapping complete: ${matchedCount} matched, ${unmatchedCount} unmatched`);
      if (unmatchedCount > 5) {
        logger.info(`   (showing first 5 unmatched, ${unmatchedCount - 5} more not shown)`);
      }
      return mappedStats;

    } catch (error) {
      logger.error('❌ Failed to map replies to contacts:', error.message);
      throw error;
    }
  }

  /**
   * CLEAR EXISTING SMS STATS FOR CAMPAIGN
   * Use this to start fresh before syncing
   */
  async clearCampaignStats(localSmsId) {
    try {
      logger.info(`🗑️  Clearing existing stats for campaign ${localSmsId}...`);
      const result = await prisma.mauticSmsStat.deleteMany({
        where: { smsId: localSmsId }
      });
      logger.info(`   ✅ Cleared ${result.count} old stats`);
      return result.count;
    } catch (error) {
      logger.error('❌ Failed to clear stats:', error.message);
      throw error;
    }
  }

  /**
   * 4️⃣ STORE SMS STATS IN DATABASE
   * Bulk insert mapped SMS stats into mautic_sms_stats table
   * Stores: leadId, mobile, reply, dateDetected, contact metadata
   */
  async storeSmsStats(localSmsId, mauticSmsId, statsData) {
    try {
      logger.info(`📝 Storing ${statsData.length} SMS stats for campaign ${mauticSmsId}...`);

      if (!statsData || statsData.length === 0) {
        logger.warn(`⚠️  No stats to store`);
        return { created: 0, total: 0 };
      }

      // 1️⃣ Find the SMS record
      const smsRecord = await prisma.mauticSms.findUnique({
        where: { id: localSmsId }
      });

      if (!smsRecord) {
        throw new Error(`SMS campaign not found: ${localSmsId}`);
      }

      // 2️⃣ Prepare data for bulk insert
      const recordsToInsert = statsData.map(stat => ({
        smsId: localSmsId,
        mauticSmsId: mauticSmsId,
        leadId: stat.leadId || 0,
        mobile: stat.mobile || null,
        replyText: stat.replyText || null,
        repliedAt: stat.repliedAt ? new Date(stat.repliedAt) : null,
        replyCategory: stat.replyCategory || null,
        isSynced: true,
        lastSyncedAt: new Date(),
      }));

      // 3️⃣ Bulk insert all stats
      logger.info(`   📥 Bulk inserting ${recordsToInsert.length} records...`);
      const result = await prisma.mauticSmsStat.createMany({
        data: recordsToInsert,
        skipDuplicates: false
      });

      logger.info(`   ✅ Inserted ${result.count} SMS stats`);

      return {
        created: result.count,
        total: result.count
      };

    } catch (error) {
      logger.error('❌ Failed to store SMS stats:', error.message);
      throw error;
    }
  }

  /**
   * 🎯 MAIN SYNC WORKFLOW
   * Orchestrates: Clear → Fetch contacts → Fetch replies → Map → Store
   * Uses efficient parallel fetching for bulk data transfer
   */
  async syncSmsStats(client, localSmsId, mauticSmsId, clearExisting = true) {
    try {
      logger.info(`\n🔄 STARTING SMS STATS SYNC for campaign ${mauticSmsId}`);
      logger.info(`   Client: ${client.name}`);
      logger.info(`   Local SMS ID: ${localSmsId}`);
      logger.info(`   Clear existing: ${clearExisting}`);

      // Create API client with connection pooling
      const apiClient = this.createHttpClient(client.mauticUrl, client.username, client.password);

      // 0️⃣ Clear existing stats if requested
      let clearedCount = 0;
      if (clearExisting) {
        clearedCount = await this.clearCampaignStats(localSmsId);
      }

      // 1️⃣ Fetch contacts with mobile (parallel)
      const contacts = await this.fetchContactsWithMobile(apiClient);
      
      if (contacts.length === 0) {
        logger.warn(`⚠️  No contacts with mobile numbers found`);
        return { 
          created: 0, 
          total: 0, 
          cleared: clearedCount,
          message: 'No contacts found' 
        };
      }

      // 2️⃣ Fetch SMS replies (parallel)
      const replies = await this.fetchSmsReplies(apiClient);

      if (replies.length === 0) {
        logger.info(`ℹ️  No SMS replies found`);
        return { 
          created: 0, 
          total: 0,
          cleared: clearedCount,
          message: 'No replies found' 
        };
      }

      // 3️⃣ Map replies to contacts
      const mappedStats = this.mapRepliesToContacts(contacts, replies);

      // 4️⃣ Store in database
      const storeResult = await this.storeSmsStats(localSmsId, mauticSmsId, mappedStats);

      logger.info(`\n✅ SMS STATS SYNC COMPLETE`);
      logger.info(`   Cleared: ${clearedCount} old stats`);
      logger.info(`   Contacts fetched: ${contacts.length}`);
      logger.info(`   Replies fetched: ${replies.length}`);
      logger.info(`   Stats created: ${storeResult.created}`);

      return {
        created: storeResult.created,
        total: storeResult.total,
        cleared: clearedCount,
        contactsCount: contacts.length,
        repliesCount: replies.length,
        message: `Cleared ${clearedCount} old + Synced ${storeResult.created} new SMS stats`
      };

    } catch (error) {
      logger.error(`\n❌ SMS STATS SYNC FAILED:`, error.message);
      throw error;
    }
  }
}

export default new SmsSyncService();
