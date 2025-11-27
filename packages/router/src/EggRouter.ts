import assert from 'node:assert';

import { singularize, pluralize } from 'inflection';
import { isGeneratorFunction } from 'is-type-of';
import methods from 'methods';
import { encodeURIComponent as safeEncodeURIComponent } from 'utility';

import { Layer } from './Layer.ts';
import { type RegisterOptions, Router, type RouterMethod, type RouterOptions } from './Router.ts';
import { type MiddlewareFunc, type Next, type ResourcesController } from './types.ts';

interface RestfulOptions {
  suffix?: string;
  namePrefix?: string;
  method: string | string[];
  member?: true;
}

const REST_MAP: Record<string, RestfulOptions> = {
  index: {
    suffix: '',
    method: 'GET',
  },
  new: {
    namePrefix: 'new_',
    member: true,
    suffix: 'new',
    method: 'GET',
  },
  create: {
    suffix: '',
    method: 'POST',
  },
  show: {
    member: true,
    suffix: ':id',
    method: 'GET',
  },
  edit: {
    member: true,
    namePrefix: 'edit_',
    suffix: ':id/edit',
    method: 'GET',
  },
  update: {
    member: true,
    namePrefix: '',
    suffix: ':id',
    method: ['PATCH', 'PUT'],
  },
  destroy: {
    member: true,
    namePrefix: 'destroy_',
    suffix: ':id',
    method: 'DELETE',
  },
};

interface Application {
  controller: Record<string, any>;
}

/**
 * FIXME: move these patch into @eggjs/router
 */
export class EggRouter extends Router {
  readonly app: Application;

  /**
   * @class
   * @param {Object} opts - Router options.
   * @param {Application} app - Application object.
   */
  constructor(opts: RouterOptions, app: Application) {
    super(opts);
    this.app = app;
  }

  verb(
    method: RouterMethod | RouterMethod[],
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middleware: (MiddlewareFunc | string)[]
  ): Router {
    const { path, middlewares, options } = this._formatRouteParams(nameOrPath, pathOrMiddleware, middleware);
    if (typeof method === 'string') {
      method = [method];
    }
    this.register(path, method, middlewares, options);
    return this;
  }

  // const METHODS = [ 'head', 'options', 'get', 'put', 'patch', 'post', 'delete', 'all' ];
  head(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  head(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  head(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb('head', nameOrPath, pathOrMiddleware, ...middlewares);
  }
  options(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  options(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router;
  options(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb('options', nameOrPath, pathOrMiddleware, ...middlewares);
  }
  get(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  get(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  get(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb('get', nameOrPath, pathOrMiddleware, ...middlewares);
  }
  put(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  put(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  put(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb('put', nameOrPath, pathOrMiddleware, ...middlewares);
  }
  patch(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  patch(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  patch(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb('patch', nameOrPath, pathOrMiddleware, ...middlewares);
  }
  post(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  post(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  post(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb('post', nameOrPath, pathOrMiddleware, ...middlewares);
  }
  delete(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  delete(
    name: string,
    path: string | RegExp | (string | RegExp)[],
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router;
  delete(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb('delete', nameOrPath, pathOrMiddleware, ...middlewares);
  }
  all(path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  all(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: (MiddlewareFunc | string)[]): Router;
  all(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: (MiddlewareFunc | string)[]
  ): Router {
    return this.verb(methods, nameOrPath, pathOrMiddleware, ...middlewares);
  }

  register(
    path: string | RegExp | (string | RegExp)[],
    methods: string[],
    middleware: MiddlewareFunc | string | (MiddlewareFunc | string | ResourcesController)[],
    opts?: RegisterOptions,
  ): Layer | Layer[] {
    // patch register to support bind ctx function middleware and string controller
    middleware = Array.isArray(middleware) ? middleware : [middleware];
    for (const mw of middleware) {
      if (isGeneratorFunction(mw)) {
        throw new TypeError(
          methods.toString() + ' `' + path + '`: Please use async function instead of generator function',
        );
      }
    }
    const middlewares = convertMiddlewares(middleware, this.app);
    return super.register(path, methods, middlewares, opts);
  }

  /**
   * restful router api
   * @param {String} name - Router name
   * @param {String} prefix - url prefix
   * @param {Function} middleware - middleware or controller
   * @example
   * ```js
   * app.resources('/posts', 'posts')
   * app.resources('posts', '/posts', 'posts')
   * app.resources('posts', '/posts', app.role.can('user'), app.controller.posts)
   * app.resources('posts', '/posts', middleware1, middleware2, app.controller.posts)
   * ```
   *
   * Examples:
   *
   * ```js
   * app.resources('/posts', 'posts')
   * ```
   *
   * yield router mapping
   *
   * Method | Path            | Route Name     | Controller.Action
   * -------|-----------------|----------------|-----------------------------
   * GET    | /posts          | posts          | app.controller.posts.index
   * GET    | /posts/new      | new_post       | app.controller.posts.new
   * GET    | /posts/:id      | post           | app.controller.posts.show
   * GET    | /posts/:id/edit | edit_post      | app.controller.posts.edit
   * POST   | /posts          | posts          | app.controller.posts.create
   * PATCH  | /posts/:id      | post           | app.controller.posts.update
   * DELETE | /posts/:id      | post           | app.controller.posts.destroy
   *
   * app.router.url can generate url based on arguments
   * ```js
   * app.router.url('posts')
   * => /posts
   * app.router.url('post', { id: 1 })
   * => /posts/1
   * app.router.url('new_post')
   * => /posts/new
   * app.router.url('edit_post', { id: 1 })
   * => /posts/1/edit
   * ```
   * @return {Router} return route object.
   * @since 1.0.0
   */
  resources(prefix: string, controller: string | ResourcesController): Router;
  resources(prefix: string, middleware: MiddlewareFunc, controller: string | ResourcesController): Router;
  resources(name: string, prefix: string, controller: string | ResourcesController): Router;
  resources(name: string, prefix: string, middleware: MiddlewareFunc, controller: string | ResourcesController): Router;
  resources(nameOrPath: string | RegExp, ...middleware: (MiddlewareFunc | string | ResourcesController)[]): Router;
  resources(
    nameOrPath: string | RegExp,
    pathOrMiddleware: string | RegExp | MiddlewareFunc | ResourcesController,
    ...middleware: (MiddlewareFunc | string | ResourcesController)[]
  ): Router {
    const { path, middlewares, options } = this._formatRouteParams(nameOrPath, pathOrMiddleware, middleware);
    // last argument is Controller object
    const controller = resolveController(middlewares.pop()!, this.app);
    for (const key in REST_MAP) {
      const action = controller[key] as MiddlewareFunc;
      if (!action) continue;

      const opts = REST_MAP[key];
      let routeName;
      if (opts.member) {
        routeName = singularize(options.name ?? '');
      } else {
        routeName = pluralize(options.name ?? '');
      }
      if (opts.namePrefix) {
        routeName = opts.namePrefix + routeName;
      }
      const prefix = (path as string).replace(/\/$/, '');
      const urlPath = opts.suffix ? `${prefix}/${opts.suffix}` : prefix;
      const method = Array.isArray(opts.method) ? opts.method : [opts.method];
      this.register(urlPath, method, middlewares.concat(action), {
        name: routeName,
      });
    }
    return this;
  }

  /**
   * @param {String} name - Router name
   * @param {Object} params - more parameters
   * @example
   * ```js
   * router.url('edit_post', { id: 1, name: 'foo', page: 2 })
   * => /posts/1/edit?name=foo&page=2
   * router.url('posts', { name: 'foo&1', page: 2 })
   * => /posts?name=foo%261&page=2
   * ```
   * @return {String} url by path name and query params.
   * @since 1.0.0
   */
  url(name: string, params?: Record<string, string | number | (string | number)[]>): string {
    const route = this.route(name);
    if (!route) return '';

    const args = params;
    let url = route.path;

    assert(!(url instanceof RegExp), `Can't get the url for regExp ${url} for by name '${name}'`);

    const queries = [];
    if (typeof args === 'object' && args !== null) {
      const replacedParams: string[] = [];
      url = url.replace(/:([a-zA-Z_]\w*)/g, ($0, key) => {
        if (key in args) {
          const values = args[key];
          replacedParams.push(key);
          return safeEncodeURIComponent(Array.isArray(values) ? String(values[0]) : String(values));
        }
        return $0;
      });

      for (const key in args) {
        if (replacedParams.includes(key)) {
          continue;
        }
        const values = args[key];
        const encodedKey = safeEncodeURIComponent(key);
        if (Array.isArray(values)) {
          for (const val of values) {
            queries.push(`${encodedKey}=${safeEncodeURIComponent(String(val))}`);
          }
        } else {
          queries.push(`${encodedKey}=${safeEncodeURIComponent(String(values))}`);
        }
      }
    }

    if (queries.length > 0) {
      const queryStr = queries.join('&');
      if (!url.includes('?')) {
        url = `${url}?${queryStr}`;
      } else {
        url = `${url}&${queryStr}`;
      }
    }

    return url;
  }

  /**
   * @alias to url()
   */
  pathFor(name: string, params?: Record<string, string | number | (string | number)[]>): string {
    return this.url(name, params);
  }
}

/**
 * resolve controller from string to function
 * @param {String|Function} controller input controller
 * @param {Application} app egg application instance
 */
function resolveController(controller: string | MiddlewareFunc | ResourcesController, app: Application) {
  if (typeof controller === 'string') {
    // resolveController('foo.bar.Home', app)
    const actions = controller.split('.');
    let obj = app.controller;
    actions.forEach((key) => {
      obj = obj[key];
      if (!obj) throw new Error(`app.controller.${controller} not exists`);
    });
    controller = obj as any;
  }
  // ensure controller is exists
  if (!controller) throw new Error('controller not exists');
  return controller as any;
}

/**
 * 1. ensure controller(last argument) support string
 * - [url, controller]: app.get('/home', 'home');
 * - [name, url, controller(string)]: app.get('posts', '/posts', 'posts.list');
 * - [name, url, controller]: app.get('posts', '/posts', app.controller.posts.list);
 * - [name, url(regexp), controller]: app.get('regRouter', /\/home\/index/, 'home.index');
 * - [name, url, middleware, [...], controller]: `app.get(/user/:id', hasLogin, canGetUser, 'user.show');`
 *
 * 2. bind ctx to controller `this`
 *
 * @param  {Array} middlewares middlewares and controller(last middleware)
 * @param  {Application} app  egg application instance
 */
function convertMiddlewares(middlewares: (MiddlewareFunc | string | ResourcesController)[], app: Application) {
  // ensure controller is resolved
  const controller = resolveController(middlewares.pop()!, app);
  function wrappedController(ctx: any, next: Next) {
    return controller.apply(ctx, [ctx, next]);
  }
  return [...(middlewares as MiddlewareFunc[]), wrappedController];
}
