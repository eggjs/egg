import { BaseContextClass } from './lib/core/base_context_class.ts';
import {
  startEgg,
  type SingleModeApplication,
  type SingleModeAgent,
} from './lib/start.ts';
import Helper from './app/extend/helper.ts';

// export extends
export { Helper };
export type {
  // keep compatible with egg v3
  Helper as IHelper,
};

// export types
export * from './lib/egg.ts';
export * from './lib/types.ts';
export * from './lib/start.ts';

// export singleton
export {
  Singleton,
  type SingletonCreateMethod,
  type SingletonOptions,
} from '@eggjs/core';

// export errors
export * from './lib/error/index.ts';

// export loggers
export type { LoggerLevel, EggLogger } from 'egg-logger';

// export httpClients
export * from './lib/core/httpclient.ts';
export * from './lib/core/context_httpclient.ts';

/**
 * Start egg application with cluster mode
 * @since 1.0.0
 */
export * from '@eggjs/cluster';

/**
 * Start egg application with single process mode
 * @since 1.0.0
 */
export { startEgg as start, type SingleModeApplication, type SingleModeAgent };

/**
 * @member {Application} Egg#Application
 * @since 1.0.0
 */
export { Application } from './lib/application.ts';

/**
 * @member {Agent} Egg#Agent
 * @since 1.0.0
 */
export { Agent } from './lib/agent.ts';

/**
 * @member {AppWorkerLoader} Egg#AppWorkerLoader
 * @since 1.0.0
 */

/**
 * @member {AgentWorkerLoader} Egg#AgentWorkerLoader
 * @since 1.0.0
 */

export { AppWorkerLoader, AgentWorkerLoader } from './lib/loader/index.ts';

/**
 * @member {Controller} Egg#Controller
 * @since 1.1.0
 */
export { BaseContextClass as Controller };

/**
 * @member {Service} Egg#Service
 * @since 1.1.0
 */
export { BaseContextClass as Service };

/**
 * @member {Subscription} Egg#Subscription
 * @since 1.10.0
 */
export { BaseContextClass as Subscription };

/**
 * @member {BaseContextClass} Egg#BaseContextClass
 * @since 1.2.0
 */
export { BaseContextClass } from './lib/core/base_context_class.ts';

/**
 * @member {Boot} Egg#Boot
 */
export { BaseHookClass as Boot } from './lib/core/base_hook_class.ts';
