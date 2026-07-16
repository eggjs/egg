import type { IncomingHttpHeaders } from 'node:http';

import type { HTTPMethodMeta, PathParamMeta, QueriesParamMeta, QueryParamMeta } from '@eggjs/controller-decorator';
import { HTTPParamType } from '@eggjs/controller-decorator';
import { HTTPMethodRegister, type HTTPHandlerFunc } from '@eggjs/controller-runtime';
import { CONTROLLER_AOP_MIDDLEWARES } from '@eggjs/tegg-types';
import type { EggProtoImplClass } from '@eggjs/tegg-types';

import type { AbstractControllerAdvice } from '../mcp/AbstractControllerAdvice.ts';
import { RequestUtils } from '../utils/RequestUtils.ts';
import { ServiceWorkerCookies } from './ServiceWorkerCookies.ts';
import type { ServiceWorkerFetchContext } from './ServiceWorkerFetchContext.ts';

/**
 * The fetch host's HTTP method register: the shared skeleton lives in
 * the controller plugin runtime; this subclass binds the Fetch Request shape to
 * method args and writes the return value back as a Response.
 */
export class FetchHTTPMethodRegister extends HTTPMethodRegister {
  /**
   * `@Middleware(SomeAdvice)` advice classes are koa-style middlewares here, not
   * AOP around advices: resolve each into a middleware that wraps the handler and
   * runs `advice.middleware(ctx, next)`, mirroring {@link ServiceWorkerMcpRouter}.
   * The handler is innermost, so an advice reading `ctx.body` after `next()` sees
   * the controller's normalized return value.
   */
  protected getExtraMethodMiddlewares(): HTTPHandlerFunc[] {
    const adviceClasses = (this.proto.getMetaData(CONTROLLER_AOP_MIDDLEWARES) ??
      []) as EggProtoImplClass<AbstractControllerAdvice>[];
    return adviceClasses.map((clazz) => {
      return (async (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) => {
        const eggObj = await this.eggContainerFactory.getOrCreateEggObjectFromClazz(clazz);
        await (eggObj.obj as AbstractControllerAdvice).middleware(ctx, next);
      }) as HTTPHandlerFunc;
    });
  }

  protected createHandler(methodMeta: HTTPMethodMeta, host: string | undefined): HTTPHandlerFunc {
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    // oxlint-disable-next-line no-this-alias
    const methodRegister = this;
    return async function (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) {
      // if hosts is not empty and host is not matched, not execute
      if (host && host !== ctx.host) {
        return await next();
      }
      // HTTP decorator core implement
      // use controller metadata map http request to function arguments
      const eggObj = await methodRegister.eggContainerFactory.getOrCreateEggObject(
        methodRegister.proto,
        methodRegister.proto.name,
      );
      const realObj = eggObj.obj;
      const realMethod = realObj[methodMeta.name];
      const args: Array<object | string | string[]> = Array.from({
        length: methodArgsLength,
      });
      if (hasContext) {
        args[contextIndex!] = ctx;
      }
      for (const [index, param] of methodMeta.paramMap) {
        switch (param.type) {
          case HTTPParamType.BODY: {
            args[index] = await RequestUtils.getRequestBody(ctx.event.request);
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
            for (const [k, v] of ctx.event.request.headers.entries()) {
              headers[k] = v;
            }
            args[index] = headers;
            break;
          }
          case HTTPParamType.COOKIES: {
            args[index] = new ServiceWorkerCookies(ctx.event.request, ctx.responseHeaders);
            break;
          }
          case HTTPParamType.REQUEST: {
            args[index] = ctx.event.request;
            break;
          }
          default:
            throw new Error(
              `unsupported param type ${param.type} in method ${methodRegister.controllerMeta.controllerName}.${String(methodMeta.name)} under the service worker runtime`,
            );
        }
      }
      const res = await Reflect.apply(realMethod, realObj, args);
      if (res instanceof Response) {
        ctx.response = res;
      } else {
        ctx.body = res;
      }
    } as HTTPHandlerFunc;
  }
}
