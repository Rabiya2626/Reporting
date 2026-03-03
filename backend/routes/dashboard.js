import express from 'express';
import dashboardService from '../services/dashboardService.js';
import { authenticate } from '../middleware/auth.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Dashboard Routes
 * Optimized consolidated endpoints for dashboard data
 * Reduces 11 endpoints to 3 for better performance
 */

/**
 * GET /api/dashboard/overview
 * Get complete dashboard overview data
 * 
 * Consolidates:
 * - GET /api/users (stats only)
 * - GET /api/clients (count only)
 * - GET /api/mautic/clients (accessible clients)
 * - GET /api/mautic/stats/overview (email metrics)
 * - GET /api/dropcowboy/metrics (voicemail metrics)
 * - GET /api/mautic/sync/status (mautic sync status)
 * - GET /api/dropcowboy/sync-status (dropcowboy sync status)
 * - GET /api/mautic/sms-clients/sync-status (sms sync status)
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": {
 *     "stats": {
 *       "totalEmployees": number,
 *       "totalManagers": number,
 *       "totalAdmins": number,
 *       "totalClients": number
 *     },
 *     "emailMetrics": {
 *       "totalSent": number,
 *       "totalRead": number,
 *       "totalClicked": number,
 *       "totalUniqueClicks": number,
 *       "totalBounced": number,
 *       "totalUnsubscribed": number,
 *       "openRate": number,
 *       "clickRate": number,
 *       "bounceRate": number,
 *       "unsubscribeRate": number,
 *       "avgReadRate": number,
 *       "avgClickRate": number,
 *       "avgUnsubscribeRate": number,
 *       "clickSummary": {
 *         "totalUniqueClicks": number,
 *         "totalHits": number
 *       },
 *       "topEmails": [...]
 *     },
 *     "voicemailMetrics": {
 *       "totalSent": number,
 *       "successfulDeliveries": number,
 *       "failedSends": number,
 *       "otherStatus": number,
 *       "averageSuccessRate": number,
 *       "totalCost": number,
 *       "lastUpdated": "ISO timestamp"
 *     },
 *     "syncStatus": {
 *       "mautic": { "hasCredentials": boolean, "lastSyncAt": "ISO timestamp", ... },
 *       "dropCowboy": { "hasCredentials": boolean, "lastSyncAt": "ISO timestamp", ... },
 *       "sms": { "hasCredentials": boolean, "lastSyncAt": "ISO timestamp", ... }
 *     },
 *     "fetchedAt": "ISO timestamp",
 *     "performanceMs": number
 *   }
 * }
 */
router.get('/overview', authenticate, async (req, res) => {
  try {
    const result = await dashboardService.getDashboardOverview(req.user);
    res.json(result);
  } catch (error) {
    logger.error('[Dashboard API] Error fetching overview:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'DASHBOARD_OVERVIEW_ERROR',
        message: 'Failed to fetch dashboard overview',
        details: error.message
      }
    });
  }
});

/**
 * GET /api/dashboard/sync-progress
 * Get real-time sync progress
 * 
 * Consolidates:
 * - GET /api/mautic/sync/progress
 * 
 * Response format:
 * {
 *   "success": true,
 *   "data": {
 *     "isActive": boolean,
 *     "totalClients": number,
 *     "completedClients": number,
 *     "elapsedSeconds": number,
 *     "currentBatch": number,
 *     "totalBatches": number,
 *     "clientList": [
 *       {
 *         "clientId": string,
 *         "clientName": string,
 *         "status": "pending | syncing | completed | failed",
 *         "message": string,
 *         "emails": number,
 *         "campaigns": number,
 *         "emailReports": number
 *       }
 *     ]
 *   }
 * }
 */
router.get('/sync-progress', authenticate, async (req, res) => {
  try {
    const result = await dashboardService.getSyncProgress();
    res.json(result);
  } catch (error) {
    logger.error('[Dashboard API] Error fetching sync progress:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_PROGRESS_ERROR',
        message: 'Failed to fetch sync progress',
        details: error.message
      }
    });
  }
});

/**
 * POST /api/dashboard/sync-all
 * Trigger sync for all services
 * 
 * Consolidates:
 * - POST /api/mautic/sync/all
 * - POST /api/dropcowboy/fetch
 * 
 * Query params:
 * - forceFull=true : Force full data re-fetch (clears lastSyncAt)
 * - syncDropCowboy=true : Also trigger DropCowboy sync
 * 
 * Response format:
 * {
 *   "success": true,
 *   "message": "Sync started for all services",
 *   "data": {
 *     "mautic": {
 *       "success": boolean,
 *       "message": string,
 *       "isSyncing": boolean
 *     },
 *     "dropCowboy": {
 *       "success": boolean,
 *       "message": string
 *     }
 *   }
 * }
 */
router.post('/sync-all', authenticate, async (req, res) => {
  try {
    const forceFull = req.query.forceFull === 'true';
    const syncDropCowboy = req.query.syncDropCowboy === 'true';

    const result = await dashboardService.triggerSyncAll({
      forceFull,
      syncDropCowboy
    });

    res.json(result);
  } catch (error) {
    logger.error('[Dashboard API] Error triggering sync:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'SYNC_TRIGGER_ERROR',
        message: 'Failed to trigger sync',
        details: error.message
      }
    });
  }
});

export default router;
