---
title: View 模板渲染
order: 8
---

绝大多数情况下，我们都需要读取数据后渲染模板，然后呈现给用户。因此，我们需要引入相应的模板引擎。

框架内置了 `egg-view` 作为模板解决方案，支持多模板渲染。每个模板引擎均以插件方式引入，并保持渲染 API 的一致性。如想深入了解，可查看[模板插件开发](../advanced/view-plugin.md)。

以下以官方支持的 View 插件 `egg-view-nunjucks` 为例。

## 引入 view 插件

```bash
$ npm i egg-view-nunjucks --save
```

### 启用插件

```js
// config/plugin.js
exports.nunjucks = {
  enable: true,
  package: 'egg-view-nunjucks',
};
```

## 配置插件

`egg-view` 提供了 `config.view` 通用配置。

### root {String}

模板文件的根目录，为绝对路径，默认为 `${baseDir}/app/view`。支持配置多个目录，用逗号 `,` 分割。框架会依次从这些目录中查找文件。

以下示例展示了如何配置多个 `view` 目录：

```js
// config/config.default.js
const path = require('path');

module.exports = appInfo => {
  const config = {};

  config.view = {
    root: [
      path.join(appInfo.baseDir, 'app/view'),
      path.join(appInfo.baseDir, 'path/to/another'),
    ].join(','),
  };

  return config;
};
```

### cache {Boolean}

模板路径缓存，默认开启。框架根据 `root` 配置的目录依次查找；如果匹配成功，则会缓存文件路径，下次渲染相同路径时不会重新查找。

### mapping 和 defaultViewEngine

每个模板引擎在注册时会指定一个模板名（viewEngineName）。使用时，需要根据文件后缀匹配模板名，例如 `.nj` 后缀的文件使用 Nunjucks 进行渲染。

```js
module.exports = {
  view: {
    mapping: {
      '.nj': 'nunjucks',
    },
  },
};
```

调用 `render` 渲染文件时，框架会根据上述配置的后缀名寻找对应的模板引擎。

```js
await ctx.render('home.nj');
```

必须配置文件后缀与模板引擎的映射；否则无法找到对应模板引擎。还可以使用 `defaultViewEngine` 进行全局配置。

```js
// config/config.default.js
module.exports = {
  view: {
    defaultViewEngine: 'nunjucks',
  },
};
```

如果根据文件后缀没找到模板引擎，则会使用默认模板引擎渲染。对只用一种模板引擎的应用，建议配置此项。

### defaultExtension

一般在调用 `render` 时，第一个参数需包含文件后缀。如果配置了 `defaultExtension`，则可以省略后缀。

```js
// config/config.default.js
module.exports = {
  view: {
    defaultExtension: '.nj',
  },
};

// render app/view/home.nj
await ctx.render('home');
```

## 渲染页面

框架在 Context 上提供了三个返回 Promise 的接口：

- `render(name, locals)`：渲染模板文件，并赋值给 `ctx.body`
- `renderView(name, locals)`：仅渲染模板文件，不赋值
- `renderString(tpl, locals)`：渲染模板字符串，不赋值

```js
// {app_root}/app/controller/home.js
class HomeController extends Controller {
  async index() {
    const data = { name: 'egg' };

    // render a template, path related to `app/view`
    await ctx.render('home/index.tpl', data);

    // or manually set render result to ctx.body
    ctx.body = await ctx.renderView('path/to/file.tpl', data);

    // or render string directly
    ctx.body = await ctx.renderString('hi, {{ name }}', data, {
      viewEngine: 'nunjucks',
    });
  }
}
```

当使用 `renderString` 时需指定模板引擎。如果已定义 `defaultViewEngine`，则可省略。
## 本地变量（Locals）

在渲染页面的过程中，我们通常需要一个变量来收集需要传递给模板的变量，在框架里面，我们提供了 `app.locals` 和 `ctx.locals`。

- `app.locals` 具有全局作用域，一般在 `app.js` 里面配置全局变量。
- `ctx.locals` 具有请求作用域，它会合并 `app.locals` 的内容。
- 可以直接对它们赋值对象，框架的对应 setter 将会自动进行 merge 操作。

```js
// `app.locals` 的内容会被合并到 `ctx.locals`
ctx.app.locals = { a: 1 };
ctx.locals.b = 2;
console.log(ctx.locals); // 输出：{ a: 1, b: 2 }

// 在一次请求中，只有在首次使用 `ctx.locals` 时才会合并 `app.locals`。
ctx.app.locals = { a: 2 };
console.log(ctx.locals); // 由于已经进行过合并，结果仍然是：{ a: 1, b: 2 }

// 也可以直接赋值整个对象，不必担心会覆盖前面的值。setter 已完成自动合并。
ctx.locals.c = 3;
ctx.locals = { d: 4 };
console.log(ctx.locals); // 输出：{ a: 1, b: 2, c: 3, d: 4 }
```

但在实际业务开发中，控制器（controller）通常不会直接操作这两个对象，直接使用 `ctx.render(name, data)` 即可：

- 框架会自动将 `data` 合并到 `ctx.locals` 中。
- 框架会自动注入 `ctx`、`request`、`helper`，便于使用。

```js
ctx.app.locals = { appName: 'showcase' };
const data = { name: 'egg' };

// 框架会自动合并 `data` 到 `ctx.locals`，输出：egg - showcase
await ctx.renderString('{{ name }} - {{ appName }}', data);

// `helper`、`ctx`、`request` 将被自动注入。
await ctx.renderString(
  '{{ name }} - {{ helper.lowercaseFirst(ctx.app.config.baseDir) }}',
  data
);
```

注意：

- `ctx.locals` 有缓存，只在首次访问时合并 `app.locals`。
- 在原生 Koa 中的 `ctx.state`，由于可能产生歧义，在框架中被覆盖为 `locals`，即 `ctx.state` 和 `ctx.locals` 相等，我们推荐使用后者。

## Helper

在模板中可以直接使用 `helper` 上注册的方法，具体可以参见[扩展](../basics/extend.md)。

```js
// app/extend/helper.js
exports.lowercaseFirst = (str) => str[0].toLowerCase() + str.substring(1);

// app/controller/home.js
await ctx.renderString('{{ helper.lowercaseFirst(name) }}', data);
```

## 安全性（Security）

框架内置的 [egg-security] 插件，提供了常见的安全辅助函数，包括 `helper.shtml`、`surl`、`sjs` 等，强烈建议阅读安全性相关的[文档内容](./security.md)。

[egg-security]: https://github.com/eggjs/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view]: https://github.com/eggjs/egg-view
