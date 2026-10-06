import type { IncomingHttpHeaders } from 'node:http';

import type { HTTPMethodMeta, PathParamMeta, QueriesParamMeta, QueryParamMeta } from '@eggjs/controller-decorator';
import { HTTPParamType } from '@eggjs/controller-decorator';
import { HTTPMethodRegister, type HTTPHandlerFunc } from '@eggjs/controller-runtime';

import { RequestUtils } from '../utils/RequestUtils.ts';
import { ServiceWorkerCookies } from './ServiceWorkerCookies.ts';
import type { ServiceWorkerFetchContext } from './ServiceWorkerFetchContext.ts';

/** Binds Fetch API requests and responses to HTTP controller methods. */
export class FetchHTTPMethodRegister extends HTTPMethodRegister {
  protected createHandler(methodMeta: HTTPMethodMeta, host: string | undefined): HTTPHandlerFunc {
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    // oxlint-disable-next-line no-this-alias
    const methodRegister = this;
    return async function (ctx: ServiceWorkerFetchContext, next: () => Promise<void>) {
      if (host && host !== ctx.host) {
        return await next();
      }
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
      const responseBeforeAdvice = ctx.response;
      const bodyBeforeAdvice = ctx.body;
      let invocationCompleted = false;
      let invocationResult: unknown;
      let responseAfterInvocation = responseBeforeAdvice;
      let bodyAfterInvocation = bodyBeforeAdvice;
      const writeResponse = (result: unknown) => {
        if (result instanceof Response) {
          ctx.response = result;
        } else {
          ctx.body = result;
        }
      };
      const result = await methodRegister.executeControllerAdvices(
        ctx,
        realObj,
        args,
        async (invocationThat, invocationArgs) => {
          invocationResult = await Reflect.apply(realMethod, invocationThat, invocationArgs);
          invocationCompleted = true;
          writeResponse(invocationResult);
          responseAfterInvocation = ctx.response;
          bodyAfterInvocation = ctx.body;
          return invocationResult;
        },
      );
      if (!invocationCompleted) {
        if (ctx.response === responseBeforeAdvice && ctx.body === bodyBeforeAdvice) {
          writeResponse(result);
        }
      } else if (
        result !== invocationResult &&
        ctx.response === responseAfterInvocation &&
        ctx.body === bodyAfterInvocation
      ) {
        writeResponse(result);
      }
    } as HTTPHandlerFunc;
  }
}
