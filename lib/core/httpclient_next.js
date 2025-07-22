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
    this.fixDispatcher(options);
    return await super.request(url, options);
  }

  async curl(...args) {
    return await this.request(...args);
  }

  fixDispatcher(options) {
    // https://github.com/nodejs/undici/blob/main/lib/core/request.js#L90
    // https://github.com/node-modules/urllib/blob/3.x/src/HttpClient.ts#L427
    if (mainNodejsVersion <= 18 && !options.dispatcher) {
      if (super.getDispatcher() === require('urllib-next').getGlobalDispatcher()) {
        // In a multi-version undici environment
        // the global dispatcher is the highest version of undici
        // which will conflict with the maxRedirects field and report an error
        // so we need to create it that use 5.x version
        options.dispatcher = new (require('urllib-next').Agent)();
      }
    }
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
    this.fixDispatcher(options);
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
