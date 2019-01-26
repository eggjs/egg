'use strict';

const detectPort = require('detect-port');
const Application = require('./application');
const Agent = require('./agent');

module.exports = async (options = {}) => {
  options.baseDir = options.baseDir || process.cwd();
  options.singleProcess = true;
  if (options.env) {
    process.env.EGG_SERVER_ENV = options.env;
  }
  // FIXME: cluster-client support single process mode
  options.clusterPort = await detectPort();
  const agent = new Agent(Object.assign({}, options));
  await agent.ready();
  const application = new Application(Object.assign({}, options));
  application.agent = agent;
  agent.application = application;
  await application.ready();

  // emit egg-ready message in agent and application
  application.messenger.broadcast('egg-ready');

  return application;
};
