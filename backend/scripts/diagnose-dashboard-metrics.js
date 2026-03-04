#!/usr/bin/env node

/**
 * Dashboard Metrics Diagnostic Script
 * Run this to diagnose why dashboard metrics are showing zero
 */

import 'dotenv/config';
import prisma from '../prisma/client.js';

async function runDiagnostics() {
  console.log('🔍 Running Dashboard Metrics Diagnostics...\n');

  try {
    // 1. Check MauticEmail data
    console.log('1️⃣  Checking MauticEmail table:');
    const emailStats = await prisma.mauticEmail.aggregate({
      _sum: {
        sentCount: true,
        readCount: true,
        clickedCount: true,
        uniqueClicks: true,
        bounced: true,
        unsubscribed: true
      },
      _count: { id: true }
    });
    console.log(`   Total emails: ${emailStats._count.id}`);
    console.log(`   Sent: ${emailStats._sum.sentCount || 0}`);
    console.log(`   Read: ${emailStats._sum.readCount || 0}`);
    console.log(`   Clicked: ${emailStats._sum.clickedCount || 0}`);
    console.log(`   Unique Clicks: ${emailStats._sum.uniqueClicks || 0}`);
    console.log(`   Bounced: ${emailStats._sum.bounced || 0}`);
    console.log(`   Unsubscribed: ${emailStats._sum.unsubscribed || 0}\n`);

    // 2. Check MauticClickTrackable
    console.log('2️⃣  Checking MauticClickTrackable table:');
    const clickCount = await prisma.mauticClickTrackable.count();
    console.log(`   Click records: ${clickCount}\n`);

    // 3. Check sync logs
    console.log('3️⃣  Checking recent sync logs:');
    const syncLogs = await prisma.mauticSyncLog.findMany({
      orderBy: { startedAt: 'desc' },
      take: 5,
      include: {
        mauticClient: {
          select: { name: true }
        }
      }
    });
    
    if (syncLogs.length === 0) {
      console.log('   ⚠️  NO SYNC LOGS FOUND');
      console.log('   This means sync has never run successfully!\n');
    } else {
      console.log(`   Found ${syncLogs.length} recent syncs:`);
      syncLogs.forEach((log, i) => {
        console.log(`   ${i + 1}. ${log.mauticClient?.name || 'Unknown'}`);
        console.log(`      Status: ${log.status}`);
        console.log(`      Started: ${log.startedAt.toISOString()}`);
        console.log(`      Completed: ${log.completedAt?.toISOString() || 'N/A'}`);
        console.log(`      Error: ${log.errorMessage || 'None'}`);
      });
      console.log('');
    }

    // 4. Check Mautic clients
    console.log('4️⃣  Checking Mautic clients:');
    const clients = await prisma.mauticClient.findMany({
      select: {
        id: true,
        name: true,
        isActive: true,
        lastSyncAt: true,
        mauticUrl: true
      }
    });
    
    if (clients.length === 0) {
      console.log('   ⚠️  NO MAUTIC CLIENTS CONFIGURED\n');
    } else {
      console.log(`   Found ${clients.length} clients:`);
      clients.forEach((client, i) => {
        console.log(`   ${i + 1}. ${client.name}`);
        console.log(`      URL: ${client.mauticUrl}`);
        console.log(`      Active: ${client.isActive}`);
        console.log(`      Last Sync: ${client.lastSyncAt?.toISOString() || 'Never'}`);
      });
      console.log('');
    }

    // 5. Check environment
    console.log('5️⃣  Checking environment configuration:');
    const hasEncryptionKey = !!process.env.ENCRYPTION_KEY;
    console.log(`   ENCRYPTION_KEY set: ${hasEncryptionKey ? '✅' : '❌'}`);
    if (!hasEncryptionKey) {
      console.log('   ⚠️  CRITICAL: ENCRYPTION_KEY not set!');
      console.log('   This will cause all syncs to fail.');
    }
    console.log('');

    // 6. Diagnosis
    console.log('🎯 DIAGNOSIS:\n');
    
    if (emailStats._sum.clickedCount === 0 && emailStats._sum.bounced === 0) {
      console.log('❌ ISSUE CONFIRMED: Click and bounce data is missing\n');
      
      console.log('📋 LIKELY CAUSES:');
      if (!hasEncryptionKey) {
        console.log('   1. Missing ENCRYPTION_KEY (preventing sync authentication)');
      }
      if (syncLogs.length === 0) {
        console.log('   2. Sync has never run successfully');
      }
      if (clickCount === 0) {
        console.log('   3. Click data was never fetched from Mautic API');
      }
      
      console.log('\n✅ SOLUTION:');
      console.log('   1. Set ENCRYPTION_KEY in backend/.env file');
      console.log('   2. Run manual sync: POST /api/dashboard/sync-all?forceFull=true');
      console.log('   3. Or run: npm run sync:mautic (if script exists)');
      console.log('   4. Check logs for sync completion');
      console.log('   5. Re-run this diagnostic to verify');
    } else {
      console.log('✅ Data looks good! Click and bounce data is present.');
      console.log('   If dashboard still shows zero, check:');
      console.log('   - Frontend is calling correct API endpoint');
      console.log('   - User permissions allow seeing data');
      console.log('   - Browser cache (try hard refresh)');
    }

  } catch (error) {
    console.error('\n❌ Error running diagnostics:', error);
    console.error(error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

runDiagnostics().catch(console.error);
