'use strict';

const dns = require('mz/dns');
const LRU = require('ylru');
const urlparse = require('url').parse;
const HttpClient = require('./httpclient');
const utility = require('utility');

const IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const DNSLOOKUP = Symbol('DNSCacheHttpClient#dnslookup');
const UPDATE_DNS = Symbol('DNSCacheHttpClient#updateDNS');

class DNSCacheHttpClient extends HttpClient {
  constructor(app) {
    super(app);
    this.dnsCacheLookupInterval = this.app.config.httpclient.dnsCacheLookupInterval;
    this.dnsCache = new LRU(this.app.config.httpclient.dnsCacheMaxLength);
  }

  request(url, args, callback) {
    // request(url, callback)
    if (typeof args === 'function') {
      callback = args;
      args = null;
    }

    // the callback style
    if (callback) {
      this.app.deprecate('[dnscache_httpclient] We now support async for this function, so callback isn\'t recommended.');
      this[DNSLOOKUP](url, args)
        .then(result => {
          return super.request(result.url, result.args);
        })
        .then(result => process.nextTick(() => callback(null, result.data, result.res)))
        .catch(err => process.nextTick(() => callback(err)));
      return;
    }

    // the Promise style
    return (async () => {
      const result = await this[DNSLOOKUP](url, args);
      return super.request(result.url, result.args);
    })();
  }

  curl(url, args, callback) {
    return this.request(url, args, callback);
  }

  requestThunk(url, args) {
    this.app.deprecate('[dnscache_httpclient] Please use `request()` instead of `requestThunk()`');
    return callback => {
      this.request(url, args, (err, data, res) => {
        if (err) {
          return callback(err);
        }
        callback(null, {
          data,
          status: res.status,
          headers: res.headers,
          res,
        });
      });
    };
  }

  async [DNSLOOKUP](url, args) {
    const parsed = typeof url === 'string' ? urlparse(url) : url;
    // hostname must exists
    const hostname = parsed.hostname;

    // don't lookup when hostname is IP
    if (hostname && IP_REGEX.test(hostname)) {
      return { url, args };
    }

    args = args || {};
    args.headers = args.headers || {};
    // set host header is not exists
    if (!args.headers.host && !args.headers.Host) {
      // host must combine with hostname:port, node won't use `parsed.host`
      args.headers.host = parsed.port ? `${hostname}:${parsed.port}` : hostname;
    }

    const record = this.dnsCache.get(hostname);
    const now = Date.now();
    if (record) {
      if (now - record.timestamp >= this.dnsCacheLookupInterval) {
        // make sure next request don't refresh dns query
        record.timestamp = now;
        this[UPDATE_DNS](hostname, args).catch(err => this.app.emit('error', err));
      }

      return { url: formatDnsLookupUrl(hostname, url, record.ip), args };
    }

    const address = await this[UPDATE_DNS](hostname, args);
    return { url: formatDnsLookupUrl(hostname, url, address), args };
  }

  async [UPDATE_DNS](hostname, args) {
    const logger = args.ctx ? args.ctx.coreLogger : this.app.coreLogger;
    try {
      const [ address ] = await dns.lookup(hostname, { family: 4 });
      logger.info('[dnscache_httpclient] dns lookup success: %s => %s',
        hostname, address);
      this.dnsCache.set(hostname, { timestamp: Date.now(), ip: address });
      return address;
    } catch (err) {
      err.message = `[dnscache_httpclient] dns lookup error: ${hostname} => ${err.message}`;
      throw err;
    }
  }

}

module.exports = DNSCacheHttpClient;

function formatDnsLookupUrl(host, url, address) {
  if (typeof url === 'string') return url.replace(host, address);
  const urlObj = utility.assign({}, url);
  urlObj.hostname = urlObj.hostname.replace(host, address);
  if (urlObj.host) {
    urlObj.host = urlObj.host.replace(host, address);
  }
  return urlObj;
}
