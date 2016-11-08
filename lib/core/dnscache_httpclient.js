'use strict';

const dns = require('dns');
const urlparse = require('url').parse;
const urllib = require('urllib');

class DNSCacheHttpClient extends urllib.HttpClient {
  constructor(options) {
    super(options);

    this.app = options.app;
    this.dnsCacheMaxAge = 10000;
    this.dnsCache = new Map();
  }

  request(url, args, callback) {
    // request(url, callback)
    if (typeof args === 'function') {
      callback = args;
      args = null;
    }

    // the callback style
    if (callback) {
      this._dnsLookup(url, args, (err, result) => {
        if (err) return callback(err);
        super.request(result.url, result.args, callback);
      });
      return;
    }

    // the Promise style
    return new Promise((resolve, reject) => {
      this._dnsLookup(url, args, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    }).then(result => super.request(result.url, result.args));
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

  _dnsLookup(url, args, callback) {
    const parsed = typeof url === 'string' ? urlparse(url) : url;
    // hostname must exists
    const host = parsed.hostname;
    args = args || {};
    args.headers = args.headers || {};
    // set host header is not exists
    if (!args.headers.host && !args.headers.Host) {
      args.headers.host = host;
    }

    const record = this.dnsCache.get(host);
    const now = Date.now();
    if (record) {
      const needUpdate = now - record.timestamp >= this.dnsCacheMaxAge;
      if (needUpdate) {
        // make sure next request don't refresh dns query
        record.timestamp = now;
      }
      callback(null, {
        url: this._formatDnsLookupUrl(host, url, record.ip),
        args,
      });
      if (!needUpdate) {
        // no need to refresh dns record
        return;
      }
      // make sure not callback twice
      callback = null;
    }

    dns.lookup(host, { family: 4 }, (err, address) => {
      const logger = args.ctx ? args.ctx.coreLogger : this.app.coreLogger;
      if (err) {
        logger.warn('[dnscache_httpclient] dns lookup error: %s(%s) => %s', host, url, err);
        // no cache, return error
        return callback && callback(err);
      }

      logger.info('[dnscache_httpclient] dns lookup success: %s(%s) => %s', host, url, address);
      this.dnsCache.set(host, {
        timestamp: Date.now(),
        ip: address,
      });

      callback && callback(null, {
        url: this._formatDnsLookupUrl(host, url, address),
        args,
      });
    });
  }

  _formatDnsLookupUrl(host, url, address) {
    if (typeof url === 'string') {
      url = url.replace(host, address);
    } else {
      url.hostname = url.hostname.replace(host, address);
      if (url.host) {
        url.host = url.host.replace(host, address);
      }
    }
    return url;
  }
}

module.exports = DNSCacheHttpClient;
