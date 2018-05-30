title: View Template Rendering
---

In most cases, we need to fetch data and render with template files.
So we need to use corresponding view engines.

[egg-view] is a built-in plugin to support using multiple view engines in one application.
All view engines are imported as plugins.
With [egg-view] developers can use the same API interface to work with different view engines.
See [View Plugin](../advanced/view-plugin.md) for more details.

Take the officially supported View plugin [egg-view-nunjucks] as an example:

### Install view engine plugin

```bash
$ npm i egg-view-nunjucks --save
```

### Enable view engine plugin

```js
// config/plugin.js
exports.nunjucks = {
  enable: true,
  package: 'egg-view-nunjucks',
};
```

## Configure view plugins

[egg-view] defines the default configuration of `config.view`

### root {String}

Root directory for template files is absolute path, with default value `${baseDir}/app/view`.

[egg-view] supports having multiple directories, which are separated by `,`.
In this case, it looks for template files from all the directories.

The configuration below is an example of multiple view directories:

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
When a file matching given template path is found, the file's full path will be cached
and reused afterward.
[egg-view] won't search all directories again for the same template path.

### mapping and defaultViewEngine

Every view engine has a view engine name defined when the plugin is enabled.
In view configuration, `mapping` defines the mapping
from template file's extension name to view engine name.
For example, use Nunjucks engine to render `.nj` files.

```js
module.exports = {
  view: {
    mapping: {
      '.nj': 'nunjucks',
    },
  },
};
```

[egg-view] uses the corresponding view engine according to the configuration above.

```js
await ctx.render('home.nj');
```

The mapping from file extension name to view engine must be defined.
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
For the applications that use only one view engine,
it's recommended to set this option.

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

- `render(name, locals)` renders template file, and set the value to `ctx.body`.
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

When calling `renderString`, view engine should be specified unless `defaultViewEngine` has been defined.

## Locals

In the process of rendering pages,
we usually need a variable to contain all information that is used in view template.
[egg-view] provides `app.locals` and `ctx.locals`.

- `app.locals` is global, usually configured in `app.js`.
- `ctx.locals` is per-request, and it merges `app.locals`.
- `ctx.locals` can be assigned by modifying key/value or assigned with a new object. [egg-view] will merge the new object automatically in corresponding setter.

```js
// `app.locals` merged into `ctx.locals`
ctx.app.locals = { a: 1 };
ctx.locals.b = 2;
console.log(ctx.locals); // { a: 1, b: 2 }

// in the processing of a request, `app.locals` is merged into `ctx.locals` only at the first time `ctx.locals` being accessed
ctx.app.locals = { a: 2 };
console.log(ctx.locals); // already merged before, so output is still { a: 1, b: 2 }

// pass a new object to `locals`. New object will be merged into `locals`, instead of replacing it. It's done by setter automatically.
ctx.locals.c = 3;
ctx.locals = { d: 4 };
console.log(ctx.locals); // { a: 1, b: 2, c: 3, d: 4 }
```

In practical development, we usually don't use these two objects in controller directly.
Instead, simply call `ctx.render(name, data)`:
- [egg-view] merges `data` into `ctx.locals` automatically.
- [egg-view] injects `ctx`, `request`, `helper` into locals automatically.

```js
ctx.app.locals = { appName: 'showcase' };
const data = { name: 'egg' };

// will auto merge `data` to `ctx.locals`, output: egg - showcase
await ctx.renderString('{{ name }} - {{ appName }}', data);

// helper, ctx, request will auto inject
await ctx.renderString('{{ name }} - {{ helper.lowercaseFirst(ctx.app.config.baseDir) }}', data);
```

Note:

- **ctx.locals is cached. app.locals is merged into it only at the first time that ctx.locals is accessed.**
- due to the ambiguity of naming, the `ctx.state` that is used in Koa is replaced by `ctx.locals` in Egg.js, i.e. `ctx.state` and `ctx.locals` are equivalent. It's recommended to use the latter.

## Helper

All functions that defined in `helper` can be directly used in templates.
See [Extend](../basics/extend.md) for more details.

```js
// app/extend/helper.js
exports.lowercaseFirst = str => str[0].toLowerCase() + str.substring(1);

// app/controller/home.js
await ctx.renderString('{{ helper.lowercaseFirst(name) }}', data);
```

## Security

The built-in plugin [egg-security] provides common security helper functions, including `helper.shtml / surl / sjs` and so on. It's strongly recommended to read [Security](./security.md).

[egg-security]: https://github.com/eggjs/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view]: https://github.com/eggjs/egg-view
