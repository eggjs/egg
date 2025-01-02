/**
 * @namespace Egg
 */

import { BaseContextClass } from './lib/core/base_context_class.js';
import { startEgg } from './lib/start.js';
import Helper from './app/extend/helper.js';

// export extends
export {
  Helper,
};
export type {
  // keep compatible with egg v3
  Helper as IHelper,
};

// export types
export * from './lib/egg.js';
export * from './lib/type.js';
export * from './lib/start.js';

// export errors
export * from './lib/error/index.js';

// export loggers
export type {
  LoggerLevel,
  EggLogger,
} from 'egg-logger';

// export httpClients
export * from './lib/core/httpclient.js';
export * from './lib/core/context_httpclient.js';

/**
 * Start egg application with cluster mode
 * @since 1.0.0
 */
export * from '@eggjs/cluster';

/**
 * Start egg application with single process mode
 * @since 1.0.0
 */
export {
  startEgg as start,
};

/**
 * @member {Application} Egg#Application
 * @since 1.0.0
 */
export { Application } from './lib/application.js';

/**
 * @member {Agent} Egg#Agent
 * @since 1.0.0
 */
export { Agent } from './lib/agent.js';

/**
 * @member {AppWorkerLoader} Egg#AppWorkerLoader
 * @since 1.0.0
 */

/**
 * @member {AgentWorkerLoader} Egg#AgentWorkerLoader
 * @since 1.0.0
 */

export { AppWorkerLoader, AgentWorkerLoader } from './lib/loader/index.js';

/**
 * @member {Controller} Egg#Controller
 * @since 1.1.0
 */
export {
  BaseContextClass as Controller,
};

/**
 * @member {Service} Egg#Service
 * @since 1.1.0
 */
export {
  BaseContextClass as Service,
};

/**
 * @member {Subscription} Egg#Subscription
 * @since 1.10.0
 */
export {
  BaseContextClass as Subscription,
};

/**
 * @member {BaseContextClass} Egg#BaseContextClass
 * @since 1.2.0
 */
export { BaseContextClass } from './lib/core/base_context_class.js';

/**
 * @member {Boot} Egg#Boot
 */
export { BaseHookClass as Boot } from './lib/core/base_hook_class.js';
