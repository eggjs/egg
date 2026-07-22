import assert from 'node:assert';

import {
  HTTPParamType,
  type PathParamMeta,
  type QueriesParamMeta,
  type QueryParamMeta,
  Cookies,
  type HTTPMethodMeta,
} from '@eggjs/controller-decorator';
import { HTTPMethodRegister, type HTTPHandlerFunc } from '@eggjs/controller-runtime';
import { TimerUtil } from '@eggjs/tegg-common-util';
import type { MiddlewareFunc } from 'egg';

import { aclMiddlewareFactory } from './Acl.ts';
import { initRequest } from './Req.ts';

/** Binds Egg requests and responses to HTTP controller methods. */
export class EggHTTPMethodRegister extends HTTPMethodRegister {
  protected createHandler(methodMeta: HTTPMethodMeta, host: string | undefined): HTTPHandlerFunc {
    const argsLength = methodMeta.paramMap.size;
    const hasContext = methodMeta.contextParamIndex !== undefined;
    const contextIndex = methodMeta.contextParamIndex;
    const methodArgsLength = argsLength + (hasContext ? 1 : 0);
    const timeout = this.controllerMeta.getMethodTimeout(methodMeta);
    // oxlint-disable-next-line no-this-alias
    const methodRegister = this;
    const handler: MiddlewareFunc = async function (ctx, next) {
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
            args[index] = ctx.request.body;
            break;
          }
          case HTTPParamType.PARAM: {
            const pathParam: PathParamMeta = param as PathParamMeta;
            args[index] = ctx.params![pathParam.name];
            break;
          }
          case HTTPParamType.QUERY: {
            const queryParam: QueryParamMeta = param as QueryParamMeta;
            args[index] = ctx.query[queryParam.name];
            break;
          }
          case HTTPParamType.QUERIES: {
            const queryParam: QueriesParamMeta = param as QueriesParamMeta;
            args[index] = ctx.queries[queryParam.name];
            break;
          }
          case HTTPParamType.HEADERS: {
            args[index] = ctx.request.headers;
            break;
          }
          case HTTPParamType.REQUEST: {
            args[index] = initRequest(ctx);
            break;
          }
          case HTTPParamType.COOKIES: {
            args[index] = new Cookies(ctx, []);
            break;
          }
          default:
            assert.fail('never arrive');
        }
      }
      const responseBeforeAdvice = ctx.body;
      let invocationCompleted = false;
      let invocationResult: unknown;
      let responseAfterInvocation = responseBeforeAdvice;
      const writeResponse = (body: unknown) => {
        // https://github.com/koajs/koa/blob/master/lib/response.js#L88
        // ctx.status is set
        const explicitStatus = ctx.response._explicitStatus;

        if (
          // has body
          (body !== null && body !== undefined) ||
          // status is not set and has no body
          // code should by 204
          // https://github.com/koajs/koa/blob/master/lib/response.js#L140
          !explicitStatus
        ) {
          ctx.body = body;
        }
      };
      const result = await methodRegister.executeControllerAdvices(
        ctx,
        realObj,
        args,
        async (invocationThat, invocationArgs) => {
          try {
            invocationResult = await TimerUtil.timeout<unknown>(
              () => Reflect.apply(realMethod, invocationThat, invocationArgs),
              timeout,
            );
          } catch (e: any) {
            if (e instanceof TimerUtil.TimeoutError) {
              ctx.logger.error(`timeout after ${timeout}ms`);
              ctx.throw(500, 'timeout');
            }
            throw e;
          }
          invocationCompleted = true;
          writeResponse(invocationResult);
          responseAfterInvocation = ctx.body;
          return invocationResult;
        },
      );
      if (!invocationCompleted) {
        if (ctx.body === responseBeforeAdvice) {
          writeResponse(result);
        }
      } else if (result !== invocationResult && ctx.body === responseAfterInvocation) {
        writeResponse(result);
      }
    };
    return handler as HTTPHandlerFunc;
  }

  protected getExtraMethodMiddlewares(): HTTPHandlerFunc[] {
    const aclMiddleware = aclMiddlewareFactory(this.controllerMeta, this.methodMeta);
    return aclMiddleware ? [aclMiddleware as HTTPHandlerFunc] : [];
  }
}
