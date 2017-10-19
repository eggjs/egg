'use strict';

const dns = require('dns');
const LRU = require('ylru');
const urlparse = require('url').parse;
const HttpClient = require('./httpclient');
const utility = require('utility');

const IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

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
    const hostname = parsed.hostname;

    // don't lookup when hostname is IP
    if (hostname && IP_REGEX.test(hostname)) {
      return callback(null, { url, args });
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
      const needUpdate = now - record.timestamp >= this.dnsCacheLookupInterval;
      if (needUpdate) {
        // make sure next request don't refresh dns query
        record.timestamp = now;
      }
      callback(null, {
        url: this._formatDnsLookupUrl(hostname, url, record.ip),
        args,
      });
      if (!needUpdate) {
        // no need to refresh dns record
        return;
      }
      // make sure not callback twice
      callback = null;
    }

    dns.lookup(hostname, { family: 4 }, (err, address) => {
      const logger = args.ctx ? args.ctx.coreLogger : this.app.coreLogger;
      if (err) {
        logger.warn('[dnscache_httpclient] dns lookup error: %s(%s) => %s', hostname, url, err);
        // no cache, return error
        return callback && callback(err);
      }

      logger.info('[dnscache_httpclient] dns lookup success: %s(%s) => %s', hostname, url, address);
      this.dnsCache.set(hostname, {
        timestamp: Date.now(),
        ip: address,
      });

      callback && callback(null, {
        url: this._formatDnsLookupUrl(hostname, url, address),
        args,
      });
    });
  }

  _formatDnsLookupUrl(host, url, address) {
    if (typeof url === 'string') {
      url = url.replace(host, address);
    } else {
      url = utility.assign({}, url);
      url.hostname = url.hostname.replace(host, address);
      if (url.host) {
        url.host = url.host.replace(host, address);
      }
    }
    return url;
  }
}

module.exports = DNSCacheHttpClient;
