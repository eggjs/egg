'use strict';

/**
 * @namespace Egg
 */

/**
 * Start egg application with cluster mode
 * @since 1.0.0
 */
exports.startCluster = require('egg-cluster').startCluster;

/**
 * @member {Application} Egg#Application
 * @since 1.0.0
 */
exports.Application = require('./lib/application');

/**
 * @member {Agent} Egg#Agent
 * @since 1.0.0
 */
exports.Agent = require('./lib/agent');

/**
 * @member {AppWorkerLoader} Egg#AppWorkerLoader
 * @since 1.0.0
 */
exports.AppWorkerLoader = require('./lib/loader').AppWorkerLoader;

/**
 * @member {AgentWorkerLoader} Egg#AgentWorkerLoader
 * @since 1.0.0
 */
exports.AgentWorkerLoader = require('./lib/loader').AgentWorkerLoader;
