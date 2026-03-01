import prisma from '../../../../prisma/client.js';
import logger from '../../../../utils/logger.js';

/**
 * Service for handling SMS message and reply data
 */
class SmsMessageService {
  /**
   * Categorize a reply message based on keywords
   * @param {string} replyText - The reply message text
   * @returns {string} - "Stop", "Unsubscribe", or "Other"
   */
  categorizeReply(replyText) {
    if (!replyText) return 'Other';
    
    const text = replyText.toLowerCase().trim();
    
    // Check for Stop keywords
    const stopKeywords = ['stop', 'unsubscribe'];
    if (stopKeywords.some(keyword => text.includes(keyword))) {
      // More specific check for unsubscribe
      if (text.includes('unsubscribe') || text.includes('unsub')) {
        return 'Unsubscribe';
      }
      return 'Stop';
    }
    
    return 'Other';
  }

  /**
   * Extract message text from SMS event details
   * @param {Object} event - SMS event from Mautic activity
   * @returns {string|null} - Message text or null
   */
  extractMessageText(event) {
    try {
      if (event.event === 'sms.sent') {
        return event.details?.stat?.message || event.details?.message || null;
      }
      if (event.event === 'sms_reply') {
        return event.details?.message || event.details?.reply || null;
      }
      return null;
    } catch (error) {
      logger.warn('Failed to extract message text:', error.message);
      return null;
    }
  }

  /**
   * Fetch contact activity and extract SMS messages and replies
   * @param {Object} apiClient - Mautic API client
   * @param {number} leadId - Lead ID
   * @param {number} smsId - SMS campaign ID (optional filter)
   * @returns {Promise<Object>} - { messageText, replyText, replyCategory, repliedAt }
   */
  async fetchContactSmsActivity(apiClient, leadId, smsId = null) {
    try {
      const response = await apiClient.get(`/contacts/${leadId}/activity`, {
        params: { limit: 1000 }
      });

      const events = response.data?.events || [];
      
      // Filter SMS-related events
      const smsEvents = events.filter(e => 
        e.event === 'sms.sent' || e.event === 'sms_reply'
      );

      logger.info(`   Lead ${leadId}: Found ${smsEvents.length} SMS events (${events.length} total events)`);

      // Find sent message - filter by smsId if provided
      let sentEvent = null;
      if (smsId) {
        sentEvent = smsEvents.find(e => {
          if (e.event === 'sms.sent') {
            const eventSmsId = e.details?.stat?.sms_id || e.details?.sms_id;
            return eventSmsId && parseInt(eventSmsId) === parseInt(smsId);
          }
          return false;
        });
      } else {
        sentEvent = smsEvents.find(e => e.event === 'sms.sent');
      }
      
      const messageText = sentEvent ? this.extractMessageText(sentEvent) : null;

      // Find ALL reply events (don't filter by smsId - replies don't have sms_id field)
      const replyEvents = smsEvents.filter(e => e.event === 'sms_reply');
      logger.info(`   Lead ${leadId}: Found ${replyEvents.length} reply events (all replies, not filtered by campaign)`);
      
      const latestReply = replyEvents.length > 0 
        ? replyEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
        : null;

      const replyText = latestReply ? this.extractMessageText(latestReply) : null;
      const replyCategory = replyText ? this.categorizeReply(replyText) : null;
      const repliedAt = latestReply ? new Date(latestReply.timestamp) : null;

      if (replyText) {
        logger.info(`   Lead ${leadId}: Extracted reply: "${replyText.substring(0, 50)}" (category: ${replyCategory})`);
      } else if (replyEvents.length > 0) {
        logger.warn(`   Lead ${leadId}: Has ${replyEvents.length} reply events but failed to extract text`);
        logger.warn(`   Reply event details: ${JSON.stringify(latestReply?.details)}`);
      }

      return {
        messageText,
        replyText,
        replyCategory,
        repliedAt
      };
    } catch (error) {
      logger.error(`Failed to fetch activity for lead ${leadId}:`, error.message);
      return {
        messageText: null,
        replyText: null,
        replyCategory: null,
        repliedAt: null
      };
    }
  }

  /**
   * Update SMS stats with message and reply data
   * @param {number} smsId - Local SMS ID
   * @param {number} mauticSmsId - Mautic SMS campaign ID
   * @param {number} leadId - Lead ID
   * @param {Object} data - { messageText, replyText, replyCategory, repliedAt }
   * @returns {Promise<Object>} - Updated record
   */
  async updateSmsStatWithMessages(smsId, mauticSmsId, leadId, data) {
    try {
      return await prisma.mauticSmsStat.upsert({
        where: {
          mauticSmsId_leadId: {
            mauticSmsId: parseInt(mauticSmsId),
            leadId: parseInt(leadId)
          }
        },
        update: {
          messageText: data.messageText,
          replyText: data.replyText,
          replyCategory: data.replyCategory,
          repliedAt: data.repliedAt
        },
        create: {
          smsId: parseInt(smsId),
          mauticSmsId: parseInt(mauticSmsId),
          leadId: parseInt(leadId),
          messageText: data.messageText,
          replyText: data.replyText,
          replyCategory: data.replyCategory,
          repliedAt: data.repliedAt
        }
      });
    } catch (error) {
      logger.error(`Failed to update SMS stat for lead ${leadId}:`, error.message);
      throw error;
    }
  }

  /**
   * Batch fetch and update messages for multiple leads
   * @param {Object} client - Mautic client
   * @param {number} smsId - Local SMS ID
   * @param {number} mauticSmsId - Mautic SMS campaign ID
   * @param {Array<number>} leadIds - Array of lead IDs
   * @param {boolean} returnData - If true, return data map instead of updating DB
   * @returns {Promise<Object>} - { updated, failed, messageData? }
   */
  async batchFetchAndUpdateMessages(client, smsId, mauticSmsId, leadIds, returnData = false) {
    const { default: mauticAPIService } = await import('./mauticAPI.js');
    
    let updated = 0;
    let failed = 0;
    const messageDataMap = new Map();

    logger.info(`📨 Fetching messages for ${leadIds.length} leads (sequential for accuracy)...`);

    const apiClient = mauticAPIService.createClient(client);

    // Process sequentially to avoid data loss
    for (let i = 0; i < leadIds.length; i++) {
      const leadId = leadIds[i];
      try {
        const messageData = await this.fetchContactSmsActivity(apiClient, leadId, mauticSmsId);
        
        // Log detailed info for debugging
        if (messageData.replyText) {
          logger.info(`   Lead ${leadId}: Has reply - "${messageData.replyText.substring(0, 50)}"`);
        }
        
        if (returnData) {
          // Store in map for batch processing
          messageDataMap.set(parseInt(leadId), messageData);
        } else {
          // Update database immediately
          await this.updateSmsStatWithMessages(smsId, mauticSmsId, leadId, messageData);
        }
        
        updated++;
        
        if (updated % 10 === 0) {
          logger.info(`   Progress: ${updated}/${leadIds.length} leads processed`);
        }
      } catch (error) {
        logger.error(`   Failed to process lead ${leadId}:`, error.message);
        logger.error(`   Error stack: ${error.stack}`);
        failed++;
      }
    }

    logger.info(`✅ Batch complete: ${updated} updated, ${failed} failed`);

    return returnData 
      ? { updated, failed, messageData: messageDataMap }
      : { updated, failed };
  }
}

export default new SmsMessageService();
