'use strict';

const path = require('path');

module.exports = async (options = {}) => {

  options.baseDir = options.baseDir || process.cwd();
  options.mode = 'single';

  // get agent from options.framework and package.egg.framework
  if (!options.framework) {
    try {
      options.framework = require(path.join(options.baseDir, 'package.json')).egg.framework;
    } catch (_) {
      // ignore
    }
  }
  let Agent;
  let Application;
  if (options.framework) {
    Agent = require(options.framework).Agent;
    Application = require(options.framework).Application;
  } else {
    Application = require('./application');
    Agent = require('./agent');
  }

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
