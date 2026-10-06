import * as dns from 'node:dns';
import type { LookupAddress, LookupOneOptions } from 'node:dns';
import * as util from 'node:util';

import type { EggLogger } from 'egg';
import { LRU } from 'ylru';

const IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export interface DnsResolverOptions {
  useResolver?: boolean;
  max?: number;
  dnsCacheLookupInterval?: number;
  servers?: string[];
  addressRotation?: boolean;
}

export interface DnsCacheRecord {
  ip: string;
  family: number;
  ttl: number;
  timestamp: number;
  index: number;
}

interface CacheEntry {
  records: DnsCacheRecord[];
  currentIndex: number;
}

export class DnsResolver {
  private _maxCacheSize: number;
  private _dnsCache: LRU;
  private useResolver: boolean;
  private dnsCacheLookupInterval: number;
  private enableAddressRotation: boolean;
  private resolver?: dns.Resolver;
  private _resolve4?: typeof dns.resolve4.__promisify__;
  private _lookup?: typeof dns.lookup.__promisify__;
  private logger: EggLogger;

  /**
   * Create a DNS cache resolver instance
   * @param options - Configuration options
   * @param options.useResolver - enable dns.resolver, otherwise use dns.lookup by default
   * @param options.max - Maximum cache size, default is 1000
   * @param options.dnsCacheLookupInterval - DNS cache lookup interval in milliseconds, effective when useResolver == false, default is 10000
   * @param options.servers - Custom DNS nameservers, effective when useResolver == true, e.g. ['8.8.8.8', '1.1.1.1']
   * @param options.addressRotation - Enable address rotation for both lookup and resolve modes, default is true
   */
  constructor(options: DnsResolverOptions | undefined = {}, args: { logger: EggLogger }) {
    this._maxCacheSize = options.max || 1000;
    this._dnsCache = new LRU(this._maxCacheSize);
    this.logger = args.logger;

    // Set useResolver before using it
    this.useResolver = options.useResolver === true;

    this.dnsCacheLookupInterval = options.dnsCacheLookupInterval || 10000;

    // Address rotation is enabled by default
    this.enableAddressRotation = options.addressRotation !== false;

    if (this.useResolver) {
      this._initializeResolver(options.servers);
    } else {
      // Use dns.lookup mode (old behavior)
      this._lookup = util.promisify(dns.lookup);
    }

    this.resetCache = this.resetCache.bind(this);

    this._debugLog(
      `[dns-cache] DNS Resolver initialized in ${
        this.useResolver ? 'resolve' : 'lookup'
      } mode, maxCacheSize: ${this._maxCacheSize}, addressRotation: ${this.enableAddressRotation}`,
    );
  }

  get maxCacheSize(): number {
    return this._maxCacheSize;
  }

  private _debugLog(msg: any, ...args: any[]) {
    this.logger.debug.apply(this.logger, [msg, ...args]);
  }

  resetCacheSize(size: number): void {
    this._maxCacheSize = size;
    this.resetCache(true);
  }

  /**
   * Initialize DNS resolver with custom nameservers if provided
   * @param defaultServers - Custom DNS nameservers
   * @private
   */
  private _initializeResolver(defaultServers?: string[]) {
    this.resolver = new dns.Resolver({
      timeout: 3000,
      tries: 2,
    });
    const hasDefaultServers = defaultServers && Array.isArray(defaultServers) && defaultServers.length > 0;
    if (hasDefaultServers) {
      this.resolver.setServers(defaultServers);
      this._debugLog(`[dns-cache] Custom DNS servers configured: ${defaultServers.join(', ')}`);
    }
    this._resolve4 = util.promisify(this.resolver.resolve4.bind(this.resolver));
  }

  /**
   * Get the lookup function compatible with dns.lookup signature
   */
  getLookupFunction(): typeof dns.lookup {
    return ((
      hostname: string,
      options: number | LookupOneOptions,
      callback: (err: NodeJS.ErrnoException | null, address: string | LookupAddress[], family?: number) => void,
    ) => {
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
        // theoretically this code will never be reached because urllib will
        // directly return for literal IPs before calling lookup function
        const family = typeof options.family === 'number' ? options.family : 4;
        this.logger.debug(`[dns-cache] literal IP ${hostname} lookup, bypassing cache`);
        if (options?.all) {
          return callback(null, [{ address: hostname, family }]);
        }
        return callback(null, hostname, family);
      }

      const record = this._dnsCache.get(hostname) as CacheEntry | undefined;
      const now = Date.now();
      if (record) {
        // Check TTL - use the first record's TTL and timestamp
        const firstRecord = record.records[0];
        const ttl = firstRecord.ttl || 0;
        const timestamp = firstRecord.timestamp || now;

        if (now - timestamp >= ttl) {
          // refresh in background, keep serving cached value
          this._debugLog(
            `[dns-cache] Cache TTL expired for ${hostname}, refreshing in background. Age: ${
              now - timestamp
            }ms, TTL: ${ttl}ms`,
          );
          this._updateDNS(hostname).catch(() => {
            // do nothing, error already logged in _updateDNS
          });
        } else {
          this._debugLog(
            `[dns-cache] Cache hit for ${hostname}, remaining TTL: ${
              ttl - (now - timestamp)
            }ms, records: ${record.records.length}`,
          );
        }
        return this._callbackWithRecord(record, options, callback);
      }

      // No cached record, resolve and respond when ready
      this._debugLog(`[dns-cache] Cache miss for ${hostname}, resolving...`);
      this._updateDNS(hostname)
        .then((record) => {
          this._callbackWithRecord(record, options as LookupOneOptions, callback);
        })
        .catch((err) => {
          callback(err, '');
        });
    }) as typeof dns.lookup;
  }

  /**
   * This method may throw error if there is dns query in progress!
   * @throws Error
   * @param {string[]} servers eg. ['8.8.8.8']
   */
  setServers(servers: string[]): void {
    if (this.resolver) {
      this.resolver.setServers(servers);
    } else {
      this.logger.warn('[dns-cache] Cannot set DNS servers when useResolver is false');
    }
  }

  getDnsCache(): LRU {
    return this._dnsCache;
  }

  /**
   * Callback with record, handling rotation
   * @param record - DNS record with rotation state
   * @param options - Lookup options
   * @param callback - Callback function
   * @private
   */
  private _callbackWithRecord(record: CacheEntry, options: LookupOneOptions, callback: Function) {
    // All records use the unified structure with rotation
    if (record.records && Array.isArray(record.records)) {
      const records = record.records;
      const currentRecord = records[record.currentIndex % records.length];

      if (records.length > 1) {
        this._debugLog(
          `[dns-cache] Address rotation: using ${currentRecord.ip} (index ${
            record.currentIndex % records.length
          }/${records.length})`,
        );
      }

      // Rotate to next address for next call (if enabled)
      if (this.enableAddressRotation) {
        record.currentIndex = (record.currentIndex + 1) % records.length;
      }

      if (options.all) {
        return callback(null, [{ address: currentRecord.ip, family: currentRecord.family || 4 }]);
      }

      return callback(null, currentRecord.ip, currentRecord.family || 4);
    }

    // Should not reach here, all records should use records structure
    throw new Error('[dns_cache_error]: Invalid cache record structure');
  }

  async lookup(hostname: string): Promise<LookupAddress[]> {
    // handle localhost (some name servers may not resolve it)
    if (hostname === 'localhost') {
      this.logger.debug('[dns-cache] localhost lookup, bypassing cache');
      return [{ address: '127.0.0.1', family: 4 }];
    }
    if (!this._lookup) {
      throw new Error('DNS Resolver not initialized for lookup mode');
    }

    // Use { all: true } to get all addresses for rotation support
    const addresses = await this._lookup(hostname, {
      family: 4,
      all: true,
    });
    return addresses;
  }

  async resolve4(hostname: string): Promise<dns.RecordWithTtl[]> {
    // handle localhost (some name servers may not resolve it)
    if (hostname === 'localhost') {
      this.logger.debug('[dns-cache] localhost resolve, bypassing cache');
      return [
        {
          address: '127.0.0.1',
          ttl: Math.floor(Number.MAX_SAFE_INTEGER / 1000),
        },
      ]; // provide a default TTL
    }
    if (!this._resolve4) {
      throw new Error('DNS Resolver not initialized for resolve mode');
    }

    const addresses = await this._resolve4(hostname, {
      ttl: true,
    });
    return addresses;
  }

  /**
   * Update DNS cache with fresh resolution
   * Supports both dns.lookup and dns.resolve modes
   * @param hostname - The hostname to resolve
   * @private
   */
  private async _updateDNS(hostname: string): Promise<CacheEntry> {
    // Use dns.lookup
    if (!this.useResolver) {
      try {
        const addresses = await this.lookup(hostname);
        const addressArray = Array.isArray(addresses) ? addresses : [addresses];
        if (addressArray.length === 0) {
          throw new Error(`empty address for ${hostname}`);
        }
        const records: DnsCacheRecord[] = addressArray.map((addr, index) => ({
          ip: addr.address,
          family: addr.family || 4,
          ttl: this.dnsCacheLookupInterval,
          timestamp: Date.now(),
          index,
        }));

        const cacheEntry: CacheEntry = {
          records,
          currentIndex: 0,
        };
        this._dnsCache.set(hostname, cacheEntry);
        this.logger.info(
          `[dns-cache] dns.lookup succeeded for ${hostname}, resolved ${
            records.length
          } address(es): ${records.map((r) => r.ip).join(', ')}, TTL: ${this.dnsCacheLookupInterval}ms`,
        );
        return cacheEntry;
      } catch (err) {
        this._errorDNS(err, 'lookup', hostname);
        throw err;
      }
    }

    // Use dns.resolve
    try {
      const addresses = await this.resolve4(hostname);
      const addressArray = Array.isArray(addresses) ? addresses : [addresses];

      // Store all addresses with rotation index
      const records: DnsCacheRecord[] = addressArray.map((addr, index) => {
        const address = typeof addr === 'string' ? addr : addr.address;
        const ttlSeconds = addr && Number.isInteger(addr.ttl) && addr.ttl >= 0 ? addr.ttl : 0;
        if (ttlSeconds === 0) {
          this.logger.warn(`[dns-cache] Warning: TTL is 0 for ${hostname} address ${address}`);
        }
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
      const cacheEntry: CacheEntry = {
        records,
        currentIndex: 0,
      };
      this._dnsCache.set(hostname, cacheEntry);
      this.logger.info(
        `[dns-cache] dns.resolve4 succeeded for ${hostname}, resolved ${records.length} address(es): ${records
          .map((r) => `${r.ip} (TTL: ${r.ttl}ms)`)
          .join(', ')}`,
      );
      return cacheEntry;
    } catch (err) {
      this._errorDNS(err, 'resolve', hostname);
      throw err;
    }
  }

  /**
   * Debug DNS errors
   * @param err - Error object
   * @param mode - 'lookup' or 'resolve'
   * @private
   */
  private _errorDNS(err: any, mode: 'lookup' | 'resolve', hostname: string) {
    this.logger.error(
      `[dns-cache] error occurred when resolving ${hostname} with dns.${mode}: ${
        err && err.message ? err.message : err
      }`,
    );
  }

  /**
   * Clear the DNS cache
   * @param recreate - Whether to recreate the cache instance, default is false.
   *   If true, creates a new LRU instance even if cache already exists.
   */
  resetCache(recreate = false): void {
    this._debugLog(`[dns-cache] Resetting DNS cache (recreate: ${recreate})`);
    if (this._dnsCache) this._dnsCache.reset();
    if (recreate) {
      this._dnsCache = new LRU(this._maxCacheSize);
    }
  }

  /**
   * Get a specific hostname's single record from cache
   * @param hostname - Hostname to query
   * @return {DnsCacheRecord | null} cache record
   */
  getCacheRecord(hostname: string): DnsCacheRecord | null {
    const entry = this._dnsCache.get(hostname) as CacheEntry | undefined;
    if (entry && entry.records && Array.isArray(entry.records)) {
      return entry.records[entry.currentIndex % entry.records.length];
    }
    return null;
  }
}
