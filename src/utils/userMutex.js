/**
 * User-level locking mechanism to prevent concurrent balance operations
 * Uses a promise-based queue system for each user to ensure thread-safe balance modifications
 */
class UserLock {
  constructor() {
    this.locks = new Map();
    this.lockCleanupInterval = 5 * 60 * 1000; // 5 minutes
    
    // Periodically clean up unused locks to prevent memory leaks
    setInterval(() => {
      this.cleanupUnusedLocks();
    }, this.lockCleanupInterval);
  }

  /**
   * Get or create a lock queue for a specific user
   * @param {string} userId - User identifier
   * @returns {object} User-specific lock info
   */
  getLock(userId) {
    if (!this.locks.has(userId)) {
      this.locks.set(userId, {
        queue: Promise.resolve(),
        lastUsed: Date.now(),
        isLocked: false
      });
    } else {
      // Update last used timestamp
      this.locks.get(userId).lastUsed = Date.now();
    }
    
    return this.locks.get(userId);
  }

  /**
   * Execute a function with user-level locking
   * @param {string} userId - User identifier
   * @param {Function} fn - Function to execute with lock
   * @returns {Promise<any>} Result of the function execution
   */
  async runExclusive(userId, fn) {
    const lockInfo = this.getLock(userId);
    
    // Chain the new operation to the existing queue
    const currentQueue = lockInfo.queue;
    
    const newOperation = currentQueue.then(async () => {
      lockInfo.isLocked = true;
      try {
        return await fn();
      } finally {
        lockInfo.isLocked = false;
      }
    });
    
    // Update the queue with the new operation
    lockInfo.queue = newOperation.catch(() => {}); // Prevent unhandled rejections from breaking the queue
    
    return newOperation;
  }

  /**
   * Clean up unused locks to prevent memory leaks
   * Removes locks that haven't been used for more than the cleanup interval
   */
  cleanupUnusedLocks() {
    const now = Date.now();
    const cleanupThreshold = this.lockCleanupInterval;
    
    for (const [userId, lockInfo] of this.locks.entries()) {
      if (now - lockInfo.lastUsed > cleanupThreshold && !lockInfo.isLocked) {
        this.locks.delete(userId);
      }
    }
  }

  /**
   * Get the number of active locks (for monitoring/debugging)
   * @returns {number} Number of active locks
   */
  getActiveLockCount() {
    return this.locks.size;
  }
}

// Export a singleton instance
module.exports = new UserLock();