#!/usr/bin/env node

/**
 * Manual Sync Trigger Script
 * Use this to manually trigger a full Mautic sync to fetch missing click/bounce data
 */

import 'dotenv/config';
import MauticSchedulerService from '../modules/mautic/schedulerService.js';

async function runManualSync() {
  console.log('🚀 Starting Manual Mautic Sync...\n');
  console.log('This will:');
  console.log('  1. Fetch all email metadata from Mautic');
  console.log('  2. Fetch click trackables for each email');
  console.log('  3. Aggregate click data into MauticEmail table');
  console.log('  4. Update bounce and unsubscribe counts');
  console.log('  5. Update lastSyncAt timestamps\n');
  
  console.log('⚠️  This may take several minutes depending on data volume.\n');

  const scheduler = new MauticSchedulerService();
  
  try {
    // Check encryption key
    if (!process.env.ENCRYPTION_KEY) {
      console.error('❌ CRITICAL: ENCRYPTION_KEY not set in environment!');
      console.error('   Please set it in backend/.env file before running sync.');
      console.error('   Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
      process.exit(1);
    }

    console.log('✅ ENCRYPTION_KEY detected');
    console.log('📊 Starting sync process...\n');
    
    const startTime = Date.now();
    
    // Run sync with forceFull=true to fetch all data including clicks
    const result = await scheduler.syncAllClients({ forceFull: true });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 SYNC COMPLETE');
    console.log('='.repeat(60));
    console.log(`Duration: ${duration}s`);
    console.log(`Success: ${result.success}`);
    
    if (result.success) {
      console.log(`\n✅ Sync completed successfully!`);
      console.log(`   Total clients: ${result.results?.totalClients || 0}`);
      console.log(`   Successful: ${result.results?.successful || 0}`);
      console.log(`   Failed: ${result.results?.failed || 0}`);
      
      if (result.results?.details) {
        console.log('\n📋 Details:');
        result.results.details.forEach((detail, i) => {
          console.log(`\n   ${i + 1}. ${detail.clientName || 'Unknown'}`);
          console.log(`      Status: ${detail.success ? '✅ Success' : '❌ Failed'}`);
          if (detail.success) {
            console.log(`      Emails: ${detail.emails?.total || 0}`);
            console.log(`      Campaigns: ${detail.campaigns?.total || 0}`);
            console.log(`      Segments: ${detail.segments?.total || 0}`);
            console.log(`      Email Reports: ${detail.emailReports?.totalInDb || 0} in DB`);
          } else {
            console.log(`      Error: ${detail.error}`);
          }
        });
      }
      
      console.log('\n🎉 You can now refresh your dashboard to see updated metrics!');
      console.log('   Run the diagnostic script to verify:');
      console.log('   node backend/scripts/diagnose-dashboard-metrics.js\n');
    } else {
      console.log(`\n❌ Sync failed: ${result.message || 'Unknown error'}`);
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      console.log('\n💡 Troubleshooting:');
      console.log('   1. Check Mautic credentials are correct');
      console.log('   2. Verify Mautic URL is accessible');
      console.log('   3. Check backend logs for detailed error messages');
      console.log('   4. Ensure ENCRYPTION_KEY matches the one used to encrypt passwords\n');
    }
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n❌ Sync failed with error:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    
    console.log('\n💡 Common causes:');
    console.log('   - Missing or incorrect ENCRYPTION_KEY');
    console.log('   - Invalid Mautic credentials');
    console.log('   - Network connectivity issues');
    console.log('   - Mautic API rate limiting');
    console.log('   - Database connection errors\n');
    
    process.exit(1);
  }
}

// Handle SIGINT (Ctrl+C)
process.on('SIGINT', () => {
  console.log('\n\n⚠️  Sync interrupted by user');
  console.log('   Partial data may have been saved.');
  console.log('   Run again to complete sync.\n');
  process.exit(130);
});

runManualSync().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
