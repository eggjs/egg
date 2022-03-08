---
title: 代码风格指南
---

建议开发者使用 `npm init egg --type=simple showcase` 来生成并观察推荐的项目结构和配置。

## 用类的形式呈现（Classify）

旧写法：

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

修改为：

```js
const Service = require('egg').Service;
class UserService extends Service {
  async list() {
    return await this.ctx.curl('https://eggjs.org');
  }
}
module.exports = UserService;
```

同时，`框架开发者`需要改变写法如下，否则`应用开发者`自定义 Service 等基类会有问题：

```js
const egg = require('egg');

module.export = Object.assign(egg, {
  Application: class MyApplication extends egg.Application {
    // ...
  },
  // ...
});
```

## 私有属性与慢初始化

- 私有属性用 `Symbol` 来挂载。
- Symbol 的描述遵循 jsdoc 的规则，描述映射后的类名+属性名。
- 延迟初始化。

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
