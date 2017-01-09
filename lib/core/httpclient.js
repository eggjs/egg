'use strict';

const Agent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const urllib = require('urllib');

module.exports = app => {
  const HttpClient = app.config.httpclient.enableDNSCache ?
    require('./dnscache_httpclient') : urllib.HttpClient;

  const config = app.config.httpclient;

  return new HttpClient({
    app,
    agent: new Agent(config),
    httpsAgent: new HttpsAgent(config),
  });
};
