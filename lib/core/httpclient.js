'use strict';

const Agent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const urllib = require('urllib');
const ms = require('humanize-ms');

module.exports = app => {
  const HttpClient = app.config.httpclient.enableDNSCache ?
    require('./dnscache_httpclient') : urllib.HttpClient;

  const config = app.config.httpclient;

  // compatibility
  if (typeof config.keepAlive === 'boolean') {
    config.httpAgent.keepAlive = config.keepAlive;
    config.httpsAgent.keepAlive = config.keepAlive;
  }
  if (config.timeout) {
    config.timeout = ms(config.timeout);
    config.httpAgent.timeout = config.timeout;
    config.httpsAgent.timeout = config.timeout;
  }
  if (config.freeSocketKeepAliveTimeout) {
    config.freeSocketKeepAliveTimeout = ms(config.freeSocketKeepAliveTimeout);
    config.httpAgent.freeSocketKeepAliveTimeout = config.freeSocketKeepAliveTimeout;
    config.httpsAgent.freeSocketKeepAliveTimeout = config.freeSocketKeepAliveTimeout;
  }
  if (typeof config.maxSockets === 'number') {
    config.httpAgent.maxSockets = config.maxSockets;
    config.httpsAgent.maxSockets = config.maxSockets;
  }
  if (typeof config.maxFreeSockets === 'number') {
    config.httpAgent.maxFreeSockets = config.maxFreeSockets;
    config.httpsAgent.maxFreeSockets = config.maxFreeSockets;
  }

  if (config.httpAgent.timeout < 30000) {
    app.coreLogger.warn('[egg:httpclient] config.httpclient.httpAgent.timeout(%s) can\'t below 30000, auto reset to 30000',
      config.httpAgent.timeout);
    config.httpAgent.timeout = 30000;
  }
  if (config.httpsAgent.timeout < 30000) {
    app.coreLogger.warn('[egg:httpclient] config.httpclient.httpsAgent.timeout(%s) can\'t below 30000, auto reset to 30000',
      config.httpsAgent.timeout);
    config.httpsAgent.timeout = 30000;
  }

  if (typeof config.request.timeout === 'string') {
    config.request.timeout = ms(config.request.timeout);
  }

  return new HttpClient({
    app,
    defaultArgs: config.request,
    agent: new Agent(config.httpAgent),
    httpsAgent: new HttpsAgent(config.httpsAgent),
  });
};
