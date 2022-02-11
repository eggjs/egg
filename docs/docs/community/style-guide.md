---
title: Code Style Guide
---

Developers are advised to use `npm init egg --type=simple showcase` to generate and observe the recommended project structure and configuration.

## Classify

Old Style:

```js
module.exports = (app) => {
  class UserService extends app.Service {
    async list() {
      return await this.ctx.curl('https://eggjs.org');
    }
  }
  return UserService;
};
```

change to:

```js
const Service = require('egg').Service;
class UserService extends Service {
  async list() {
    return await this.ctx.curl('https://eggjs.org');
  }
}
module.exports = UserService;
```

Additionally, the `framework developer` needs to change the syntax as follows, otherwise the `application developer` will have problems customizing base classes such as Service:

```js
const egg = require('egg');

module.exports = Object.assign(egg, {
  Application: class MyApplication extends egg.Application {
    // ...
  },
  // ...
});
```

## Private Properties & Lazy Initialization

- Private properties are mounted with `Symbol`.
- The description of Symbol follows the rules of jsdoc, describing the mapped class name + attribute name.
- Delayed initialization.

```js
// app/extend/application.js
const CACHE = Symbol('Application#cache');
const CacheManager = require('../../lib/cache_manager');

module.exports = {
  get cache() {
    if (!this[CACHE]) {
      this[CACHE] = new CacheManager(this);
    }
    return this[CACHE];
  },
};
```
