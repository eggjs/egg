'use strict';

const Agent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const urllib = require('urllib');

module.exports = app => {
  const HttpClient = app.config.urllib.enableDNSCache ?
    require('./dnscache_httpclient') : urllib.HttpClient;

  return new HttpClient({
    app,
    agent: new Agent(app.config.urllib),
    httpsAgent: new HttpsAgent(app.config.urllib),
  });
};
