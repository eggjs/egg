title: View Template Rendering
---

In most cases, we need to fetch data, render with templates, then return to users.
So a view engine is essential.

[egg-view] is the built-in view solution of Egg.js.
It allows more than one view engine to be used in one application.
All view engines are imported as plugins, and they provide the same rendering API interface.
To know more, see [View Plugin](../advanced/view-plugin.md).

Take the officially supported View plugin [egg-view-nunjucks] as example:

## Install view plugin

```bash
$ npm i egg-view-nunjucks --save
```

### Register plugin

```js
// config/plugin.js
exports.nunjucks = {
  enable: true,
  package: 'egg-view-nunjucks',
};
```

## Configure plugin

[egg-view] defines the default configuration of `config.view`

### root {String}

Root directory for template files. It's absolute path. Default value is `${baseDir}/app/view`.
Multiple directories, separated by `,`, are supported.
[egg-view] looks for template files from all the directories.

Below is an example of configuring multiple `view` directories:

```js
// config/config.default.js
const path = require('path');
module.exports = appInfo => {
  const config = {};
  config.view = {
    root: [
      path.join(appInfo.baseDir, 'app/view'),
      path.join(appInfo.baseDir, 'path/to/another'),
    ].join(',')
  };
  return config;
};
```

### cache {Boolean}

Cache template file paths, default value is `true`.
[egg-view] looks for template files from the directories that defined in `root`.
If a matching is found, the file path will be cached.
The next time the same path is used,
[egg-view] won't search all directories again.

### mapping and defaultViewEngine

Every view engine needs to have a view engine name specified.
File extension name is used to decide view engines.
For example, use Nunjucks to render `.nj` files.

```js
module.exports = {
  view: {
    mapping: {
      '.nj': 'nunjucks',
    },
  },
};
```

When calling `render()` to render files,
[egg-view] uses view engine according to extension name.

```js
await ctx.render('home.nj');
```

The mapping from extension name to view engine must be defined.
Otherwise [egg-view] cannot find correct view engine.
Global configuration can be done with `defaultViewEngine`.

```js
// config/config.default.js
module.exports = {
  view: {
    defaultViewEngine: 'nunjucks',
  },
};
```

If a view engine cannot be found according to specified mapping,
the default view engine will be used.
For applications that use only one view engine,
it's suggested to set this option.

### defaultExtension

When calling `render()`, the first argument should contain file extension name,
unless `defaultExtension` has been configured.

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

## Render Page

[egg-view] provides three interfaces in Context.
All three returns a Promise:

- `render(name, locals)` renders template file, and set to value to `ctx.body`.
- `renderView(name, locals)` renders template file, returns the result and don't set the value to any variable.
- `renderString(tpl, locals)` renders template string, returns the result and don't set the value to any variable.

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

When calling `renderString`, view engine should be specified unless `defaultViewEngine` is defined.

## Locals

In the process of rendering pages,
we usually need a variable to hold all variables that used in view.
[egg-view] provides `app.locals` and `ctx.locals`.

- `app.locals` is global, usually configured in `app.js`.
- `ctx.locals` is per-request, and it merges `app.locals`.
- set `ctx.locals` with a new object, [egg-view] auto merges the new object into the previous object using setter.

```js
// `app.locals` merged into `ctx.locals`
ctx.app.locals = { a: 1 };
ctx.locals.b = 2;
console.log(ctx.locals); // { a: 1, b: 2 }

// in one request, `app.locals` is merged into `ctx.locals` only at the first time accessed
ctx.app.locals = { a: 2 };
console.log(ctx.locals); // already merged before, so output is still { a: 1, b: 2 }

// pass a new object to `locals`. New object will be merged into `locals`, instead of replacing it. It's done through setter automatically.
ctx.locals.c = 3;
ctx.locals = { d: 4 };
console.log(ctx.locals); // { a: 1, b: 2, c: 3, d: 4 }
```

In real development, we usually don't directly use these two objects in controller.
Instead, simply call `ctx.render(name, data)`:
- [egg-view] auto merges `data` into `ctx.locals`.
- [egg-view] auto injects `ctx`, `request`, `helper` into locals for your convenience.

```js
ctx.app.locals = { appName: 'showcase' };
const data = { user: 'egg' };

// will auto merge `data` to `ctx.locals`, output: egg - showcase
await ctx.renderString('{{ name }} - {{ appName }}', data);

// helper, ctx, request will auto inject
await ctx.renderString('{{ name }} - {{ helper.lowercaseFirst(ctx.app.config.baseDir) }}', data);
```

Note:

- **ctx.locals is cached. app.locals is merged into it only at the first time that ctx.locals is accessed.**
- due to the ambiguity of naming, the `ctx.state` that is used in Koa is replaced by `locals` in Egg.js, i.e. `ctx.state` and `ctx.locals` are equivalent. It's suggested to use the latter.

## Helper

All functions that defined in `helper` can be directly used in templates.
See more details in [Extend](../basics/extend.md).

```js
// app/extend/helper.js
exports.lowercaseFirst = str => str[0].toLowerCase() + str.substring(1);

// app/controller/home.js
await ctx.renderString('{{ helper.lowercaseFirst(name) }}', data);
```

## Security

The built-in plugin [egg-security] provides common security related functions, including `helper.shtml / surl / sjs` and so on. You're strongly recommended to read [Security](./security.md).

[egg-security]: https://github.com/eggjs/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view]: https://github.com/eggjs/egg-view
