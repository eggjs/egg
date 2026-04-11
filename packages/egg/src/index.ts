import Helper from './app/extend/helper.ts';
import { BaseContextClass } from './lib/core/base_context_class.ts';
import { startEgg, type SingleModeApplication, type SingleModeAgent } from './lib/start.ts';

// export extends
export { Helper };
export type {
  // keep compatible with egg v3
  Helper as IHelper,
};

// export types
export * from './lib/egg.ts';
export * from './lib/types.ts';
// export define functions
export * from './lib/define.ts';

// alias EggAppConfig to Config
export type {
  /**
   * Egg Application Config, can be injected into Proto, e.g. SingletonProto/ContextProto/HttpController.
   *
   * Usage:
   * ```ts
   * import { Inject, Config } from 'egg';
   *
   * @SingletonProto()
   * class FooService {
   *   @Inject()
   *   config: Config;
   *
   *   async bar() {
   *     console.log(this.config.env);
   *   }
   * }
   * ```
   * @since 4.1.0
   */
  EggAppConfig as Config,
} from './lib/types.ts';

export * from './lib/start.ts';

// export singleton
export { Singleton, type SingletonCreateMethod, type SingletonOptions } from '@eggjs/core';

// export errors
export * from './lib/error/index.ts';

// export loggers
export type { LoggerLevel, EggLogger, EggLogger as Logger } from 'egg-logger';

// export httpClients
export * from './lib/core/httpclient.ts';
export * from './lib/core/context_httpclient.ts';

// export utils
export { createTransparentProxy, type CreateTransparentProxyOptions } from './lib/core/utils.ts';

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

// export tegg decorators
export {
  AccessLevel,
  Acl,
  ObjectInitType,
  type ObjectInitTypeLike,
  type ObjectInfo,
  type MultiInstancePrototypeGetObjectsContext,
  QualifierUtil,
  type EggProtoImplClass,
  Inject,
  InjectOptional,
  EggQualifier,
  EggType,
  /**
   * @example
   * ```ts
   * import { HTTPContext, Context } from 'egg';
   *
   * @HTTPController()
   * export class FooController {
   *   @HTTPMethod({
   *     path: '/foo',
   *     method: HTTPMethodEnum.GET,
   *   })
   * async bar(@HTTPContext() ctx: Context, id: number): Promise<void> {
   *   console.log(ctx, id);
   * }
   * ```
   */
  HTTPContext,
  HTTPRequest,
  HTTPCookies,
  Cookies,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPBody,
  HTTPQuery,
  HTTPQueries,
  HTTPParam,
  HTTPHeaders,
  HTTPParamType,
  Host,
  Middleware,
  Event,
  EventContext,
  type EggObjectLifecycle,
  LifecycleDestroy,
  LifecycleInit,
  LifecyclePostConstruct,
  LifecyclePostInject,
  LifecyclePreDestroy,
  LifecyclePreInject,
  LifecyclePreLoad,
  SingletonProto,
  MultiInstanceProto,
  ContextProto,
  type ImplDecorator,
  QualifierImplDecoratorUtil,
  type EggObjectFactory,
  type IncomingHttpHeaders,
  BackgroundTaskHelper,
  type ContextEventBus,
  type EventBus,
  type Events,
  MetadataUtil,
} from '@eggjs/tegg';
