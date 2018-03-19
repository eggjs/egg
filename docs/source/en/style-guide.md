## Title: Code Style Guide

Developers are advised to use `egg-init --type=simple showcase` to generate and observe the recommended project structure and configuration.

## Classify

```js
// old style
Module.exports = app => {
  Class UserService extends app.Service {
    Async list() {
      Return await this.ctx.curl('https://eggjs.org');
    }
  }
  Return UserService;
};
```

change to:

```js
Const Service = require('egg').Service;
Class UserService extends Service {
  Async list() {
    Return await this.ctx.curl('https://eggjs.org');
  }
}
Module.exports = UserService;
```

Additionally, the `framework developer` needs to change the syntax as follows, otherwise the `application developer` will have problems customizing base classes such as Service:

```js
Const egg = require('egg');

Module.export = Object.assign(egg, {
  Application: class MyApplication extends egg.Application {
    // ...
  },
  // ...
});
```

## Private properties & Lazy Initialization

* Private properties are mounted with `Symbol`.
* The description of Symbol follows the rules of jsdoc, describing the mapped class name + attribute name.
* Delayed initialization.

```js
// app/extend/application.js
Const CACHE = Symbol('Application#cache');
Const CacheManager = require('../../lib/cache_manager');

Module.exports = {
  Get cache() {
    If (!this[CACHE]) {
      This[CACHE] = new CacheManager(this);
    }
    Return this[CACHE];
  },
}
```
