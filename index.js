'use strict';

/**
 * @namespace Egg
 */

/**
 * Start egg application with cluster mode
 * @since 1.0.0
 */
exports.startCluster = require('./lib/cluster/index').startCluster;

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
 * @member {AgentWorkerClient} Egg#AgentWorkerClient
 * @since 1.0.0
 */
exports.AgentWorkerClient = require('./lib/core/agent_worker_client');

/**
 * @member {AppWorkerClient} Egg#AppWorkerClient
 * @since 1.0.0
 */
exports.AppWorkerClient = require('./lib/core/app_worker_client');

/**
 * @member {MasterLoader} Egg#MasterLoader
 * @since 1.0.0
 */
exports.MasterLoader = require('./lib/core/loader').MasterLoader;

/**
 * @member {AppWorkerLoader} Egg#AppWorkerLoader
 * @since 1.0.0
 */
exports.AppWorkerLoader = require('./lib/core/loader').AppWorkerLoader;

/**
 * @member {AgentWorkerLoader} Egg#AgentWorkerLoader
 * @since 1.0.0
 */
exports.AgentWorkerLoader = require('./lib/core/loader').AgentWorkerLoader;

/**
 * @member {Service} Egg#Service
 * @since 1.0.0
 */
exports.Service = require('./lib/core/base_service');

/**
 * @member {Logger} Egg#console
 * @see Application#console
 * @since 1.0.0
 */
exports.console = require('./lib/core/console');
