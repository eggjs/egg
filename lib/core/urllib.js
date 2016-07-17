'use strict';

const Agent = require('agentkeepalive');
const HttpsAgent = require('agentkeepalive').HttpsAgent;
const urllib = require('urllib');

module.exports = app => urllib.create({
  agent: new Agent(app.config.urllib),
  httpsAgent: new HttpsAgent(app.config.urllib),
});
