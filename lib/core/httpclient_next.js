const debug = require('util').debuglog('egg:lib:core:httpclient_next');
const ms = require('humanize-ms');

const SSRF_HTTPCLIENT = Symbol('SSRF_HTTPCLIENT');

const mainNodejsVersion = parseInt(process.versions.node.split('.')[0]);
let HttpClient;
if (mainNodejsVersion >= 20) {
  // urllib@4 only works on Node.js >= 20
  try {
    HttpClient = require('urllib4').HttpClient;
    debug('urllib4 enable');
  } catch (err) {
    debug('require urllib4 error: %s', err);
  }
}
if (!HttpClient) {
  // fallback to urllib@3
  HttpClient = require('urllib-next').HttpClient;
  debug('urllib3 enable');
}

class HttpClientNext extends HttpClient {
  constructor(app, options) {
    normalizeConfig(app);
    options = options || {};
    options = {
      ...app.config.httpclient,
      ...options,
    };
    super({
      app,
      defaultArgs: options.request,
      allowH2: options.allowH2,
      // use on egg-security ssrf
      // https://github.com/eggjs/egg-security/blob/master/lib/extend/safe_curl.js#L11
      checkAddress: options.checkAddress,
      connect: options.connect,
    });
    this.app = app;
  }

  async request(url, options) {
    options = options || {};
    if (options.ctx && options.ctx.tracer) {
      options.tracer = options.ctx.tracer;
    } else {
      options.tracer = options.tracer || this.app.tracer;
    }
    return await super.request(url, options);
  }

  async curl(...args) {
    return await this.request(...args);
  }

  async safeCurl(url, options = {}) {
    if (!this[SSRF_HTTPCLIENT]) {
      const ssrfConfig = this.app.config.security.ssrf;
      if (ssrfConfig?.checkAddress) {
        options.checkAddress = ssrfConfig.checkAddress;
      } else {
        this.app.logger.warn('[egg-security] please configure `config.security.ssrf` first');
      }
      this[SSRF_HTTPCLIENT] = new HttpClientNext(this.app, {
        checkAddress: ssrfConfig.checkAddress,
      });
    }
    return await this[SSRF_HTTPCLIENT].request(url, options);
  }
}

function normalizeConfig(app) {
  const config = app.config.httpclient;
  if (typeof config.request.timeout === 'string') {
    config.request.timeout = ms(config.request.timeout);
  }
}

module.exports = HttpClientNext;
