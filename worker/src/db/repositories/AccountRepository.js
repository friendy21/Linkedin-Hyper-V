// FILE: worker/src/db/repositories/AccountRepository.js
// Repository for LinkedInAccount database operations

'use strict';

const { getPrisma } = require('../prisma');

class LinkedInAccountRepository {
  /**
   * Get all active LinkedIn accounts with their owner userId
   */
  async getActiveAccounts() {
    const prisma = getPrisma();
    return prisma.linkedInAccount.findMany({
      where:   { status: 'active' },
      select:  { id: true, userId: true, displayName: true, linkedinProfileId: true, lastSyncedAt: true, status: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Get a LinkedIn account by ID, validates ownership via userId
   */
  async getByIdAndUser(id, userId) {
    const prisma = getPrisma();
    return prisma.linkedInAccount.findFirst({
      where: { id, userId },
    });
  }

  /**
   * Get all LinkedIn accounts for a user
   */
  async getByUserId(userId) {
    const prisma = getPrisma();
    return prisma.linkedInAccount.findMany({
      where:   { userId },
      orderBy: { createdAt: 'asc' },
      select:  {
        id: true, displayName: true, linkedinProfileId: true,
        status: true, lastSyncedAt: true, sessionExpiresAt: true, createdAt: true,
      },
    });
  }

  /**
   * Create a pending LinkedIn account record (before storageState is captured)
   */
  async createPending(userId) {
    const prisma = getPrisma();
    return prisma.linkedInAccount.create({
      data: { userId, status: 'pending' },
    });
  }

  /**
   * Activate a LinkedIn account after successful login capture
   */
  async activate(id, { displayName, linkedinProfileId, encryptedStorageState }) {
    const prisma = getPrisma();
    return prisma.linkedInAccount.update({
      where: { id },
      data: {
        displayName:           displayName || '',
        linkedinProfileId:     linkedinProfileId || null,
        encryptedStorageState,
        status:                'active',
        lastSyncedAt:          new Date(),
      },
    });
  }

  /**
   * Update lastSyncedAt for an account
   */
  async updateLastSyncedAt(id, timestamp = new Date()) {
    const prisma = getPrisma();
    return prisma.linkedInAccount.update({
      where: { id },
      data:  { lastSyncedAt: timestamp },
    });
  }

  /**
   * Delete a LinkedIn account and cascade all related data
   */
  async deleteAccount(id) {
    const prisma = getPrisma();
    return prisma.linkedInAccount.delete({ where: { id } });
  }
}

module.exports = new LinkedInAccountRepository();
