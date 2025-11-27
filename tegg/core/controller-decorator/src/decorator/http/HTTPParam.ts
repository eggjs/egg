import assert from 'node:assert';

import { ObjectUtils } from '@eggjs/tegg-common-util';
import { HTTPParamType } from '@eggjs/tegg-types';
import type { EggProtoImplClass, HTTPParamParams, HTTPQueriesParams, HTTPQueryParams } from '@eggjs/tegg-types';

import { HTTPInfoUtil } from '../../util/index.ts';
import { InjectContext } from '../Context.ts';

// TODO url params
// /foo/:id
// refactor HTTPQuery, HTTPBody, HTTPParam

/**
 * Inject the request body.
 *
 * @example
 * ```typescript
 * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo',
 *     method: HTTPMethodEnum.GET,
 *   })
 *   // POST /foo -H 'Content-Type: application/json' -d '{"foo": "bar"}'
 *   // body = { "foo": "bar" }
 *   async bar(@HTTPBody() body: any): Promise<void> {
 *     console.log(body);
 *   }
 * }
 * ```
 */
export function HTTPBody() {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.BODY, parameterIndex, controllerClazz, methodName);
  };
}

/**
 * Inject the request headers.
 *
 * @example
 * ```typescript
 * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPHeaders, type IncomingHttpHeaders } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo',
 *     method: HTTPMethodEnum.GET,
 *   })
 *   // GET /foo -H 'X-Custom: custom'
 *   // headers['x-custom'] = 'custom'
 *   async bar(@HTTPHeaders() headers: IncomingHttpHeaders): Promise<void> {
 *     console.log(headers);
 *   }
 * }
 * ```
 */
export function HTTPHeaders() {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.HEADERS, parameterIndex, controllerClazz, methodName);
  };
}

/**
 * Inject the request query string, the value is string type.
 *
 * @example
 * ```typescript
 * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo',
 *     method: HTTPMethodEnum.GET,
 *   })
 *   // GET /foo?user=asd
 *   // user = 'asd'
 *   async bar(@HTTPQuery() user?: string): Promise<void> {
 *     console.log(user);
 *   }
 * }
 * ```
 */
export function HTTPQuery(param?: HTTPQueryParams) {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    // if param.name is not set, use the argument name as the param name
    const name = param?.name || argNames[parameterIndex];
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.QUERY, parameterIndex, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

/**
 * Inject the request query strings, all value are Array type.
 *
 * @example
 * ```typescript
 * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQueries } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo',
 *     method: HTTPMethodEnum.GET,
 *   })
 *   // GET /foo?user=asd&user=fgh
 *   // user = ['asd', 'fgh']
 *   async bar(@HTTPQueries({ name: 'user' }) users?: string[]): Promise<void> {
 *     console.log(users);
 *   }
 * }
 * ```
 */
export function HTTPQueries(param?: HTTPQueriesParams) {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.QUERIES, parameterIndex, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

/**
 * Inject the request path parameter, the value is string type.
 *
 * @example
 * ```typescript
 * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo/:id',
 *     method: HTTPMethodEnum.GET,
 *   })
 *   // GET /foo/123
 *   // id = '123'
 *   async bar(@HTTPParam() id: string): Promise<void> {
 *     console.log(id);
 *   }
 * }
 * ```
 */
export function HTTPParam(param?: HTTPParamParams) {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    const argNames = ObjectUtils.getFunctionArgNameList(target[propertyKey]);
    const name = param?.name || argNames[parameterIndex];
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.PARAM, parameterIndex, controllerClazz, methodName);
    HTTPInfoUtil.setHTTPMethodParamName(name, parameterIndex, controllerClazz, methodName);
  };
}

/**
 * Inject the request object.
 *
 * @example
 * ```typescript
 * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPRequest } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo',
 *     method: HTTPMethodEnum.GET,
 *   })
 *   async bar(@HTTPRequest() request: Request): Promise<void> {
 *     console.log(request);
 *   }
 * }
 * ```
 */
export function HTTPRequest() {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    const [nodeMajor] = process.versions.node.split('.').map((v) => Number(v));
    assert(nodeMajor >= 16, `[controller/${target.name}] expect node version >=16, but now is ${nodeMajor}`);
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.REQUEST, parameterIndex, controllerClazz, methodName);
  };
}

/**
 * Inject the request cookies.
 *
 * @example
 * ```typescript
 * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPCookies, type Cookies } from 'egg';
 *
 * @HTTPController()
 * export class FooController {
 *   @HTTPMethod({
 *     path: '/foo',
 *     method: HTTPMethodEnum.GET,
 *   })
 *   // GET /foo -H 'Cookie: foo=bar; bar=baz'
 *   // cookies = cookies
 *   async bar(@HTTPCookies() cookies: Cookies): Promise<void> {
 *     console.log(cookies);
 *   }
 * }
 * ```
 */
export function HTTPCookies() {
  return function (target: any, propertyKey: PropertyKey, parameterIndex: number): void {
    assert.equal(
      typeof propertyKey,
      'string',
      `[controller/${target.name}] expect method name be typeof string, but now is ${String(propertyKey)}`,
    );
    const methodName = propertyKey as string;
    const controllerClazz = target.constructor as EggProtoImplClass;
    HTTPInfoUtil.setHTTPMethodParamType(HTTPParamType.COOKIES, parameterIndex, controllerClazz, methodName);
  };
}

export {
  /**
   * @example
   *
   * ```typescript
   * import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPContext, type Context } from 'egg';
   *
   * @HTTPController()
   * export class FooController {
   *   @HTTPMethod({
   *     path: '/foo',
   *     method: HTTPMethodEnum.GET,
   *   })
   * async bar(@HTTPContext() ctx: Context): Promise<void> {
   *   console.log(ctx);
   * }
   * ```
   */
  InjectContext as HTTPContext,
};
