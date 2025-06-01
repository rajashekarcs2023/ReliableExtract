const crypto = require('crypto');

class MemoryManager {
  constructor(limit = 10) { // Increased memory size for more context
    this.memory = [];
    this.stateHistory = [];
    this.limit = limit;
    this.loopThreshold = 6; // Significantly increased to be much less sensitive
    this.partialLoopThreshold = 0.95; // Require near-exact matches for loop detection
  }

  _hash(state) {
    return crypto.createHash('md5').update(state).digest('hex');
  }

  // Calculate similarity between two states (0-1 scale)
  _calculateSimilarity(hash1, hash2) {
    if (hash1 === hash2) return 1.0;
    
    // Convert hashes to binary and count matching bits
    const bin1 = Buffer.from(hash1, 'hex');
    const bin2 = Buffer.from(hash2, 'hex');
    
    let matchingBits = 0;
    const totalBits = bin1.length * 8;
    
    for (let i = 0; i < bin1.length; i++) {
      const xor = bin1[i] ^ bin2[i];
      // Count bits that are the same (0 in XOR result)
      for (let j = 0; j < 8; j++) {
        if (((xor >> j) & 1) === 0) {
          matchingBits++;
        }
      }
    }
    
    return matchingBits / totalBits;
  }

  // Detect both exact and partial loops
  add(state) {
    const hash = this._hash(state);
    const timestamp = Date.now();
    
    // Store full state information
    const stateInfo = {
      hash,
      timestamp,
      statePreview: state.substring(0, 100) + '...',
      similarityScores: []
    };
    
    // Calculate similarity with previous states
    this.memory.forEach((previousHash, index) => {
      const similarity = this._calculateSimilarity(hash, previousHash);
      stateInfo.similarityScores.push({
        index,
        hash: previousHash,
        similarity
      });
    });
    
    this.memory.push(hash);
    this.stateHistory.push(stateInfo);
    
    if (this.memory.length > this.limit) {
      this.memory.shift();
      this.stateHistory.shift();
    }
    
    // Check for exact loops
    const exactOccurrences = this.memory.filter(h => h === hash).length;
    if (exactOccurrences >= this.loopThreshold) {
      return { isLooping: true, type: 'exact', confidence: 1.0 };
    }
    
    // Check for partial loops (similar states repeating)
    const similarStates = this.memory.filter((h, i) => {
      if (i === this.memory.length - 1) return false; // Skip current state
      const similarity = this._calculateSimilarity(hash, h);
      return similarity >= this.partialLoopThreshold;
    });
    
    if (similarStates.length >= this.loopThreshold - 1) {
      return { isLooping: true, type: 'partial', confidence: 0.8 };
    }
    
    return { isLooping: false, type: 'none', confidence: 0.0 };
  }
  
  // Get the current memory state for visualization
  getState() {
    return {
      memorySize: this.memory.length,
      limit: this.limit,
      stateHistory: this.stateHistory,
      loopThreshold: this.loopThreshold,
      partialLoopThreshold: this.partialLoopThreshold
    };
  }
}

module.exports = MemoryManager;