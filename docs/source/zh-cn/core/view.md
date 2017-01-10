title: 模板渲染
---

绝大多数情况，我们都需要读取数据后渲染模板，然后呈现给用户。故我们需要引入对应的模板引擎。

框架并不强制你使用某种模板引擎，并且没有内置的 view 插件，只是约定了 [view 插件开发规范](../advanced/view-plugin.md)，开发者需根据团队技术选型自行引入。

## 选择 view 插件

目前官方支持的 view 插件有：
- [egg-view-nunjucks]

下文将以 `egg-view-nunjucks` 为示例

### 引入 view 插件

```bash
$ npm i egg-view-nunjucks --save
```

### 启用插件

```js
// config/plugin.js
exports.view = {
  enable: true,
  package: 'egg-view-nunjucks',
};
```

### 配置插件

框架仅约定了以下配置项，更多的配置需要查阅对应插件的文档。

- {String} dir - 模板文件的根目录，绝对路径，默认为 `${baseDir}/app/view`。
- {Boolean} cache - 是否开启模板缓存，本地开发为 false，其他为 true。

如下示例演示了如何配置多个 view 目录：

```js
// config/config.default.js
const path = require('path');
module.exports = appInfo => {
  return {
    view: {
      dir: [
        path.join(appInfo.baseDir, 'app/view'),
        path.join(appInfo.baseDir, 'path/to/another'),
      ].join(',')
    }
  }
};
```

注意：**多目录支持这个特性依赖于对应的 view 插件是否实现**

## 渲染页面

框架在 context 上提供了 3 个接口，返回值均为 Promise:
- `render(name, locals)` 渲染模板文件, 并赋值给 ctx.body
- `renderView(name, locals)` 渲染模板文件, 仅返回不赋值
- `renderString(tpl, locals)` 渲染模板字符串, 仅返回不赋值

```js
// {app_root}/app/controller/home.js
module.exports = function* home(){
  const data = { name: 'egg' };

  // render a template, path relate to `app/view`
  yield this.render('home/index.tpl', data);

  // or manually set render result to this.body
  this.body = yield this.renderView('path/to/file.tpl', data);

  // or render string directly
  this.body = yield this.renderString('hi, {{ name }}', data);
};
```

## locals

在渲染页面的过程中，我们通常需要一个变量来收集需要传递给模板的变量，在框架里面，我们提供了 `app.locals` 和 `this.locals`。

- `app.locals` 为全局的，一般在 `app.js` 里面配置全局变量。
- `this.locals` 为单次请求的，会合并 `app.locals`。
- 可以直接赋值对象，框架在对应的 setter 里面会自动 merge。

```js
// `app.locals` 会合并到 `this.locals
this.app.locals = { a: 1 };
this.locals.b = 2;
console.log(this.locals); // { a: 1, b: 1 }

// 一次请求过程中，仅会在第一次使用 `this.locals` 时把 `app.locals` 合并进去。
this.app.locals = { a: 2 };
console.log(this.locals); // 上面已经合并过一次，故输出还是 { a: 1, b: 2 }

// 也可以直接赋值整个对象，不用担心会覆盖前面的值，我们通过 setter 做了自动合并。
this.locals.c = 3;
this.locals = { d: 4 };
console.log(this.locals); // { a: 1, b: 2, c: 3, d: 4 }
```

但在实际业务开发中，controller 中一般不会直接使用这 2 个对象，直接使用 `this.render(name, data)` 即可：
- 框架会自动把 `data` 合并到 `this.locals`。
- 框架会自动注入 `ctx`, `request`, `helper` 方便使用。

```js
this.app.locals = { appName: 'showcase' };
const data = { user: 'egg' };

// will auto merge `data` to `this.locals`, output: egg - showcase
yield this.renderString('{{ name }} - {{ appName }}', data);

// helper, ctx, request will auto inject
yield this.renderString('{{ name }} - {{ helper.lowercaseFirst(ctx.app.config.baseDir) }}', data);
```

注意：
- **this.locals 有缓存，只在第一次访问 this.locals 时合并 app.locals。**
- 原 koa 中的 `context.state`，由于容易产生歧义，在框架中被覆盖为 locals，即 `this.state` 和 `this.locals` 等价，我们建议使用后者。

## helper

在模板中可以直接使用 `helper` 上注册的方法，具体可以参见 [扩展](../basics/extend.md)。

```js
// app/extend/helper.js
exports.lowercaseFirst = str => str[0].toLowerCase() + str.substring(1);

// app/controller/home.js
yield this.renderString('{{ helper.lowercaseFirst(name) }}', data);
```

## filter

在 view 插件里面，会扩展对 `filter` 的支持，类似 `helper` 一样编写 `filter.js` 即可。

注意：**该特性依赖于对应的 view 插件是否实现**

```js
// app/extend/filter.js
exports.lowercaseFirst = str => str[0].toLowerCase() + str.substring(1);

// app/controller/home.js
yield this.renderString('{{ name | lowercaseFirst }}', data);
```

## security

框架内置的 [egg-security] 插件，为我们提供了常见的安全辅助函数，包括 `helper.shtml / surl / sjs` 等等等，强烈建议阅读下 [安全](./security.md)。


[egg-security]: gitlab.alibaba-inc.com/egg/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks