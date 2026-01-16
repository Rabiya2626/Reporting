import crypto from 'crypto';

// Generate or validate encryption key
let ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate key or generate a secure one
if (!ENCRYPTION_KEY || ENCRYPTION_KEY === 'your_64_character_encryption_key_here_generate_with_openssl_rand_hex_32') {
  // Generate a proper 64-character hex key (32 bytes)
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  ENCRYPTION_KEY not set or using default. Generated temporary key. Set ENCRYPTION_KEY in .env for persistence.');
}

// Validate key length (must be 64 hex characters = 32 bytes)
if (ENCRYPTION_KEY.length !== 64) {
  console.error(`❌ Invalid ENCRYPTION_KEY length: ${ENCRYPTION_KEY.length} (expected 64 hex characters)`);
  console.error('Generate a proper key with: openssl rand -hex 32');
  // Generate a valid key as fallback
  ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
  console.warn('⚠️  Using temporary generated key. Please set a proper ENCRYPTION_KEY in .env');
}

const ALGORITHM = 'aes-256-cbc';

class EncryptionService {
  /**
   * Encrypt a string
   * @param {string} text - Plain text to encrypt
   * @returns {string} Encrypted text with IV prepended
   */
  encrypt(text) {
    if (!text) return '';
    
    try {
      // Convert 64-char hex string to 32-byte buffer
      const key = Buffer.from(ENCRYPTION_KEY, 'hex');
      
      if (key.length !== 32) {
        throw new Error(`Invalid key length: ${key.length} bytes (expected 32)`);
      }
      
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      // Return IV + encrypted data (IV is needed for decryption)
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt a string
   * @param {string} encryptedText - Encrypted text with IV prepended
   * @returns {string} Decrypted plain text
   */
  decrypt(encryptedText) {
    if (!encryptedText) return '';
    
    try {
      // Convert 64-char hex string to 32-byte buffer
      const key = Buffer.from(ENCRYPTION_KEY, 'hex');
      
      if (key.length !== 32) {
        throw new Error(`Invalid key length: ${key.length} bytes (expected 32)`);
      }
      
      const parts = encryptedText.split(':');
      
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }
      
      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      // Provide actionable guidance for operators: likely wrong/missing ENCRYPTION_KEY or corrupted data
      throw new Error('Failed to decrypt data. Ensure ENCRYPTION_KEY in .env matches the key used to encrypt stored credentials, or re-enter client credentials to re-encrypt them.');
    }
  }

  /**
   * Generate a random encryption key for .env file
   * @returns {string} 64-character hex string
   */
  static generateKey() {
    return crypto.randomBytes(32).toString('hex');
  }
}

export default new EncryptionService();