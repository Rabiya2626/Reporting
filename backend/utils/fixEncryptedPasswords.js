/**
 * Utility script to fix double-encrypted passwords in the database
 * 
 * This script helps recover from the double-encryption issue where passwords
 * were encrypted twice when updating clients.
 * 
 * Usage:
 *   node utils/fixEncryptedPasswords.js
 * 
 * The script will:
 * 1. List all clients with their current password status
 * 2. Allow you to manually re-enter passwords for affected clients
 */

import 'dotenv/config';
import prisma from '../prisma/client.js';
import encryptionService from '../modules/mautic/encryption.js';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function testDecryption(clientId, clientName, encryptedPassword) {
  try {
    const decrypted = encryptionService.decrypt(encryptedPassword);
    console.log(`  ✅ [${clientName}] Password can be decrypted`);
    return { success: true, decrypted };
  } catch (error) {
    console.log(`  ❌ [${clientName}] Password decryption failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function updateClientPassword(clientId, clientName, newPassword, tableName = 'mauticClient') {
  try {
    const encrypted = encryptionService.encrypt(newPassword);
    
    if (tableName === 'smsClient') {
      await prisma.smsClient.update({
        where: { id: clientId },
        data: { password: encrypted }
      });
    } else {
      await prisma.mauticClient.update({
        where: { id: clientId },
        data: { password: encrypted }
      });
    }
    
    console.log(`  ✅ [${clientName}] Password updated successfully`);
    return true;
  } catch (error) {
    console.error(`  ❌ [${clientName}] Failed to update password: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('\n🔐 Password Encryption Fix Utility\n');
  console.log('This utility helps fix double-encrypted passwords in the database.\n');

  try {
    // Check Mautic clients
    console.log('📊 Checking Mautic Clients...\n');
    const mauticClients = await prisma.mauticClient.findMany({
      select: { id: true, name: true, password: true, mauticUrl: true, username: true }
    });

    const failedMauticClients = [];
    
    for (const client of mauticClients) {
      const result = await testDecryption(client.id, client.name, client.password);
      if (!result.success) {
        failedMauticClients.push(client);
      }
    }

    // Check SMS clients
    console.log('\n📱 Checking SMS Clients...\n');
    const smsClients = await prisma.smsClient.findMany({
      select: { id: true, name: true, password: true, mauticUrl: true, username: true }
    });

    const failedSmsClients = [];
    
    for (const client of smsClients) {
      const result = await testDecryption(client.id, client.name, client.password);
      if (!result.success) {
        failedSmsClients.push(client);
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📋 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Mautic Clients: ${mauticClients.length} total, ${failedMauticClients.length} failed`);
    console.log(`SMS Clients: ${smsClients.length} total, ${failedSmsClients.length} failed`);
    console.log('='.repeat(60) + '\n');

    if (failedMauticClients.length === 0 && failedSmsClients.length === 0) {
      console.log('✅ All passwords are properly encrypted! No action needed.\n');
      rl.close();
      await prisma.$disconnect();
      return;
    }

    console.log('⚠️  Some passwords failed decryption. This could mean:');
    console.log('   1. They were double-encrypted (most likely)');
    console.log('   2. Wrong ENCRYPTION_KEY in .env');
    console.log('   3. Corrupted data\n');

    const fix = await question('Would you like to fix these passwords? (yes/no): ');
    
    if (fix.toLowerCase() !== 'yes' && fix.toLowerCase() !== 'y') {
      console.log('\nNo changes made. Exiting...\n');
      rl.close();
      await prisma.$disconnect();
      return;
    }

    // Fix Mautic clients
    if (failedMauticClients.length > 0) {
      console.log('\n🔧 Fixing Mautic Clients...\n');
      
      for (const client of failedMauticClients) {
        console.log(`\nClient: ${client.name}`);
        console.log(`URL: ${client.mauticUrl}`);
        console.log(`Username: ${client.username}`);
        
        const password = await question('Enter the correct password (or press Enter to skip): ');
        
        if (password.trim()) {
          await updateClientPassword(client.id, client.name, password, 'mauticClient');
        } else {
          console.log(`  ⏭️  Skipped ${client.name}`);
        }
      }
    }

    // Fix SMS clients
    if (failedSmsClients.length > 0) {
      console.log('\n🔧 Fixing SMS Clients...\n');
      
      for (const client of failedSmsClients) {
        console.log(`\nClient: ${client.name}`);
        console.log(`URL: ${client.mauticUrl}`);
        console.log(`Username: ${client.username}`);
        
        const password = await question('Enter the correct password (or press Enter to skip): ');
        
        if (password.trim()) {
          await updateClientPassword(client.id, client.name, password, 'smsClient');
        } else {
          console.log(`  ⏭️  Skipped ${client.name}`);
        }
      }
    }

    console.log('\n✅ Password fix process completed!\n');
    console.log('💡 TIP: You can also update passwords through the UI Settings page.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
  } finally {
    rl.close();
    await prisma.$disconnect();
  }
}

main();
