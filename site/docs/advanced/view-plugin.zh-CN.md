---
title: View 插件开发
order: 5
---

绝大多数情况，我们都需要读取数据后渲染模板，然后呈现给用户，而框架并不强制使用某种模板引擎，由开发者来自行选型，具体参见[模板渲染](../core/view.md)。

本文将阐述框架对 View 插件的规范约束, 我们可以依此来封装对应的模板引擎插件。以下以 [egg-view-ejs] 为例。

## 插件目录结构

```bash
egg-view-ejs
├── config
│   ├── config.default.js
│   └── config.local.js
├── lib
│   └── view.js
├── app.js
├── test
├── History.md
├── README.md
└── package.json
```

## 插件命名规范

- 遵循[插件开发规范](./plugin.md)
- 插件命名约定以 `egg-view-` 开头
- `package.json` 配置如下，插件名以模板引擎命名，比如 ejs

  ```json
  {
    "name": "egg-view-ejs",
    "eggPlugin": {
      "name": "ejs"
    },
    "keywords": ["egg", "egg-plugin", "egg-view", "ejs"]
  }
  ```

- 配置项也以模板引擎命名

  ```js
  // config/config.default.js
  module.exports = {
    ejs: {},
  };
  ```

## View 基类

接下来需提供一个 View 基类，这个类会在每次请求实例化。

View 基类需提供 `render` 和 `renderString` 两个方法，支持 generator function 和 async function（也可以是函数返回一个 Promise）。`render` 方法用于渲染文件，而 `renderString` 方法用于渲染模板字符串。

以下为简化代码，可直接[查看源码](https://github.com/eggjs/egg-view-ejs/blob/master/lib/view.js)

```js
const ejs = require('ejs');

module.exports = class EjsView {
  render(filename, locals) {
    return new Promise((resolve, reject) => {
      // 异步调用 API
      ejs.renderFile(filename, locals, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  renderString(tpl, locals) {
    try {
      // 同步调用 API
      return Promise.resolve(ejs.render(tpl, locals));
    } catch (err) {
      return Promise.reject(err);
    }
  }
};
```

### 参数

`render` 方法的三个参数

- filename: 是完整的文件的路径，框架查找文件时已确认文件是否存在，这里不需要处理
- locals: 渲染所需的数据，数据来自 `app.locals`，`ctx.locals` 和调用 `render` 方法传入的。框架还内置了 `ctx`，`request`, `ctx.helper` 这几个对象。
- viewOptions: 用户传入的配置，可覆盖模板引擎的默认配置，这个可根据模板引擎的特征考虑是否支持。比如默认开启了缓存，而某个页面不需要缓存。

`renderString` 方法的三个参数

- tpl: 模板字符串，没有文件路径。
- locals: 同 `render`。
- viewOptions: 同 `render`。

## 插件配置

根据上面的命名约定，配置名一般为模板引擎的名字，比如 ejs。

插件的配置主要来自模板引擎的配置，可根据具体情况定义配置项，如 [ejs 的配置](https://github.com/mde/ejs#options)。

```js
// config/config.default.js
module.exports = {
  ejs: {
    cache: true,
  },
};
```

### helper

框架本身提供了 `ctx.helper` 供开发者使用，但有些情况下，我们希望对 helper 方法进行覆盖，仅在模板渲染时生效。

在模板渲染中，我们经常会需要输出用户提供的 html 片段，通常需要使用 `egg-security` 插件提供的 `helper.shtml` 清洗下

```html
<div>{{ helper.shtml(data.content) | safe }}</div>
```

但如上代码所示，我们需要加上 ` | safe` 来告知模板引擎，该 html 是安全的，无需再次 `escape`，直接渲染。

而这样用起来比较麻烦，而且容易遗忘，所以我们可以封装下：

- 先提供一个 helper 子类：

```js
// {plugin_root}/lib/helper.js
module.exports = (app) => {
  return class ViewHelper extends app.Helper {
    // safe 由 [egg-view-nunjucks] 注入，在渲染时不会转义，
    // 否则在模板调用 shtml 会被转义
    shtml(str) {
      return this.safe(super.shtml(str));
    }
  };
};
```

- 在渲染时使用自定义的 helper

```js
// {plugin_root}/lib/view.js
const ViewHelper = require('./helper');

module.exports = class MyCustomView {
  render(filename, locals) {
    locals.helper = new ViewHelper(this.ctx);

    // 调用 Nunjucks render
  }
};
```

具体代码可[查看](https://github.com/eggjs/egg-view-nunjucks/blob/2ee5ee992cfd95bc0bb5b822fbd72a6778edb118/lib/view.js#L11)

### 安全相关

模板和安全息息相关，[egg-security] 也给模板提供了一些方法，模板引擎可以根据需求使用。

首先声明对 [egg-security] 的依赖：

```json
{
  "name": "egg-view-nunjucks",
  "eggPlugin": {
    "name": "nunjucks",
    "dep": ["security"]
  }
}
```

此外，框架提供了 [app.injectCsrf](../core/security.md#appinjectcsrfstr) 和 [app.injectNonce](../core/security.md#appinjectnoncestr)，更多可查看[安全章节](../core/security.md)。

### 单元测试

作为一个高质量的插件，完善的单元测试是必不可少的，我们也提供了很多辅助工具使插件开发者可以无痛的编写测试，具体参见[单元测试](../core/unittest.md)和[插件](./plugin.md)中的相关内容。

[egg-security]: https://github.com/eggjs/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view-ejs]: https://github.com/eggjs/egg-view-ejs
