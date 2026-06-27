import pathToRegexp from 'path-to-regexp';
import { FrameworkErrorFormater } from 'egg-errors';
import { Router as KoaRouter } from '@eggjs/router';
import {
  EggContext,
  HTTPControllerMeta,
  HTTPMethodMeta,
  HTTPParamType,
  IncomingHttpHeaders,
  Next,
  PathParamMeta,
  QueriesParamMeta,
  QueryParamMeta,
} from '@eggjs/tegg';
import type { EggProtoImplClass } from '@eggjs/tegg-types';
import { CONTROLLER_AOP_MIDDLEWARES, METHOD_AOP_MIDDLEWARES } from '@eggjs/tegg-types/controller-decorator';
import { EggContainerFactory, EggPrototype } from '@eggjs/tegg/helper';
import type { AbstractControllerAdvice } from '../mcp/AbstractControllerAdvice.ts';
import { RootProtoManager } from '../controller/RootProtoManager.ts';
import { ServiceWorkerFetchContext } from './ServiceWorkerFetchContext.ts';
import { RequestUtils } from '../utils/RequestUtils.ts';

const noop = () => { /* noop */ };

export class HTTPMethodRegister {
  private readonly router: KoaRouter;
  private readonly checkRouters: Map<string, KoaRouter>;
  private readonly controllerMeta: HTTPControllerMeta;
  private readonly methodMeta: HTTPMethodMeta;
  private readonly proto: EggPrototype;

  constructor(
    proto: EggPrototype,
    controllerMeta: HTTPControllerMeta,
    methodMeta: HTTPMethodMeta,
    router: KoaRouter,
    checkRouters: Map<string, KoaRouter>,
  ) {
    this.proto = proto;
    this.controllerMeta = controllerMeta;
    this.router = router;
    this.methodMeta = methodMeta;
    this.checkRouters = checkRouters;
  }

  private createHandler(methodMeta: HTTPMethodMeta, host: string | undefined) {
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    const self = this;
    return async function(ctx: ServiceWorkerFetchContext, next: Next) {
      // if hosts is not empty and host is not matched, not execute
      if (host && host !== ctx.host) {
        return await next();
      }
      // HTTP decorator core implement
      // use controller metadata map http request to function arguments
      const eggObj = await EggContainerFactory.getOrCreateEggObject(self.proto, self.proto.name);
      const realObj = eggObj.obj;
      const realMethod = realObj[methodMeta.name];
      const args: Array<object | string | string[]> = new Array(methodArgsLength);
      if (hasContext) {
        args[contextIndex!] = ctx;
      }
      for (const [ index, param ] of methodMeta.paramMap) {
        switch (param.type) {
          case HTTPParamType.BODY: {
            const request = ctx.event.request;
            args[index] = await RequestUtils.getRequestBody(request);
            break;
          }
          case HTTPParamType.PARAM: {
            const pathParam: PathParamMeta = param as PathParamMeta;
            args[index] = ctx.params[pathParam.name];
            break;
          }
          case HTTPParamType.QUERY: {
            const queryParam: QueryParamMeta = param as QueryParamMeta;
            args[index] = ctx.url.searchParams.get(queryParam.name) as string;
            break;
          }
          case HTTPParamType.QUERIES: {
            const queryParam: QueriesParamMeta = param as QueriesParamMeta;
            args[index] = ctx.url.searchParams.getAll(queryParam.name);
            break;
          }
          case HTTPParamType.HEADERS: {
            const headers: IncomingHttpHeaders = {};
            for (const [ k, v ] of ctx.event.request.headers.entries()) {
              headers[k] = v;
            }
            args[index] = headers;
            break;
          }
          case HTTPParamType.REQUEST: {
            args[index] = ctx.event.request;
            break;
          }
          default:
            throw new Error(`unknown param type ${param.type} in method ${self.controllerMeta.controllerName}.${methodMeta.name}`);
        }
      }
      const res = await Reflect.apply(realMethod, realObj, args);
      if (res instanceof Response) {
        ctx.response = res;
      } else {
        ctx.body = res;
      }
    };
  }

  checkDuplicate() {
    // 1. check duplicate with egg controller
    this.checkDuplicateInRouter(this.router);

    // 2. check duplicate with host tegg controller
    let hostRouter;
    const hosts = this.controllerMeta.getMethodHosts(this.methodMeta) || [];
    hosts.forEach(h => {
      if (h) {
        hostRouter = this.checkRouters.get(h);
        if (!hostRouter) {
          hostRouter = new KoaRouter({ sensitive: true });
          this.checkRouters.set(h, hostRouter);
        }
      }
      if (hostRouter) {
        this.checkDuplicateInRouter(hostRouter);
        this.registerToRouter(hostRouter);
      }
    });
  }

  private registerToRouter(router: KoaRouter) {
    const routerFunc = router[this.methodMeta.method.toLowerCase()];
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    Reflect.apply(routerFunc, router, [ methodName, methodRealPath, noop ]);
  }

  private checkDuplicateInRouter(router: KoaRouter) {
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const matched = router.match(methodRealPath, this.methodMeta.method);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    if (matched.route) {
      const [ layer ] = matched.path;
      const err = new Error(`register http controller ${methodName} failed, ${this.methodMeta.method} ${methodRealPath} is conflict with exists rule ${layer.path}`);
      throw FrameworkErrorFormater.format(err);
    }
  }

  private getAopMiddlewares(): Array<(ctx: ServiceWorkerFetchContext, next: Next) => Promise<void>> {
    // Controller-level AOP middlewares
    const controllerAopClasses = (this.proto.getMetaData(CONTROLLER_AOP_MIDDLEWARES) ?? []) as EggProtoImplClass<AbstractControllerAdvice>[];
    // Method-level AOP middlewares
    const methodAopMap = this.proto.getMetaData(METHOD_AOP_MIDDLEWARES) as Map<string, EggProtoImplClass<AbstractControllerAdvice>[]> | undefined;
    const methodAopClasses = methodAopMap?.get(this.methodMeta.name) ?? [];

    const allAopClasses = [ ...controllerAopClasses, ...methodAopClasses ];
    return allAopClasses.map(clazz => {
      return async (ctx: ServiceWorkerFetchContext, next: Next) => {
        const eggObj = await EggContainerFactory.getOrCreateEggObjectFromClazz(clazz);
        await (eggObj.obj as AbstractControllerAdvice).middleware(ctx, next);
      };
    });
  }

  register(rootProtoManager: RootProtoManager) {
    const methodRealPath = this.controllerMeta.getMethodRealPath(this.methodMeta);
    const methodName = this.controllerMeta.getMethodName(this.methodMeta);
    const routerFunc = this.router[this.methodMeta.method.toLowerCase()];
    const methodMiddlewares = this.controllerMeta.getMethodMiddlewares(this.methodMeta);
    const aopMiddlewares = this.getAopMiddlewares();

    const hosts = this.controllerMeta.getMethodHosts(this.methodMeta) || [ undefined ];
    hosts.forEach(h => {
      const handler = this.createHandler(this.methodMeta, h);
      Reflect.apply(routerFunc, this.router, [ methodName, methodRealPath, ...aopMiddlewares, ...methodMiddlewares, handler ]);
      // https://github.com/eggjs/egg-core/blob/0af6178022e7734c4a8b17bb56d592b315207883/lib/egg.js#L279
      const regExp = pathToRegexp(methodRealPath, { sensitive: true });
      rootProtoManager.registerRootProto(this.methodMeta.method, (ctx: EggContext) => {
        if (regExp.test(ctx.path)) {
          return this.proto;
        }
      }, h || '');
    });
  }
}
