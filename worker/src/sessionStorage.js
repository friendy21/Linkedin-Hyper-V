'use strict';

// FILE: worker/src/sessionStorage.js
// Stores encrypted LinkedIn storageState blobs in PostgreSQL.
// Redis is NOT used for session data — only for rate limits + BullMQ.

const crypto = require('crypto');
const { getPrisma } = require('./db/prisma');

const ALGORITHM = 'aes-256-gcm';

/**
 * Derive a 32-byte AES key from the global secret + userId.
 * Using HKDF-lite (SHA-256 HMAC) to bind ciphertext to a specific user.
 */
function deriveKey(userId) {
  const secret = process.env.SESSION_ENCRYPTION_KEY;
  if (!secret || secret.length !== 64) {
    throw new Error(
      'SESSION_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes). ' +
      'Generate with: openssl rand -hex 32'
    );
  }
  const masterKey = Buffer.from(secret, 'hex');
  // HMAC-SHA256(masterKey, userId) → 32-byte derived key
  return crypto.createHmac('sha256', masterKey).update(userId).digest();
}

/**
 * Encrypt a UTF-8 string with AES-256-GCM.
 * Returns a Base64-encoded JSON envelope: { iv, tag, data }
 */
function encrypt(plaintext, userId) {
  const iv     = crypto.randomBytes(16);
  const key    = deriveKey(userId);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc    = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag    = cipher.getAuthTag();
  return JSON.stringify({
    iv:   iv.toString('hex'),
    tag:  tag.toString('hex'),
    data: enc.toString('hex'),
  });
}

/**
 * Decrypt an AES-256-GCM envelope produced by encrypt().
 */
function decrypt(payload, userId) {
  const { iv, tag, data } = JSON.parse(payload);
  const key      = deriveKey(userId);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(iv, 'hex'));
  decipher.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(data, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}

/**
 * Save (encrypt + upsert) a Playwright storageState blob to PostgreSQL.
 *
 * @param {string} linkedInAccountId - LinkedInAccount PK
 * @param {string} userId            - App User PK (used in key derivation)
 * @param {object} storageStateObj   - Raw object from context.storageState()
 */
async function saveStorageState(linkedInAccountId, userId, storageStateObj) {
  const plaintext = JSON.stringify(storageStateObj);
  const encrypted = encrypt(plaintext, userId);
  const prisma    = getPrisma();

  await prisma.linkedInAccount.update({
    where: { id: linkedInAccountId },
    data: {
      encryptedStorageState: encrypted,
      status:                'active',
      lastSyncedAt:          new Date(),
    },
  });
}

/**
 * Load and decrypt the storageState blob for a LinkedIn account.
 *
 * @param {string} linkedInAccountId
 * @param {string} userId
 * @returns {object|null} Parsed storageState object, or null if not present
 */
async function loadStorageState(linkedInAccountId, userId) {
  const prisma = getPrisma();
  const record = await prisma.linkedInAccount.findUnique({
    where:  { id: linkedInAccountId },
    select: { encryptedStorageState: true },
  });

  if (!record || !record.encryptedStorageState) return null;

  const plaintext = decrypt(record.encryptedStorageState, userId);
  return JSON.parse(plaintext);
}

/**
 * Clear the storageState for a LinkedIn account and mark it as expired.
 *
 * @param {string} linkedInAccountId
 */
async function deleteStorageState(linkedInAccountId) {
  const prisma = getPrisma();
  await prisma.linkedInAccount.update({
    where: { id: linkedInAccountId },
    data: {
      encryptedStorageState: null,
      status:                'expired',
    },
  });
}

module.exports = { saveStorageState, loadStorageState, deleteStorageState };
