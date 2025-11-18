const { LRUCache } = require('lru-cache');

const cache = new LRUCache({
  max: 500,
  ttl: 1000 * 60
});

module.exports = cache;
