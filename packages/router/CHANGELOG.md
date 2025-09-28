# Changelog

## [3.0.6](https://github.com/eggjs/router/compare/v3.0.5...v3.0.6) (2025-03-27)


### Bug Fixes

* resources should support multiple middlewares ([#21](https://github.com/eggjs/router/issues/21)) ([acb9c4b](https://github.com/eggjs/router/commit/acb9c4b3e91f7cad0f9605e3a2ca5e68dad270b9))

## [3.0.5](https://github.com/eggjs/egg-router/compare/v3.0.4...v3.0.5) (2024-06-16)


### Bug Fixes

* should support urls with controller string ([#15](https://github.com/eggjs/egg-router/issues/15)) ([b645095](https://github.com/eggjs/egg-router/commit/b6450955716eb7d965c357058cf5b93f9e49353f))

## [3.0.4](https://github.com/eggjs/egg-router/compare/v3.0.3...v3.0.4) (2024-06-16)


### Bug Fixes

* should bind ctx to egg router controller this context ([#14](https://github.com/eggjs/egg-router/issues/14)) ([b5b5588](https://github.com/eggjs/egg-router/commit/b5b55887b90e77f2f19033c814b604301a6308e2))

## [3.0.3](https://github.com/eggjs/egg-router/compare/v3.0.2...v3.0.3) (2024-06-16)


### Bug Fixes

* debug keyword use package.name + filename ([#13](https://github.com/eggjs/egg-router/issues/13)) ([3882819](https://github.com/eggjs/egg-router/commit/38828192d453234fe93bf4f23e1f1271645e4c85))

## [3.0.2](https://github.com/eggjs/egg-router/compare/v3.0.1...v3.0.2) (2024-06-16)


### Bug Fixes

* support router.verb(method, path, controllerString) ([#12](https://github.com/eggjs/egg-router/issues/12)) ([34cea74](https://github.com/eggjs/egg-router/commit/34cea74a52a6651b5a5b30c4b2aee1c0776477a2))

## [3.0.1](https://github.com/eggjs/egg-router/compare/v3.0.0...v3.0.1) (2024-06-15)


### Bug Fixes

* export types like ResourcesController ([#11](https://github.com/eggjs/egg-router/issues/11)) ([83d3309](https://github.com/eggjs/egg-router/commit/83d3309f7434bbd9a5f85efc5b52fa34dd0fe81d))

## [3.0.0](https://github.com/eggjs/egg-router/compare/v2.0.1...v3.0.0) (2024-06-11)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

- Drop generator function support
- Drop Node.js < 18.19.0 support

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced `EggRouter` class for defining RESTful routes and handling
HTTP verbs.
- Added new utility functions and type definitions to support enhanced
routing and middleware functionalities.

- **Bug Fixes**
- Updated test cases to ensure compatibility with new routing and
middleware functionalities.

- **Documentation**
- Updated examples in the `README.md` to reflect TypeScript syntax and
ES module imports.
- Mentioned breaking changes for version 3, including dropping support
for generator functions and Node.js versions below 18.7.0.

- **Breaking Changes**
  - Dropped support for generator functions.
  - Dropped support for Node.js versions below 18.7.0.

- **Chores**
  - Updated Node.js versions in the GitHub Actions workflow.
  - Modified `.gitignore` to include additional patterns.
  - Updated dependencies and dev dependencies in `package.json`.
- Added new scripts for linting, testing, and pre-publish actions in
`package.json`.
  - Introduced a new `tsconfig.json` for strict TypeScript settings.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both ([#10](https://github.com/eggjs/egg-router/issues/10)) ([55149bc](https://github.com/eggjs/egg-router/commit/55149bc871def88d190e856e81cb9a48f18f3979))

2.0.1 / 2021-07-12
==================

**fixes**
  * [[`2c44ec0`](http://github.com/eggjs/egg-router/commit/2c44ec0bdeff1e8f46d899ed4386d1e28a93a854)] - fix: ensure ctx._matchedRoute and ctx._matchedRouteName to be correct (#7) (Yiyu He <<dead_horse@qq.com>>)

2.0.0 / 2019-02-14
==================

**features**
  * [[`f0b29ec`](https://github.com/eggjs/egg-router/commit/f0b29ec34df32ba9d872f6318f4febd2b4ef9359)] - refactor: use class instead prototype (#4) (fengmk2 <<fengmk2@gmail.com>>)

1.2.0 / 2019-02-13
==================

**features**
  * [[`1a0036a`](http://github.com/eggjs/egg-router/commit/1a0036a64a023b6b7993fecffe8062d5d0150971)] - feat: add routerPath to respond to routerName (#2) (Khaidi Chu <<i@2333.moe>>)

**others**
  * [[`ff723fd`](http://github.com/eggjs/egg-router/commit/ff723fd03630ec49d5fe861abf129a583d214d22)] - chore: add koa-router license (#3) (fengmk2 <<fengmk2@gmail.com>>)

1.1.0 / 2019-01-30
==================

**features**
  * [[`b318dd5`](http://github.com/eggjs/egg-router/commit/b318dd5ff2eea60013ed62b2a435f803c12bf20f)] - feat: add egg-router (dead-horse <<dead_horse@qq.com>>)

**fixes**
  * [[`b3db7b4`](http://github.com/eggjs/egg-router/commit/b3db7b41988d3bf1b4e885ed76b3a8165c1d3b1d)] - fix: add missing dependencies koa-convert (dead-horse <<dead_horse@qq.com>>)
  * [[`c280336`](http://github.com/eggjs/egg-router/commit/c2803368a8256bc9504ae3c821eefeb9d1fcbc4d)] - fix: only support node@8 (dead-horse <<dead_horse@qq.com>>)
  * [[`7a887a2`](http://github.com/eggjs/egg-router/commit/7a887a252445e602c2ea7e1c6f4cde52a433644d)] - fix: update license (dead-horse <<dead_horse@qq.com>>)

**others**
  * [[`ae40168`](http://github.com/eggjs/egg-router/commit/ae4016862fb8bdaf30e730a9278fbb1455d8b75d)] - docs: clean doc (dead-horse <<dead_horse@qq.com>>)
  * [[`e4f21a8`](http://github.com/eggjs/egg-router/commit/e4f21a8ed6dfd72c4d6f4a13bbda9a4e90b0401c)] - chore: fix history (dead-horse <<dead_horse@qq.com>>)

1.0.0 / 2019-01-30
==================

**others**
  * [[`d6496e0`](http://github.com/eggjs/egg-router/commit/d6496e09be6b0f91dcb96611f31ec5ab6ad8ac78)] - refactor: rename to @eggjs/router (dead-horse <<dead_horse@qq.com>>)

-------------------------------

# Release History from koa-router

## 7.4.0

- Fix router.url() for multiple nested routers [#407](https://github.com/alexmingoia/koa-router/pull/407)
- `layer.name` added to `ctx` at `ctx.routerName` during routing [#412](https://github.com/alexmingoia/koa-router/pull/412)
- Router.use() was erroneously settings `(.*)` as a prefix to all routers nested with .use that did not pass an explicit prefix string as the first argument. This resulted in routes being matched that should not have been, included the running of multiple route handlers in error. [#369](https://github.com/alexmingoia/koa-router/issues/369) and [#410](https://github.com/alexmingoia/koa-router/issues/410) include information on this issue.

## 7.3.0

- Router#url() now accepts query parameters to add to generated urls [#396](https://github.com/alexmingoia/koa-router/pull/396)

## 7.2.1

- Respond to CORS preflights with 200, 0 length body [#359](https://github.com/alexmingoia/koa-router/issues/359)

## 7.2.0

- Fix a bug in Router#url and append Router object to ctx. [#350](https://github.com/alexmingoia/koa-router/pull/350)
- Adds `_matchedRouteName` to context [#337](https://github.com/alexmingoia/koa-router/pull/337)
- Respond to CORS preflights with 200, 0 length body [#359](https://github.com/alexmingoia/koa-router/issues/359)

## 7.1.1

- Fix bug where param handlers were run out of order [#282](https://github.com/alexmingoia/koa-router/pull/282)

## 7.1.0

- Backports: merge 5.4 work into the 7.x upstream. See 5.4.0 updates for more details.

## 7.0.1

- Fix: allowedMethods should be ctx.method not this.method [#215](https://github.com/alexmingoia/koa-router/pull/215)

## 7.0.0

- The API has changed to match the new promise-based middleware
  signature of koa 2. See the
  [koa 2.x readme](https://github.com/koajs/koa/tree/2.0.0-alpha.3) for more
  information.
- Middleware is now always run in the order declared by `.use()` (or `.get()`,
  etc.), which matches Express 4 API.

## 5.4.0

- Expose matched route at `ctx._matchedRoute`.

## 5.3.0

- Register multiple routes with array of paths [#203](https://github.com/alexmingoia/koa-router/issue/143).
- Improved router.url() [#143](https://github.com/alexmingoia/koa-router/pull/143)
- Adds support for named routes and regular expressions
  [#152](https://github.com/alexmingoia/koa-router/pull/152)
- Add support for custom throw functions for 405 and 501 responses [#206](https://github.com/alexmingoia/koa-router/pull/206)

## 5.2.3

- Fix for middleware running twice when nesting routes [#184](https://github.com/alexmingoia/koa-router/issues/184)

## 5.2.2

- Register routes without params before those with params [#183](https://github.com/alexmingoia/koa-router/pull/183)
- Fix for allowed methods [#182](https://github.com/alexmingoia/koa-router/issues/182)

## 5.2.0

- Add support for async/await. Resolves [#130](https://github.com/alexmingoia/koa-router/issues/130).
- Add support for array of paths by Router#use(). Resolves [#175](https://github.com/alexmingoia/koa-router/issues/175).
- Inherit param middleware when nesting routers. Fixes [#170](https://github.com/alexmingoia/koa-router/issues/170).
- Default router middleware without path to root. Fixes [#161](https://github.com/alexmingoia/koa-router/issues/161), [#155](https://github.com/alexmingoia/koa-router/issues/155), [#156](https://github.com/alexmingoia/koa-router/issues/156).
- Run nested router middleware after parent's. Fixes [#156](https://github.com/alexmingoia/koa-router/issues/156).
- Remove dependency on koa-compose.

## 5.1.1

- Match routes in order they were defined. Fixes #131.

## 5.1.0

- Support mounting router middleware at a given path.

## 5.0.1

- Fix bug with missing parameters when nesting routers.

## 5.0.0

- Remove confusing API for extending koa app with router methods. Router#use()
  does not have the same behavior as app#use().
- Add support for nesting routes.
- Remove support for regular expression routes to achieve nestable routers and
  enable future trie-based routing optimizations.

## 4.3.2

- Do not send 405 if route matched but status is 404. Fixes #112, closes #114.

## 4.3.1

- Do not run middleware if not yielded to by previous middleware. Fixes #115.

## 4.3.0

- Add support for router prefixes.
- Add MIT license.

## 4.2.0

- Fixed issue with router middleware being applied even if no route was
matched.
- Router.url - new static method to generate url from url pattern and data

## 4.1.0

Private API changed to separate context parameter decoration from route
matching. `Router#match` and `Route#match` are now pure functions that return
an array of routes that match the URL path.

For modules using this private API that need to determine if a method and path
match a route, `route.methods` must be checked against the routes returned from
`router.match()`:

```javascript
var matchedRoute = router.match(path).filter(function (route) {
  return ~route.methods.indexOf(method);
}).shift();
```

## 4.0.0

405, 501, and OPTIONS response handling was moved into separate middleware
`router.allowedMethods()`. This resolves incorrect 501 or 405 responses when
using multiple routers.

### Breaking changes

4.x is mostly backwards compatible with 3.x, except for the following:

- Instantiating a router with `new` and `app` returns the router instance,
  whereas 3.x returns the router middleware. When creating a router in 4.x, the
  only time router middleware is returned is when creating using the
  `Router(app)` signature (with `app` and without `new`).
