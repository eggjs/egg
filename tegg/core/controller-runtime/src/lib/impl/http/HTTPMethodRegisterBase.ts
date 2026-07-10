import type { HTTPControllerMeta, HTTPMethodMeta } from '@eggjs/controller-decorator';
import type { EggPrototype } from '@eggjs/metadata';
import { Router } from '@eggjs/router';
import type { EggContainerFactory } from '@eggjs/tegg-runtime';
import { FrameworkErrorFormater } from 'egg-errors';
import pathToRegexp from 'path-to-regexp';

import { RouterConflictError } from '../../errors.ts';
import type { RootProtoManager, RootProtoRequestContext } from '../../RootProtoManager.ts';

const noop = () => {
  // ...
};

/**
 * Loosely-typed koa-style middleware so both the egg host (egg MiddlewareFunc)
 * and fetch-style hosts can flow through the shared skeleton.
 */
export type HTTPHandlerFunc = (ctx: any, next: () => Promise<void>) => Promise<void> | void;

/**
 * Host-agnostic HTTP method registration skeleton. Both routers derive from
 * `@eggjs/router`'s Router, so route registration / duplicate checking /
 * root-proto wiring is shared; only `createHandler` (how request I/O binds to
 * method args and how the return value is written back) differs per host.
 */
export abstract class HTTPMethodRegister {
  protected readonly router: Router;
  protected readonly checkRouters: Map<string, Router>;
  protected readonly controllerMeta: HTTPControllerMeta;
  protected readonly methodMeta: HTTPMethodMeta;
  protected readonly proto: EggPrototype;
  protected readonly eggContainerFactory: typeof EggContainerFactory;

  constructor(
    proto: EggPrototype,
    controllerMeta: HTTPControllerMeta,
    methodMeta: HTTPMethodMeta,
    router: Router,
    checkRouters: Map<string, Router>,
    eggContainerFactory: typeof EggContainerFactory,
  ) {
    this.proto = proto;
    this.controllerMeta = controllerMeta;
    this.router = router;
    this.methodMeta = methodMeta;
    this.checkRouters = checkRouters;
    this.eggContainerFactory = eggContainerFactory;
  }

  /** Bind the host request to method args and write the return value back. */
  protected abstract createHandler(methodMeta: HTTPMethodMeta, host: string | undefined): HTTPHandlerFunc;

  /** Host hook for extra method middlewares (e.g. the egg acl middleware). */
  protected getExtraMethodMiddlewares(): HTTPHandlerFunc[] {
    return [];
  }

  checkDuplicate(): void {
    // 1. check duplicate with host router
    this.checkDuplicateInRouter(this.router);

    // 2. check duplicate with host tegg controller
    let hostRouter: Router | undefined;
    const hosts = this.controllerMeta.getMethodHosts(this.methodMeta) || [];
    hosts.forEach((h) => {
      if (h) {
        hostRouter = this.checkRouters.get(h);
        if (!hostRouter) {
          hostRouter = new Router({ sensitive: true });
          this.checkRouters.set(h, hostRouter!);
        }
      }
      if (hostRouter) {
        this.checkDuplicateInRouter(hostRouter);
        this.registerToRouter(hostRouter);
      }
    });
  }

  private registerToRouter(router: Router) {
    const routerFunc = router[this.methodMeta.method.toLowerCase() as keyof Router] as Function;
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    Reflect.apply(routerFunc, router, [methodName, methodRealPath, noop]);
  }

  private checkDuplicateInRouter(router: Router) {
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const matched = router.match(methodRealPath, this.methodMeta.method);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    if (matched.route) {
      const [layer] = matched.path;
      const err = new RouterConflictError(
        `register http controller ${methodName} failed, ${this.methodMeta.method} ${methodRealPath} is conflict with exists rule ${layer.path}`,
      );
      throw FrameworkErrorFormater.format(err);
    }
  }

  /**
   * register method to router
   */
  register(rootProtoManager: RootProtoManager): void {
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    const routerFunc = this.router[this.methodMeta.method.toLowerCase() as keyof Router] as Function;
    const methodMiddlewares: HTTPHandlerFunc[] = this.controllerMeta.getMethodMiddlewares(this.methodMeta);
    methodMiddlewares.push(...this.getExtraMethodMiddlewares());
    const hosts = this.controllerMeta.getMethodHosts(this.methodMeta) ?? [undefined];
    hosts.forEach((host) => {
      const handler = this.createHandler(this.methodMeta, host);
      Reflect.apply(routerFunc, this.router, [methodName, methodRealPath, ...methodMiddlewares, handler]);
      // https://github.com/eggjs/egg-core/blob/0af6178022e7734c4a8b17bb56d592b315207883/lib/egg.js#L279
      const regExp = pathToRegexp(methodRealPath, {
        sensitive: true,
      });
      rootProtoManager.registerRootProto(
        this.methodMeta.method,
        (ctx: RootProtoRequestContext) => {
          if (regExp.test(ctx.path)) {
            return this.proto;
          }
        },
        host || '',
      );
    });
  }
}
