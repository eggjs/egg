'use strict';

const util = require('util');
const dns = require('node:dns');
const LRU = require('ylru');

const IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

class DNSCacheResolver {
  /**
   * Create a DNS cache resolver instance
   * @param {Object} options - Configuration options
   * @param {Boolean} options.useResolver - enable dns.resolver, otherwise use dns.lookup by default
   * @param {Number} options.max - Maximum cache size, default is 1000
   * @param {Number} options.dnsCacheLookupInterval - DNS cache lookup interval in milliseconds, effective when useResolver == false, default is 10000
   * @param {Array<String>} options.servers - Custom DNS nameservers, effective when useResolver == true, e.g. ['8.8.8.8', '1.1.1.1']
   * @param {Boolean} options.addressRotation - Enable address rotation for both lookup and resolve modes, default is true
   */
  constructor(options = {}) {
    this.maxCacheSize = options.max || 1000;
    this.resetCache();

    // Set useResolver before using it
    this.useResolver = options.useResolver === true;

    this.dnsCacheLookupInterval = options.dnsCacheLookupInterval || 10000;

    // Address rotation is enabled by default
    this.enableAddressRotation = options.addressRotation !== false;

    if (this.useResolver) {
      this._initializeResolver(options.servers);
    } else {
      // Use dns.lookup mode (old behavior)
      this.lookupPromises = {
        lookup: util.promisify(dns.lookup),
      };
    }
  }

  /**
   * Initialize DNS resolver with custom nameservers if provided
   * @param defaultServers
   * @private
   */
  _initializeResolver(defaultServers) {
    this.resolver = new dns.Resolver({
      timeout: 3000,
      tries: 2,
    });
    const hasDefaultServers = defaultServers && Array.isArray(defaultServers) && defaultServers.length > 0;
    if (hasDefaultServers) {
      this.resolver.setServers(defaultServers);
    }
    const servers = this.resolver.getServers();
    this.resolverState = {
      servers: servers || null,
    };
    this.resolverPromises = this.resolver.promises || {
      resolve4: util.promisify(this.resolver.resolve4.bind(this.resolver)),
    };
  }

  /**
   * Get the lookup function compatible with dns.lookup signature
   * @return {Function} lookup function
   */
  getLookupFunction() {
    return (hostname, options, callback) => {
      // signature handling: lookup(hostname, cb) or lookup(hostname, options, cb)
      if (typeof options === 'function') {
        callback = options;
        options = {};
      }
      if (typeof options === 'number') {
        options = { family: options };
      }
      if (typeof callback !== 'function') {
        throw new TypeError('callback must be a function');
      }
      options = options || {};
      if (!options.family) {
        options.family = 4;
      }

      // keep original dns.lookup behavior for literal IPs without hitting the network
      if (IP_REGEX.test(hostname)) {
        const family = typeof options.family === 'number' ? options.family : 4;
        const ttl = this.useResolver ? 1000 : this.dnsCacheLookupInterval || 1000;
        return this._callbackWithRecord(
          { ip: hostname, family, ttl, timestamp: Date.now() },
          options,
          callback
        );
      }

      const record = this._dnsCache.get(hostname);
      const now = Date.now();
      if (record) {
        // Check TTL - use the first record's TTL and timestamp
        const firstRecord = record.records[0];
        const ttl = firstRecord.ttl || 0;
        const timestamp = firstRecord.timestamp || now;

        if (now - timestamp >= ttl) {
          // refresh in background, keep serving cached value
          this._updateDNS(hostname);
        }
        return this._callbackWithRecord(record, options, callback);
      }

      // No cached record, resolve and respond when ready
      this._updateDNS(hostname)
        .then(record => {
          this._callbackWithRecord(record, options, callback);
        })
        .catch(err => {
          callback(err);
        });
    };
  }

  getDnsCache() {
    return this._dnsCache;
  }

  /**
   * Callback with record, handling rotation
   * @param record
   * @param options
   * @param callback
   * @private
   */
  _callbackWithRecord(record, options, callback) {
    // All records use the unified structure with rotation
    if (record.records && Array.isArray(record.records)) {
      const records = record.records;
      const currentRecord = records[record.currentIndex % records.length];

      // Rotate to next address for next call (if enabled)
      if (this.enableAddressRotation) {
        record.currentIndex = (record.currentIndex + 1) % records.length;
      }

      if (options.all) {
        return callback(null, [{ address: currentRecord.ip, family: currentRecord.family || 4 }]);
      }

      return callback(null, currentRecord.ip, currentRecord.family || 4);
    } else if (typeof record === 'object' && record.ip) {
      // Legacy single record structure
      if (options.all) {
        return callback(null, [{ address: record.ip, family: record.family || 4 }]);
      }
      return callback(null, record.ip, record.family || 4);
    }

    // Should not reach here, all records should use records structure
    throw new Error('[dns_cache_error]: Invalid cache record structure');
  }

  /**
   * Update DNS cache with fresh resolution
   * Supports both dns.lookup and dns.resolve modes
   * @param hostname
   * @private
   */
  async _updateDNS(hostname) {
    // Use dns.lookup
    if (!this.useResolver) {
      try {
        // Use {all: true} to get all addresses for rotation support
        const addresses = await this.lookupPromises.lookup(hostname, { family: 4, all: true });
        const addressArray = Array.isArray(addresses) ? addresses : [addresses];
        if (addressArray.length === 0) {
          throw new Error(`empty address for ${hostname}`);
        }
        const records = addressArray.map((addr, index) => ({
          ip: addr.address,
          family: addr.family || 4,
          ttl: this.dnsCacheLookupInterval,
          timestamp: Date.now(),
          index,
        }));

        const cacheEntry = {
          records,
          currentIndex: 0,
        };
        this._dnsCache.set(hostname, cacheEntry);
        return cacheEntry;
      } catch (err) {
        this._debugDNS(err, 'lookup');
        throw err;
      }
    }

    // Use dns.resolve
    try {
      const addresses = await this.resolverPromises.resolve4(hostname, { ttl: true });
      const addressArray = Array.isArray(addresses) ? addresses : [addresses];

      // Store all addresses with rotation index
      const records = addressArray.map((addr, index) => {
        const address = typeof addr === 'string' ? addr : addr.address;
        const ttlSeconds = addr && Number.isInteger(addr.ttl) && addr.ttl >= 0 ? addr.ttl : 0;
        return {
          ip: address,
          family: 4,
          ttl: ttlSeconds * 1000,
          timestamp: Date.now(),
          index,
        };
      });

      if (records.length === 0 || !records[0].ip) {
        throw new Error(`empty address for ${hostname}`);
      }

      // Store all records with rotation state
      const cacheEntry = {
        records,
        currentIndex: 0,
      };
      this._dnsCache.set(hostname, cacheEntry);

      return cacheEntry;
    } catch (err) {
      this._debugDNS(err, 'resolve');
      throw err;
    }
  }

  /**
   * Debug DNS errors
   * @param err
   * @param mode
   * @private
   */
  _debugDNS(err, mode) {
    util.debuglog(`egg:dnscache:${mode}`)('dns refresh error: %s', err && err.message ? err.message : err);
  }

  /**
   * Get cache statistics
   * @return {Object} cache stats
   */
  getStats() {
    return {
      cacheSize: this._dnsCache.size,
      maxCacheSize: this.maxCacheSize,
      enableAddressRotation: this.enableAddressRotation,
      resolverState: this.resolverState.servers ? {
        serverCount: this.resolverState.servers.length,
      } : null,
    };
  }

  /**
   * Clear the DNS cache
   */
  resetCache() {
    if (this._dnsCache) this._dnsCache.reset();
    this._dnsCache = new LRU(this.maxCacheSize);
  }

  /**
  * Get a specific hostname's single record from cache
  * @param {String} hostname - Hostname to query
  * @return {Object|undefined} cache record
  */
  getCacheRecord(hostname) {
    const entry = this._dnsCache.get(hostname);
    if (entry && entry.records && Array.isArray(entry.records)) {
      return entry.records[entry.currentIndex % entry.records.length];
    }
    return null;
  }
}

module.exports = DNSCacheResolver;
