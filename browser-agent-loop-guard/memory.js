const crypto = require('crypto');

class MemoryManager {
  constructor(limit = 5) {
    this.memory = [];
    this.limit = limit;
  }

  _hash(state) {
    return crypto.createHash('md5').update(state).digest('hex');
  }

  add(state) {
    const hash = this._hash(state);
    this.memory.push(hash);
    if (this.memory.length > this.limit) {
      this.memory.shift();
    }
    const occurrences = this.memory.filter(h => h === hash).length;
    return occurrences >= 3;
  }
}

module.exports = MemoryManager;