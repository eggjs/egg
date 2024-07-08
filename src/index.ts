/**
 * @namespace Egg
 */

import { BaseContextClass } from './lib/core/base_context_class.js';
import { startEgg } from './lib/start.js';

// export types
export * from './lib/egg.js';
export * from './lib/type.js';
export * from './lib/start.js';

/**
 * Start egg application with cluster mode
 * @since 1.0.0
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export { startCluster } from 'egg-cluster';

/**
 * Start egg application with single process mode
 * @since 1.0.0
 */
export const start = startEgg;

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
export const Controller = BaseContextClass;

/**
 * @member {Service} Egg#Service
 * @since 1.1.0
 */
export const Service = BaseContextClass;

/**
 * @member {Subscription} Egg#Subscription
 * @since 1.10.0
 */
export const Subscription = BaseContextClass;

/**
 * @member {BaseContextClass} Egg#BaseContextClass
 * @since 1.2.0
 */
export { BaseContextClass } from './lib/core/base_context_class.js';

/**
 * @member {Boot} Egg#Boot
 */
export { BaseHookClass as Boot } from './lib/core/base_hook_class.js';
