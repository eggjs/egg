const dns = require('dns').promises;
const LRU = require('ylru');
const HttpClient = require('./httpclient');
const utility = require('utility');
const utils = require('./utils');

const IP_REGEX = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const DNSLOOKUP = Symbol('DNSCacheHttpClient#dnslookup');
const UPDATE_DNS = Symbol('DNSCacheHttpClient#updateDNS');

class DNSCacheHttpClient extends HttpClient {
  constructor(app) {
    super(app);
    this.dnsCacheLookupInterval = this.app.config.httpclient.dnsCacheLookupInterval;
    this.dnsCache = new LRU(this.app.config.httpclient.dnsCacheMaxLength);
  }

  async request(url, args) {
    // disable dns cache in request by args handle
    if (args && args.enableDNSCache === false) {
      return await super.request(url, args);
    }
    const result = await this[DNSLOOKUP](url, args);
    return await super.request(result.url, result.args);
  }

  async [DNSLOOKUP](url, args) {
    let parsed;
    if (typeof url === 'string') {
      parsed = utils.safeParseURL(url);
      // invalid url or relative url
      if (!parsed) return { url, args };
    } else {
      parsed = url;
    }
    // hostname must exists
    const hostname = parsed.hostname;

    // don't lookup when hostname is IP
    if (hostname && IP_REGEX.test(hostname)) {
      return { url, args };
    }

    args = args || {};
    args.headers = args.headers || {};
    // set when host header doesn't exist
    if (!args.headers.host && !args.headers.Host) {
      // host must combine with hostname:port, node won't use `parsed.host`
      args.headers.host = parsed.port ? `${hostname}:${parsed.port}` : hostname;
    }

    const record = this.dnsCache.get(hostname);
    const now = Date.now();
    if (record) {
      if (now - record.timestamp >= this.dnsCacheLookupInterval) {
        // make sure the next request doesn't refresh dns query
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
      const { address } = await dns.lookup(hostname, { family: 4 });
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
