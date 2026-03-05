/**
 * SMS Campaign Grouping Service
 * Implements intelligent matching logic to group SMS campaigns under Mautic clients
 * Matching priority: Full name > Partial word > Acronym
 */

import logger from '../../../../utils/logger.js';

class CampaignGroupingService {
  /**
   * Normalize a string for comparison - more aggressive normalization
   */
  normalize(str) {
    return (str || '')
      .toLowerCase()
      .trim()
      // Remove special characters and punctuation
      .replace(/[^\w\s]/g, '')
      // Normalize spaces (multiple spaces to single)
      .replace(/\s+/g, ' ');
  }

  /**
   * Get a version without any spaces for fuzzy matching
   */
  normalizeNoSpaces(str) {
    return (str || '')
      .toLowerCase()
      .replace(/[^\w]/g, ''); // Remove everything except word characters
  }

  /**
   * Get words from a name
   */
  getWords(name) {
    return this.normalize(name)
      .split(' ')
      .filter(Boolean);
  }

  /**
   * Get abbreviation from a name (first letter of each word)
   * Prevents bugs like "NUS" → "n"
   */
  getAbbreviation(name) {
    const words = this.getWords(name);
    // If single word, return the word itself (not just first letter)
    if (words.length <= 1) return this.normalize(name);
    // Multiple words: get first letter of each
    return words.map(w => w[0]).join('');
  }

  /**
   * Check if a Mautic client name matches an SMS campaign name
   * Priority: Full match > Full no-space match > Primary keyword > Substring > Acronym
   */
  isClientMatch(mauticName, smsName) {
    const mNorm = this.normalize(mauticName);
    const sNorm = this.normalize(smsName);
    const mNoSpace = this.normalizeNoSpaces(mauticName);
    const sNoSpace = this.normalizeNoSpaces(smsName);

    // 🥇 PRIORITY 1: Exact full name match
    if (mNorm === sNorm || mNoSpace === sNoSpace) {
      return { match: true, priority: 1, reason: 'exact_match' };
    }

    const mWords = this.getWords(mauticName);
    const sWords = this.getWords(smsName);

    // 🥈 PRIORITY 2: Full client name appears in campaign (handles "MoneyMailer" vs "Money Mailer")
    if (sNoSpace.includes(mNoSpace) || mNoSpace.includes(sNoSpace)) {
      return { match: true, priority: 2, reason: 'no_space_match' };
    }

    // 🥉 PRIORITY 3: PRIMARY keyword match (first word)
    const primaryKeyword = mWords[0];
    if (primaryKeyword && primaryKeyword.length > 2 && sWords.includes(primaryKeyword)) {
      return { match: true, priority: 3, reason: 'primary_keyword_match' };
    }

    // 🏅 PRIORITY 4: ANY significant keyword match (words > 3 chars)
    const significantMWords = mWords.filter(w => w.length > 3);
    const significantSWords = sWords.filter(w => w.length > 3);
    
    for (const mWord of significantMWords) {
      if (significantSWords.includes(mWord)) {
        return { match: true, priority: 4, reason: 'significant_keyword_match' };
      }
    }

    // � PRIORITY 5: One side appears as whole word on other side
    if (sWords.includes(mNorm) || mWords.includes(sNorm)) {
      return { match: true, priority: 5, reason: 'word_match' };
    }

    // �️ PRIORITY 6: Substring match (for longer names)
    if (mNorm.length > 3 && sNorm.includes(mNorm)) {
      return { match: true, priority: 6, reason: 'substring_match' };
    }
    if (sNorm.length > 3 && mNorm.includes(sNorm)) {
      return { match: true, priority: 6, reason: 'substring_match' };
    }

    // 🎯 PRIORITY 7: Acronym match - Check if campaign STARTS with client abbreviation
    const mAbbr = this.getAbbreviation(mauticName);
    const sAbbr = this.getAbbreviation(smsName);
    
    // Check if first word of campaign matches client abbreviation (e.g., "CP 2025..." matches "Century Pharmaceuticals")
    if (sWords.length > 0 && sWords[0] === mAbbr.toLowerCase()) {
      return { match: true, priority: 7, reason: 'acronym_at_start' };
    }
    
    // Also check if campaign starts with the abbreviation (no spaces)
    if (sNoSpace.startsWith(mAbbr.toLowerCase()) && sNoSpace.length > mAbbr.length) {
      return { match: true, priority: 7, reason: 'acronym_prefix' };
    }
    
    // Legacy checks for full acronym match
    if (mWords.length === 1 && mNorm === sAbbr) {
      return { match: true, priority: 7, reason: 'acronym_match' };
    }
    if (sWords.length === 1 && sNorm === mAbbr) {
      return { match: true, priority: 7, reason: 'acronym_match' };
    }

    return { match: false, priority: null, reason: null };
  }

  /**
   * Group SMS campaigns under Mautic clients
   * @param {Array} mauticClients - Array of Mautic clients with {id, name, ...}
   * @param {Array} smsCampaigns - Array of SMS campaigns with {id, mauticId, name, ...}
   * @returns {Map} Map of mauticClientId -> Array of SMS campaign IDs
   */
  groupCampaigns(mauticClients, smsCampaigns) {
    logger.info(`🔄 Grouping ${smsCampaigns.length} SMS campaigns under ${mauticClients.length} Mautic clients...`);

    const groupMap = new Map();
    const assignedCampaigns = new Set();
    const matchDetails = [];

    // Initialize map for each client
    mauticClients.forEach(client => {
      groupMap.set(client.id, []);
    });

    // Try to match each SMS campaign to a Mautic client
    smsCampaigns.forEach(campaign => {
      let bestMatch = null;
      let bestMatchClient = null;

      // Check against each Mautic client
      mauticClients.forEach(client => {
        // Try matching SMS campaign name with Mautic client name
        const result = this.isClientMatch(client.name, campaign.name);

        if (result.match) {
          // Keep track of best match (lowest priority number = highest priority)
          if (!bestMatch || result.priority < bestMatch.priority) {
            bestMatch = result;
            bestMatchClient = client;
          }
        }
      });

      // Assign campaign to best matching client
      if (bestMatchClient && !assignedCampaigns.has(campaign.id)) {
        groupMap.get(bestMatchClient.id).push(campaign.id);
        assignedCampaigns.add(campaign.id);
        matchDetails.push({
          campaign: campaign.name,
          client: bestMatchClient.name,
          priority: bestMatch.priority,
          reason: bestMatch.reason
        });
      }
    });

    // Log results
    logger.info(`✅ Campaign grouping complete:`);
    matchDetails.forEach(detail => {
      logger.info(`   "${detail.campaign}" → "${detail.client}" (priority ${detail.priority}: ${detail.reason})`);
    });

    const unassigned = smsCampaigns.length - assignedCampaigns.size;
    if (unassigned > 0) {
      logger.info(`   ⚠️  ${unassigned} campaigns could not be grouped (will remain as SMS-only)`);
    }

    return groupMap;
  }

  /**
   * Get unmatched campaigns (those that couldn't be grouped)
   */
  getUnmatchedCampaigns(mauticClients, smsCampaigns) {
    const grouped = new Set();

    smsCampaigns.forEach(campaign => {
      let bestMatch = null;

      mauticClients.forEach(client => {
        const result = this.isClientMatch(client.name, campaign.name);
        if (result.match) {
          if (!bestMatch || result.priority < bestMatch.priority) {
            bestMatch = result;
          }
        }
      });

      if (bestMatch) {
        grouped.add(campaign.id);
      }
    });

    return smsCampaigns.filter(c => !grouped.has(c.id));
  }
}

export default new CampaignGroupingService();