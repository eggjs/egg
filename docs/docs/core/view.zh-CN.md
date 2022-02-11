---
title: View 模板渲染
order: 8
---

绝大多数情况，我们都需要读取数据后渲染模板，然后呈现给用户。故我们需要引入对应的模板引擎。

框架内置 [egg-view] 作为模板解决方案，并支持多模板渲染，每个模板引擎都以插件的方式引入，但保持渲染的 API 一致。如果想更深入的了解，可以查看[模板插件开发](../advanced/view-plugin.md)。

以下以官方支持的 View 插件 [egg-view-nunjucks] 为例

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

[egg-view] 提供了 `config.view` 通用配置

### root {String}

模板文件的根目录，为绝对路径，默认为 `${baseDir}/app/view`。支持配置多个目录，以 `,` 分割，会从多个目录查找文件。

如下示例演示了如何配置多个 `view` 目录：

```js
// config/config.default.js
const path = require('path');
module.exports = (appInfo) => {
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

模板路径缓存，默认开启。框架会根据 root 配置的目录依次查找，如果匹配则会缓存文件路径，下次渲染相同路径时不会重新查找。

### mapping 和 defaultViewEngine

每个模板在注册时都会指定一个模板名（viewEngineName），在使用时需要根据后缀来匹配模板名，比如指定 `.nj` 后缀的文件使用 Nunjucks 进行渲染。

```js
module.exports = {
  view: {
    mapping: {
      '.nj': 'nunjucks',
    },
  },
};
```

调用 render 渲染文件时，会根据上述配置的后缀名去寻找对应的模板引擎。

```js
await ctx.render('home.nj');
```

必须配置文件后缀和模板引擎的映射，否则无法找到对应的模板引擎，但是可以使用 `defaultViewEngine` 做全局配置。

```js
// config/config.default.js
module.exports = {
  view: {
    defaultViewEngine: 'nunjucks',
  },
};
```

如果根据文件后缀没有找到对应的模板引擎，会使用默认的模板引擎进行渲染。对于只使用一种模板引擎的应用，建议配置此选项。

### defaultExtension

一般在调用 render 时的第一个参数需要包含文件后缀，如果配置了 defaultExtension 可以省略后缀。

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

框架在 Context 上提供了 3 个接口，返回值均为 Promise:

- `render(name, locals)` 渲染模板文件, 并赋值给 ctx.body
- `renderView(name, locals)` 渲染模板文件, 仅返回不赋值
- `renderString(tpl, locals)` 渲染模板字符串, 仅返回不赋值

```js
// {app_root}/app/controller/home.js
class HomeController extends Controller {
  async index() {
    const data = { name: 'egg' };

    // render a template, path relate to `app/view`
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

当使用 `renderString` 时需要指定模板引擎，如果已经定义 `defaultViewEngine` 这里可以省略。

## Locals

在渲染页面的过程中，我们通常需要一个变量来收集需要传递给模板的变量，在框架里面，我们提供了 `app.locals` 和 `ctx.locals`。

- `app.locals` 为全局的，一般在 `app.js` 里面配置全局变量。
- `ctx.locals` 为单次请求的，会合并 `app.locals`。
- 可以直接赋值对象，框架在对应的 setter 里面会自动 merge。

```js
// `app.locals` 会合并到 `ctx.locals
ctx.app.locals = { a: 1 };
ctx.locals.b = 2;
console.log(ctx.locals); // { a: 1, b: 2 }

// 一次请求过程中，仅会在第一次使用 `ctx.locals` 时把 `app.locals` 合并进去。
ctx.app.locals = { a: 2 };
console.log(ctx.locals); // 上面已经合并过一次，故输出还是 { a: 1, b: 2 }

// 也可以直接赋值整个对象，不用担心会覆盖前面的值，我们通过 setter 做了自动合并。
ctx.locals.c = 3;
ctx.locals = { d: 4 };
console.log(ctx.locals); // { a: 1, b: 2, c: 3, d: 4 }
```

但在实际业务开发中，controller 中一般不会直接使用这 2 个对象，直接使用 `ctx.render(name, data)` 即可：

- 框架会自动把 `data` 合并到 `ctx.locals`。
- 框架会自动注入 `ctx`, `request`, `helper` 方便使用。

```js
ctx.app.locals = { appName: 'showcase' };
const data = { name: 'egg' };

// will auto merge `data` to `ctx.locals`, output: egg - showcase
await ctx.renderString('{{ name }} - {{ appName }}', data);

// helper, ctx, request will auto inject
await ctx.renderString(
  '{{ name }} - {{ helper.lowercaseFirst(ctx.app.config.baseDir) }}',
  data,
);
```

注意：

- **ctx.locals 有缓存，只在第一次访问 ctx.locals 时合并 app.locals。**
- 原 Koa 中的 `ctx.state`，由于容易产生歧义，在框架中被覆盖为 locals，即 `ctx.state` 和 `ctx.locals` 等价，我们建议使用后者。

## Helper

在模板中可以直接使用 `helper` 上注册的方法，具体可以参见[扩展](../basics/extend.md)。

```js
// app/extend/helper.js
exports.lowercaseFirst = (str) => str[0].toLowerCase() + str.substring(1);

// app/controller/home.js
await ctx.renderString('{{ helper.lowercaseFirst(name) }}', data);
```

## Security

框架内置的 [egg-security] 插件，为我们提供了常见的安全辅助函数，包括 `helper.shtml / surl / sjs` 等等等，强烈建议阅读下[安全](./security.md)。

[egg-security]: https://github.com/eggjs/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view]: https://github.com/eggjs/egg-view
