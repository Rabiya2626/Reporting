/**
 * SMS Campaign Grouping Service
 * Implements intelligent matching logic to group SMS campaigns under Mautic clients
 * Matching priority: Full name > Partial word > Acronym
 */

import logger from '../../../utils/logger.js';

class CampaignGroupingService {
  /**
   * Normalize a string for comparison
   */
  normalize(str) {
    return (str || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
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
   * Priority: Full match > Primary keyword match > Substring match > Acronym match
   * Only matches on meaningful keywords to prevent false positives
   */
  isClientMatch(mauticName, smsName) {
    const mNorm = this.normalize(mauticName);
    const sNorm = this.normalize(smsName);

    // 🥇 PRIORITY 1: Exact full name match
    if (mNorm === sNorm) {
      return { match: true, priority: 1, reason: 'exact_match' };
    }

    const mWords = this.getWords(mauticName);
    const sWords = this.getWords(smsName);

    // 🥈 PRIORITY 2: PRIMARY keyword match only (e.g., "Century" from "Century Pharmaceuticals" matches "Century SMS")
    // Only use the FIRST word as the primary keyword to prevent secondary words from causing matches
    // Example: "Century" matches "Century SMS", but "Pharmaceuticals" should NOT match "Pharmaceutical Supplies"
    const primaryKeyword = mWords[0];  // First word is the primary identifier
    if (primaryKeyword && primaryKeyword.length > 2 && sWords.includes(primaryKeyword)) {
      return { match: true, priority: 2, reason: 'primary_keyword_match' };
    }

    // 🥉 PRIORITY 3: One side appears as whole word on other side
    if (sWords.includes(mNorm) || mWords.includes(sNorm)) {
      return { match: true, priority: 3, reason: 'word_match' };
    }

    // 🏅 PRIORITY 4: Substring match (but only for longer names to prevent accidents)
    if (mNorm.length > 3 && sNorm.includes(mNorm)) {
      return { match: true, priority: 4, reason: 'substring_match' };
    }
    if (sNorm.length > 3 && mNorm.includes(sNorm)) {
      return { match: true, priority: 4, reason: 'substring_match' };
    }

    // 🏆 PRIORITY 5: Acronym match (only if one side is single word)
    const mAbbr = this.getAbbreviation(mauticName);
    const sAbbr = this.getAbbreviation(smsName);

    if (mWords.length === 1 && mNorm === sAbbr) {
      return { match: true, priority: 5, reason: 'acronym_match' };
    }
    if (sWords.length === 1 && sNorm === mAbbr) {
      return { match: true, priority: 5, reason: 'acronym_match' };
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
