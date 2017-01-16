title: View 插件开发规范
---

绝大多数情况，我们都需要读取数据后渲染模板，然后呈现给用户，而框架并不强制使用某种模板引擎，由开发者来自行选型，具体参见 [模板渲染](../core/view.md)。

本文将阐述框架对 View 插件的规范约束, 我们可以依此来封装对应的模板引擎插件。

## 插件目录结构

```bash
egg-view-nunjucks
├── app
│   └── extend
│       └── application.js
├── config
│   ├── config.default.js
│   └── config.local.js
├── lib
│   ├── engine.js
│   ├── helper.js
│   └── view.js
├── test
├── History.md
├── README.md
└── package.json
```

## 插件命名规范

- 遵循 [插件开发规范](./plugin.md)
- 插件命名约定以 `egg-view-` 开头
- package.json 中增加:

```json
{
  "name": "egg-view-nunjucks",
  "eggPlugin": {
    "name": "view"
  },
  "keywords": [
    "egg",
    "eggPlugin",
    "egg-plugin",
    "egg-plugin-view",
    "nunjucks"
  ],
}
```

### ViewEngine

模板引擎一般只需要初始化一次，我们可以通过 ViewEngine 来初始化 ：

```js
// {plugin_root}/lib/engine.js
const nunjucks = require('nunjucks');
module.exports = app => {
  const engine = new nunjucks.Environment();
  engine.nunjucks = nunjucks;
  return engine;
});
```

扩展到 application ：

```js
// {plugin_root}/app/extend/application.js
module.exports = {
  get viewEngine() {
    if (!this[VIEW_ENGINE]) {
      this[VIEW_ENGINE] = engine(this);
    }
    return this[VIEW_ENGINE];
  },
};
```

此外，还可以通过 `app.viewEngine` 提供接口给应用开发者调用，如 `app.viewEngine.cleanCache()` 之类的。

## View 基类

接下来需提供一个 View 基类，该类将被框架的内部 View 类继承，并在每次请求中进行初始化。

View 基类需提供 `render` 和 `renderString` 两个方法，返回 Promise (考虑到后续对 await async 的支持)。

```js
// {plugin_root}/lib/view.js
module.exports = class MyCustomView {
  constructor(ctx) {
    this.ctx = ctx;
    this.app = ctx.app;
  }

  render(name, locals) {
    // name 为模板文件的相对于 `app/view` 的路径
    return new Promise((resolve, reject) => {
      this.app.viewEngine.render(name, locals, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  renderString(tpl, locals) {
    // tpl 是模板字符串
    return Promise.resolve('some html');
  }
};
```

再把该基类扩展到 application 上：

使用 `Symbol.for('egg#view')` 来指定当前框架查找 View 基类的路径。

```js
// {plugin_root}/app/extend/application.js
const View = require('../../lib/view');

module.exports = {
  get [Symbol.for('egg#view')]() {
    return View;
  },
}
```

## 插件配置

配置的 key 为 `view`，并提供至少两个配置属性:

- {String} dir - 模板文件的根目录，绝对路径。
- {Boolean} cache - 是否开启模板缓存，本地开发为 false，其他为 true。

**由于[配置合并的限制](../basics/config.md)，我们建议若需要支持目录配置，不要定义数组配置，而使用字符串分隔符代替，并在文档中告知用户。**

```js
// {plugin_root}/config/config.default.js
const path = require('path');

module.exports = appInfo => {
  return {
    /**
    * View options
    * @member Config#view
    * @property {String} dir - full path of template dir, support multiple path by using comma, defaults to `{app_root}/app/view`.
    * @property {Boolean} cache - whether cache template, default to true except false at local env.
    */
    view: {
      dir: path.join(appInfo.baseDir, 'app/view'),
      cache: true,
    }
  }
};

// {plugin_root}/config/config.local.js
exports.view = {
  cache: false,
}

// {plugin_root}/lib/engine.js
const nunjucks = require('nunjucks');
module.exports = app => {
  const viewPaths = app.config.view.dir.split(',').map(dir => dir.trim());
  // nunjucks 的 file loader 支持多目录
  const fileLoader = new nunjucks.FileSystemLoader(viewPaths);

  const engine = new nunjucks.Environment(fileLoader);
  engine.nunjucks = nunjucks;
  return engine;
});
```


> 上述几条规范，是框架对 View 插件的强约束。
> 下文的约定，为最佳实践，非强制约束，插件开发者可以根据具体的模板引擎场景自行实现。

### helper

框架本身提供了 `ctx.helper` 供开发者使用，但有些情况下，我们希望对 helper 方法进行覆盖，仅在模板渲染时生效。

如 `helper.shtml` 在 controller 中使用时直接输出清洗后的 html， 但在模板中，需要绕过模板引擎本身的 `escape` 机制，则可以如下：

先提供一个 helper 子类：

```js
// {plugin_root}/lib/helper.js
module.exports = app => {
  class ViewHelper extends app.Helper {
    // wrap `shtml/sjs/surl`, so you don't need `safe(sjs(foo))` to prevent unexpected escape
    shtml(str) {
      return this.safe(super.shtml(str));
    }

    surl(str) {
      return this.safe(super.surl(str));
    }

    sjs(str) {
      return this.safe(super.sjs(str));
    }
    // ...
  }
  return ViewHelper;
};
```

在 application 和 view 中分别扩展上去：

```js
// {plugin_root}/app/extend/application.js
const VIEW_HELPER = Symbol('app#ViewHelper');
const helper = require('../../lib/helper');
module.exports = {
  get ViewHelper() {
    if (!this[VIEW_HELPER]) {
      this[VIEW_HELPER] = helper(this, this.viewEngine.filters);
    }
    return this[VIEW_HELPER];
  },

  // ...
}

// {plugin_root}/lib/view.js
const HELPER = Symbol('View#helper');
module.exports = class MyCustomView {
  get helper() {
    if (!this[HELPER]) {
      this[HELPER] = new this.app.ViewHelper(this.ctx);
    }
    return this[HELPER];
  }
  // ...
}
```

### filter

模板引擎中最常用的就是 filter，故我们在框架的[扩展](../basics/extend.md)之上增加对 `app/extend/filter.js` 的支持：

```js
// {plugin_root}/lib/engine.js
function loadFilter() {
  const dirs = app.loader.getLoadUnits().map(unit => unit.path);
  for (const dir of dirs) {
    // load all `filter.js` define at all framework/plugin/app
    const filters = app.loader.loadFile(path.join(dir, 'app/extend/filter.js')) || {};
    for (const name of Object.keys(filters)) {
      // invoke your template engine lib's add filter method
      engine.addFilter(name, filters[name]);
    }
  }
}
```

### 安全相关

首先声明对 [egg-security] 的依赖：

```json
{
  "name": "egg-view-nunjucks",
  "eggPlugin": {
    "name": "view",
    "dep": [
      "security"
    ]
  },
}
```

然后需要在对应的 FileLoader 里面注入安全脚本：

- `app.injectCsrf()` - 自动往 form 表单里插入 `_csrf` 隐藏域
- `app.injectNonce()` - 自动往 script 标签增加 `nonce` 属性

具体可以参考 [egg-view-nunjucks] 的 [FileLoader](https://github.com/eggjs/egg-view-nunjucks/blob/master/lib/engine.js#L60) 实现。

更多安全相关知识，参见 [安全](../core/security.md)。

### 单元测试

作为一个高质量的插件，完善的单元测试是必不可少的，我们也提供了很多辅助工具使插件开发者可以无痛的编写测试，具体参见 [单元测试](../core/unittest.md) 和 [插件](./plugin.md) 中的相关内容。

## 内部调用流程

接下来，我们来介绍下框架内部实现，了解下整个调用流程：

- 应用开发者在 controller 里面调用 `this.render()`
- 框架调用链:
  -  `this.render() -> this.view.render()`
  - `this.view` 是一个惰性实例化的单例， `new this.app.View(this)`
  - `app.View` 也是一个惰性实例化的单例，该 View 类继承于插件里面扩展的 `app[Symbol.for('egg#view')]`
  - 该子类会在原 render 方法的基础上，增加对 locals 的注入。

有兴趣的同学可以看下对应的源码：
- [app/extend/context.js](https://github.com/eggjs/egg/blob/master/app/extend/context.js), `* render()`
- [app/extend/application.js](https://github.com/eggjs/egg/blob/master/app/extend/application.js), `get View()`
- [lib/core/view.js](https://github.com/eggjs/egg/blob/master/lib/core/view.js)


[egg-security]: https://github.com/eggjs/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks