/**
 * RESTful resource routing middleware for eggjs.
 */

import { debuglog } from 'node:util';
import assert from 'node:assert';
import compose from 'koa-compose';
import HttpError from 'http-errors';
import methods from 'methods';
import { Layer, type LayerURLOptions } from './Layer.ts';
import {
  type MiddlewareFunc,
  type MiddlewareFuncWithRouter,
  type Next,
  type ParamMiddlewareFunc,
  type ResourcesController,
} from './types.ts';

const debug = debuglog('egg/router:Router');

export type RouterMethod = (typeof methods)[0];

export interface RouterOptions {
  methods?: string[];
  prefix?: string;
  sensitive?: boolean;
  strict?: boolean;
  routerPath?: string;
}

export interface RegisterOptions {
  name?: string;
  prefix?: string;
  sensitive?: boolean;
  strict?: boolean;
  ignoreCaptures?: boolean;
  end?: boolean;
}

export interface AllowedMethodsOptions {
  throw?: boolean;
  notImplemented?: () => Error;
  methodNotAllowed?: () => Error;
}

export interface MatchedResult {
  // matched path
  path: Layer[];
  // matched path and method(including none method)
  pathAndMethod: Layer[];
  // method matched or not
  route: boolean;
}

export class Router {
  readonly opts: RouterOptions;
  readonly methods: string[];
  /** Layer stack */
  readonly stack: Layer[] = [];
  readonly params: Record<string, ParamMiddlewareFunc> = {};

  /**
   * Create a new router.
   *
   * @example
   *
   * Basic usage:
   *
   * ```javascript
   * var Koa = require('koa');
   * var Router = require('koa-router');
   *
   * var app = new Koa();
   * var router = new Router();
   *
   * router.get('/', (ctx, next) => {
   *   // ctx.router available
   * });
   *
   * app
   *   .use(router.routes())
   *   .use(router.allowedMethods());
   * ```
   *
   * @alias module:koa-router
   * @param {Object=} opts optional
   * @param {String=} opts.prefix prefix router paths
   * @class
   */
  constructor(opts?: RouterOptions) {
    this.opts = opts ?? {};
    this.methods = this.opts.methods ?? ['HEAD', 'OPTIONS', 'GET', 'PUT', 'PATCH', 'POST', 'DELETE'];
  }

  /**
   * Use given middleware.
   *
   * Middleware run in the order they are defined by `.use()`. They are invoked
   * sequentially, requests start at the first middleware and work their way
   * "down" the middleware stack.
   *
   * @example
   *
   * ```javascript
   * // session middleware will run before authorize
   * router
   *   .use(session())
   *   .use(authorize());
   *
   * // use middleware only with given path
   * router.use('/users', userAuth());
   *
   * // or with an array of paths
   * router.use(['/users', '/admin'], userAuth());
   *
   * app.use(router.routes());
   * ```
   *
   * @param {String=} path path string
   * @param {Function} middleware middleware function
   * @return {Router} router instance
   */
  use(...middlewares: MiddlewareFunc[]): Router;
  use(path: string | string[], ...middlewares: MiddlewareFunc[]): Router;
  use(pathOrMiddleware: string | string[] | MiddlewareFunc, ...middlewares: MiddlewareFunc[]): Router {
    // support array of paths
    // use(paths, ...middlewares)
    if (Array.isArray(pathOrMiddleware) && typeof pathOrMiddleware[0] === 'string') {
      for (const path of pathOrMiddleware) {
        this.use(path, ...middlewares);
      }
      return this;
    }

    let path = '';
    let hasPath = false;
    if (typeof pathOrMiddleware === 'string') {
      // use(path, ...middlewares)
      path = pathOrMiddleware;
      hasPath = true;
    } else if (typeof pathOrMiddleware === 'function') {
      // use(...middlewares)
      middlewares = [pathOrMiddleware, ...middlewares];
    }

    for (const m of middlewares as MiddlewareFuncWithRouter<Router>[]) {
      if (m.router) {
        for (const nestedLayer of m.router.stack) {
          if (path) {
            nestedLayer.setPrefix(path);
          }
          if (this.opts.prefix) {
            nestedLayer.setPrefix(this.opts.prefix);
          }
          this.stack.push(nestedLayer);
        }

        if (this.params) {
          for (const key in this.params) {
            m.router.param(key, this.params[key]);
          }
        }
      } else {
        this.register(path || '(.*)', [], m, { end: false, ignoreCaptures: !hasPath });
      }
    }

    return this;
  }

  /**
   * Set the path prefix for a Router instance that was already initialized.
   *
   * @example
   *
   * ```javascript
   * router.prefix('/things/:thing_id')
   * ```
   *
   * @param {String} prefix prefix string
   * @return {Router} router instance
   */
  prefix(prefix: string): Router {
    prefix = prefix.replace(/\/$/, '');
    this.opts.prefix = prefix;

    for (const layer of this.stack) {
      layer.setPrefix(prefix);
    }

    return this;
  }

  /**
   * Returns router middleware which dispatches a route matching the request.
   *
   * @return {Function} middleware function
   */
  routes(): MiddlewareFuncWithRouter<Router> {
    const dispatch = (ctx: any, next: Next) => {
      const routerPath: string = this.opts.routerPath || ctx.routerPath || ctx.path;
      const matched = this.match(routerPath, ctx.method);
      debug('dispatch: %s %s, routerPath: %s, matched: %s', ctx.method, ctx.path, routerPath, matched.route);

      if (ctx.matched) {
        (ctx.matched as Layer[]).push(...matched.path);
      } else {
        ctx.matched = matched.path;
      }
      ctx.router = this;

      if (!matched.route) {
        return next();
      }

      const matchedLayers = matched.pathAndMethod;
      const layerChain = matchedLayers.reduce<MiddlewareFunc[]>((memo, layer) => {
        memo.push((ctx, next) => {
          // ctx.captures = layer.captures(routerPath, ctx.captures);
          ctx.captures = layer.captures(routerPath);
          ctx.params = layer.params(routerPath, ctx.captures, ctx.params);
          // ctx._matchedRouteName & ctx._matchedRoute for compatibility
          ctx._matchedRouteName = ctx.routerName = layer.name;
          if (!layer.name) {
            ctx._matchedRouteName = undefined;
          }
          ctx._matchedRoute = ctx.routerPath = layer.path;
          return next();
        });
        return memo.concat(layer.stack);
      }, []);

      return compose(layerChain)(ctx, next);
    };

    dispatch.router = this;
    return dispatch;
  }

  /**
   * @alias to routes()
   */
  middleware(): MiddlewareFuncWithRouter<Router> {
    return this.routes();
  }

  /**
   * Returns separate middleware for responding to `OPTIONS` requests with
   * an `Allow` header containing the allowed methods, as well as responding
   * with `405 Method Not Allowed` and `501 Not Implemented` as appropriate.
   *
   * @example
   *
   * ```javascript
   * var Koa = require('koa');
   * var Router = require('koa-router');
   *
   * var app = new Koa();
   * var router = new Router();
   *
   * app.use(router.routes());
   * app.use(router.allowedMethods());
   * ```
   *
   * **Example with [Boom](https://github.com/hapijs/boom)**
   *
   * ```javascript
   * var Koa = require('koa');
   * var Router = require('koa-router');
   * var Boom = require('boom');
   *
   * var app = new Koa();
   * var router = new Router();
   *
   * app.use(router.routes());
   * app.use(router.allowedMethods({
   *   throw: true,
   *   notImplemented: () => new Boom.notImplemented(),
   *   methodNotAllowed: () => new Boom.methodNotAllowed()
   * }));
   * ```
   *
   * @param {Object=} options optional params
   * @param {Boolean=} options.throw throw error instead of setting status and header
   * @param {Function=} options.notImplemented throw the returned value in place of the default NotImplemented error
   * @param {Function=} options.methodNotAllowed throw the returned value in place of the default MethodNotAllowed error
   * @return {Function} middleware function
   */
  allowedMethods(options?: AllowedMethodsOptions): MiddlewareFunc {
    const implemented = this.methods;

    return async function allowedMethods(ctx: any, next: Next) {
      await next();
      if (ctx.status && ctx.status !== 404) return;

      const allowed: Record<string, string> = {};
      ctx.matched.forEach((route: Router) => {
        route.methods.forEach(method => {
          allowed[method] = method;
        });
      });
      const allowedMethods = Object.keys(allowed);

      if (!implemented.includes(ctx.method)) {
        if (options?.throw) {
          let notImplementedThrowable: Error;
          if (typeof options?.notImplemented === 'function') {
            notImplementedThrowable = options.notImplemented(); // set whatever the user returns from their function
          } else {
            notImplementedThrowable = new HttpError.NotImplemented();
          }
          throw notImplementedThrowable;
        } else {
          ctx.status = 501;
          ctx.set('Allow', allowedMethods.join(', '));
        }
      } else if (allowedMethods.length > 0) {
        if (ctx.method === 'OPTIONS') {
          ctx.status = 200;
          ctx.body = '';
          ctx.set('Allow', allowedMethods.join(', '));
        } else if (!allowed[ctx.method]) {
          if (options?.throw) {
            let notAllowedThrowable: Error;
            if (typeof options?.methodNotAllowed === 'function') {
              notAllowedThrowable = options.methodNotAllowed(); // set whatever the user returns from their function
            } else {
              notAllowedThrowable = new HttpError.MethodNotAllowed();
            }
            throw notAllowedThrowable;
          } else {
            ctx.status = 405;
            ctx.set('Allow', allowedMethods.join(', '));
          }
        }
      }
    };
  }

  /**
   * Redirect `source` to `destination` URL with optional 30x status `code`.
   *
   * Both `source` and `destination` can be route names.
   *
   * ```javascript
   * router.redirect('/login', 'sign-in');
   * ```
   *
   * This is equivalent to:
   *
   * ```javascript
   * router.all('/login', ctx => {
   *   ctx.redirect('/sign-in');
   *   ctx.status = 301;
   * });
   * ```
   *
   * @param {String} source URL or route name.
   * @param {String} destination URL or route name.
   * @param {Number=} status HTTP status code (default: 301).
   * @return {Router} router instance
   */
  redirect(source: string, destination: string, status: number = 301): Router {
    // lookup source route by name
    if (source[0] !== '/') {
      const routeUrl = this.url(source);
      if (routeUrl instanceof Error) {
        throw routeUrl;
      }
      source = routeUrl;
    }

    // lookup destination route by name
    if (destination[0] !== '/') {
      const routeUrl = this.url(destination);
      if (routeUrl instanceof Error) {
        throw routeUrl;
      }
      destination = routeUrl;
    }

    return this.all(source, ctx => {
      ctx.redirect(destination);
      ctx.status = status;
    });
  }

  /**
   * Create and register a route.
   *
   * @param {String|RegExp|(String|RegExp)[]} path Path string.
   * @param {String[]} methods Array of HTTP verbs.
   * @param {Function|Function[]} middleware Multiple middleware also accepted.
   * @param {Object} [opts] optional params
   * @private
   */
  register(
    path: string | RegExp | (string | RegExp)[],
    methods: string[],
    middleware: MiddlewareFunc | MiddlewareFunc[],
    opts?: RegisterOptions
  ): Layer | Layer[] {
    // support array of paths
    if (Array.isArray(path)) {
      const routes: Layer[] = [];
      for (const p of path) {
        const route = this.#register(p, methods, middleware, opts);
        routes.push(route);
      }
      return routes;
    }

    // create route
    const route = this.#register(path, methods, middleware, opts);
    return route;
  }

  #register(
    path: string | RegExp,
    methods: string[],
    middleware: MiddlewareFunc | MiddlewareFunc[],
    opts?: RegisterOptions
  ): Layer {
    opts = opts ?? {};
    // create route
    const route = new Layer(path, methods, middleware, {
      end: opts.end === false ? opts.end : true,
      name: opts.name,
      sensitive: opts.sensitive ?? this.opts.sensitive ?? false,
      strict: opts.strict ?? this.opts.strict ?? false,
      prefix: opts.prefix ?? this.opts.prefix ?? '',
      ignoreCaptures: opts.ignoreCaptures,
    });

    // FIXME: why???
    if (this.opts.prefix) {
      route.setPrefix(this.opts.prefix);
    }

    // add parameter middleware to the new route layer
    for (const param in this.params) {
      route.param(param, this.params[param]);
    }

    this.stack.push(route);
    return route;
  }

  /**
   * Lookup route with given `name`.
   *
   * @param {String} name route name
   * @return {Layer|false} layer instance of false
   */
  route(name: string): Layer | false {
    for (const route of this.stack) {
      if (route.name === name) {
        return route;
      }
    }
    return false;
  }

  /**
   * Generate URL for route. Takes a route name and map of named `params`.
   *
   * @example
   *
   * ```javascript
   * router.get('user', '/users/:id', (ctx, next) => {
   *   // ...
   * });
   *
   * router.url('user', 3);
   * // => "/users/3"
   *
   * router.url('user', { id: 3 });
   * // => "/users/3"
   *
   * router.use((ctx, next) => {
   *   // redirect to named route
   *   ctx.redirect(ctx.router.url('sign-in'));
   * })
   *
   * router.url('user', { id: 3 }, { query: { limit: 1 } });
   * // => "/users/3?limit=1"
   *
   * router.url('user', { id: 3 }, { query: "limit=1" });
   * // => "/users/3?limit=1"
   * ```
   */
  url(
    name: string,
    params?: string | number | object,
    ...paramsOrOptions: (string | number | object | LayerURLOptions)[]
  ): string | Error {
    const route = this.route(name);
    if (route) {
      return route.url(params, ...paramsOrOptions);
    }
    return new Error(`No route found for name: ${name}`);
  }

  /**
   * Generate URL from url pattern and given `params`.
   *
   * @example
   *
   * ```javascript
   * var url = Router.url('/users/:id', { id: 1 });
   * // => "/users/1"
   * ```
   *
   * @param {String} path url pattern
   * @param {Object} params url parameters
   * @return {String} url string
   */
  static url(
    path: string,
    params?: string | number | object,
    ...paramsOrOptions: (string | number | object | LayerURLOptions)[]
  ): string {
    return Layer.prototype.url.call({ path }, params, ...paramsOrOptions);
  }

  /**
   * Match given `path` and return corresponding routes.
   *
   * @param {String} path path string
   * @param {String} method method name
   * @return {Object.<path, pathAndMethod>} returns layers that matched path and
   * path and method.
   * @private
   */
  match(path: string, method: string): MatchedResult {
    const matched: MatchedResult = {
      // matched path
      path: [],
      // matched path and method(including none method)
      pathAndMethod: [],
      // method matched or not
      route: false,
    };

    for (const layer of this.stack) {
      debug('test %s %s', layer.path, layer.regexp);

      if (layer.match(path)) {
        matched.path.push(layer);

        if (layer.methods.length === 0 || layer.methods.includes(method)) {
          matched.pathAndMethod.push(layer);
          if (layer.methods.length > 0) {
            matched.route = true;
          }
        }
        // if (layer.methods.length === 0) {
        //   matched.pathAndMethod.push(layer);
        // } else if (layer.methods.includes(method)) {
        //   matched.pathAndMethod.push(layer);
        //   matched.route = true;
        // }
      }
    }

    return matched;
  }

  /**
   * Run middleware for named route parameters. Useful for auto-loading or
   * validation.
   *
   * @example
   *
   * ```javascript
   * router
   *   .param('user', (id, ctx, next) => {
   *     ctx.user = users[id];
   *     if (!ctx.user) return ctx.status = 404;
   *     return next();
   *   })
   *   .get('/users/:user', ctx => {
   *     ctx.body = ctx.user;
   *   })
   *   .get('/users/:user/friends', ctx => {
   *     return ctx.user.getFriends().then(function(friends) {
   *       ctx.body = friends;
   *     });
   *   })
   *   // /users/3 => {"id": 3, "name": "Alex"}
   *   // /users/3/friends => [{"id": 4, "name": "TJ"}]
   * ```
   *
   * @param {String} param param
   * @param {Function} middleware route middleware
   * @return {Router} instance
   */
  param(param: string, middleware: ParamMiddlewareFunc): Router {
    this.params[param] = middleware;
    for (const route of this.stack) {
      route.param(param, middleware);
    }
    return this;
  }

  protected _formatRouteParams(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc | ResourcesController,
    middlewares: (MiddlewareFunc | string | ResourcesController)[]
  ): {
    path: string | RegExp | (string | RegExp)[];
    middlewares: (MiddlewareFunc | string | ResourcesController)[];
    options: RegisterOptions;
  } {
    const options: RegisterOptions = {};
    let path: string | RegExp | (string | RegExp)[];
    if (typeof nameOrPath === 'string' && nameOrPath.startsWith('/')) {
      // verb(method, path, ...middlewares)
      path = nameOrPath;
      middlewares = [pathOrMiddleware as string, ...middlewares];
      if (typeof pathOrMiddleware === 'string') {
        // verb(method, path, controllerString)
        // set controller name to router name
        options.name = pathOrMiddleware;
      }
    } else if (nameOrPath instanceof RegExp) {
      // verb(method, pathRegex, ...middlewares)
      path = nameOrPath;
      middlewares = [pathOrMiddleware as string, ...middlewares];
      if (typeof pathOrMiddleware === 'string') {
        // verb(method, pathRegex, controllerString)
        // set controller name to router name
        options.name = pathOrMiddleware;
      }
    } else if (Array.isArray(nameOrPath)) {
      // verb(method, paths, ...middlewares)
      path = nameOrPath;
      middlewares = [pathOrMiddleware as string, ...middlewares];
      if (typeof pathOrMiddleware === 'string') {
        // verb(method, pathRegex, controllerString)
        // set controller name to router name
        options.name = pathOrMiddleware;
      }
    } else if (typeof pathOrMiddleware === 'string' || pathOrMiddleware instanceof RegExp) {
      // verb(method, name, path, ...middlewares)
      path = pathOrMiddleware;
      assert(typeof nameOrPath === 'string', 'route name should be string');
      options.name = nameOrPath;
    } else if (Array.isArray(pathOrMiddleware)) {
      // verb(method, name, paths, ...middlewares)
      path = pathOrMiddleware;
      assert(typeof nameOrPath === 'string', 'route name should be string');
      options.name = nameOrPath;
    } else {
      // verb(method, path, ...middlewares)
      path = nameOrPath;
      middlewares = [pathOrMiddleware, ...middlewares];
    }
    return {
      path,
      middlewares,
      options,
    };
  }

  /**
   * Create `router.verb()` methods, where *verb* is one of the HTTP verbs such
   * as `router.get()` or `router.post()`.
   *
   * Match URL patterns to callback functions or controller actions using `router.verb()`,
   * where **verb** is one of the HTTP verbs such as `router.get()` or `router.post()`.
   *
   * Additionally, `router.all()` can be used to match against all methods.
   *
   * ```javascript
   * router
   *   .get('/', (ctx, next) => {
   *     ctx.body = 'Hello World!';
   *   })
   *   .post('/users', (ctx, next) => {
   *     // ...
   *   })
   *   .put('/users/:id', (ctx, next) => {
   *     // ...
   *   })
   *   .del('/users/:id', (ctx, next) => {
   *     // ...
   *   })
   *   .all('/users/:id', (ctx, next) => {
   *     // ...
   *   });
   * ```
   *
   * When a route is matched, its path is available at `ctx._matchedRoute` and if named,
   * the name is available at `ctx._matchedRouteName`
   *
   * Route paths will be translated to regular expressions using
   * [path-to-regexp](https://github.com/pillarjs/path-to-regexp).
   *
   * Query strings will not be considered when matching requests.
   *
   * #### Named routes
   *
   * Routes can optionally have names. This allows generation of URLs and easy
   * renaming of URLs during development.
   *
   * ```javascript
   * router.get('user', '/users/:id', (ctx, next) => {
   *  // ...
   * });
   *
   * router.url('user', 3);
   * // => "/users/3"
   * ```
   *
   * #### Multiple middleware
   *
   * Multiple middleware may be given:
   *
   * ```javascript
   * router.get(
   *   '/users/:id',
   *   (ctx, next) => {
   *     return User.findOne(ctx.params.id).then(function(user) {
   *       ctx.user = user;
   *       next();
   *     });
   *   },
   *   ctx => {
   *     console.log(ctx.user);
   *     // => { id: 17, name: "Alex" }
   *   }
   * );
   * ```
   *
   * ### Nested routers
   *
   * Nesting routers is supported:
   *
   * ```javascript
   * var forums = new Router();
   * var posts = new Router();
   *
   * posts.get('/', (ctx, next) => {...});
   * posts.get('/:pid', (ctx, next) => {...});
   * forums.use('/forums/:fid/posts', posts.routes(), posts.allowedMethods());
   *
   * // responds to "/forums/123/posts" and "/forums/123/posts/123"
   * app.use(forums.routes());
   * ```
   *
   * #### Router prefixes
   *
   * Route paths can be prefixed at the router level:
   *
   * ```javascript
   * var router = new Router({
   *   prefix: '/users'
   * });
   *
   * router.get('/', ...); // responds to "/users"
   * router.get('/:id', ...); // responds to "/users/:id"
   * ```
   *
   * #### URL parameters
   *
   * Named route parameters are captured and added to `ctx.params`.
   *
   * ```javascript
   * router.get('/:category/:title', (ctx, next) => {
   *   console.log(ctx.params);
   *   // => { category: 'programming', title: 'how-to-node' }
   * });
   * ```
   *
   * The [path-to-regexp](https://github.com/pillarjs/path-to-regexp) module is
   * used to convert paths to regular expressions.
   *
   */
  verb(
    method: string | string[],
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middleware: MiddlewareFunc[]
  ): Router {
    const { options, path, middlewares } = this._formatRouteParams(nameOrPath, pathOrMiddleware, middleware);
    if (typeof method === 'string') {
      method = [method];
    }
    this.register(path, method, middlewares as MiddlewareFunc[], options);
    return this;
  }

  /**
   * Register route with all methods.
   *
   * @param {String} name Optional.
   * @param {String} path path string
   * @param {Function=} middleware You may also pass multiple middleware.
   * @return {Router} router instance
   * @private
   */
  all(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  all(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  all(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb(methods, nameOrPath, pathOrMiddleware, ...middlewares);
  }

  // "acl", "bind", "checkout", "connect", "copy", "delete", "get", "head", "link", "lock",
  // "m-search", "merge", "mkactivity", "mkcalendar", "mkcol", "move", "notify", "options",
  // "patch", "post", "propfind", "proppatch", "purge", "put", "rebind", "report", "search",
  // "source", "subscribe", "trace", "unbind", "unlink", "unlock", "unsubscribe"
  acl(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  acl(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  acl(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('acl', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  bind(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  bind(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  bind(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('bind', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  checkout(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  checkout(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  checkout(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('checkout', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  connect(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  connect(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  connect(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('connect', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  copy(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  copy(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  copy(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('copy', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  delete(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  delete(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  delete(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('delete', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  /** Alias for `router.delete()` because delete is a reserved word */
  del(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  del(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  del(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('delete', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  get(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  get(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  get(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('get', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  query(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  query(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  query(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('query', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  head(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  head(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  head(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('head', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  link(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  link(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  link(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('link', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  lock(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  lock(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  lock(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('lock', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  ['m-search'](path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  ['m-search'](name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  ['m-search'](
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('m-search', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  merge(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  merge(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  merge(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('merge', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  mkactivity(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  mkactivity(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  mkactivity(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('mkactivity', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  mkcalendar(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  mkcalendar(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  mkcalendar(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('mkcalendar', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  mkcol(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  mkcol(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  mkcol(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('mkcol', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  move(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  move(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  move(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('move', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  notify(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  notify(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  notify(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('notify', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  options(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  options(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  options(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('options', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  patch(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  patch(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  patch(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('patch', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  post(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  post(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  post(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('post', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  propfind(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  propfind(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  propfind(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('propfind', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  proppatch(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  proppatch(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  proppatch(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('proppatch', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  purge(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  purge(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  purge(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('purge', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  put(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  put(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  put(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('put', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  rebind(path: string | RegExp, ...middlewares: MiddlewareFunc[]): Router;
  rebind(name: string, path: string | RegExp, ...middlewares: MiddlewareFunc[]): Router;
  rebind(
    nameOrPath: string | RegExp,
    pathOrMiddleware: string | RegExp | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('rebind', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  report(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  report(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  report(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('report', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  search(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  search(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  search(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('search', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  source(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  source(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  source(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('source', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  subscribe(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  subscribe(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  subscribe(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('subscribe', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  trace(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  trace(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  trace(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('trace', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  unbind(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unbind(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unbind(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('unbind', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  unlink(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unlink(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unlink(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('unlink', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  unlock(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unlock(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unlock(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('unlock', nameOrPath, pathOrMiddleware, ...middlewares);
  }

  unsubscribe(path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unsubscribe(name: string, path: string | RegExp | (string | RegExp)[], ...middlewares: MiddlewareFunc[]): Router;
  unsubscribe(
    nameOrPath: string | RegExp | (string | RegExp)[],
    pathOrMiddleware: string | RegExp | (string | RegExp)[] | MiddlewareFunc,
    ...middlewares: MiddlewareFunc[]
  ): Router {
    return this.verb('unsubscribe', nameOrPath, pathOrMiddleware, ...middlewares);
  }
}
