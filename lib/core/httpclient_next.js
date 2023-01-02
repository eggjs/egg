const { HttpClient } = require('urllib-next');
const ms = require('humanize-ms');

class HttpClientNext extends HttpClient {
  constructor(app) {
    normalizeConfig(app);
    const config = app.config.httpclient;
    super({
      app,
      defaultArgs: config.request,
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
}

function normalizeConfig(app) {
  const config = app.config.httpclient;
  if (typeof config.request.timeout === 'string') {
    config.request.timeout = ms(config.request.timeout);
  }
}

module.exports = HttpClientNext;
