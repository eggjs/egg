## Title: View Plugin Development

In most cases, we need to read the data, render the template and then present it to the user. The framework does not force the use of a template engine, allowing developers to select the [template](../core/view.md) themselves. For details, see [Template Rendering](../core/view.md).

This article describes the framework's specification constraints on the View plugin, and we can use this to encapsulate the corresponding template engine plugin. The following takes [egg-view-ejs] as an example

## Plugin directory structure

```bash
egg-view-ejs
├── config
│ ├── config.default.js
│ └── config.local.js
├── lib
│ └── view.js
├── app.js
├── test
├── History.md
├── README.md
└── package.json
```

## Plugin naming convention

* Follow the [plugin development specification](./plugin.md)
* According to the convention, the names of plugins start with `egg-view-`
* `package.json` is configured as follows. Plugins are named after the template engine, such as ejs

```json
{
  "name": "egg-view-ejs",
  "eggPlugin": {
    "name": "ejs"
  },
  "keywords": ["egg", "egg-plugin", "egg-view", "ejs"]
}
```

* The configuration item is also named after the template engine

```js
// config/config.default.js
module.exports = {
  ejs: {}
};
```

## View base class

The next step is to provide a View base class that will be instantiated on each request.

The base class of the View needs to provide `render` and `renderString` methods and supports generator and async functions (it can also be a function that returns a Promise). The `render` method is used to render files, and the `renderString` method is used to render template strings.

The following is a simplified code that can be directly [view source](https://github.com/eggjs/egg-view-ejs/blob/master/lib/view.js)

```js
const ejs = require('ejs');

Mmdule.exports = class EjsView {
  render(filename, locals) {
    return new Promise((resolve, reject) => {
      // Asynchronous API call
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
      // Synchronous API call
      return Promise.resolve(ejs.render(tpl, locals));
    } catch (err) {
      return Promise.reject(err);
    }
  }
};
```

### Parameters

The three parameters of the `render` method are

* filename: is the path to the complete file. The framework determines if the file exists when it looks for the file. It does not need to be processed here.
* locals: The data needed for rendering. The data comes from `app.locals`, `ctx.locals` and calls `render` methods. The framework also has built in `ctx`, `request`, `ctx.helper` objects.
* viewOptions: The incoming configuration of the user, which can override the default configuration of the template engine. This can be considered based on the characteristics of the template engine. For example, the cache is enabled by default but a page does not need to be cached.

The three parameters of the `renderString` method

* tpl: template string, not file path
* locals: same with `render`
* viewOptions: same with `render`

## Plugin configuration

According to the naming conventions mentioned above, the configuration name is generally the name of the template engine, such as ejs

The configuration of the plugin mainly comes from the configuration of the template engine, and the configuration items can be defined according to the specific conditions, such as the [configuration of ejs](https://github.com/mde/ejs#options)

```js
// config/config.default.js
module.exports = {
  ejs: {
    cache: true
  }
};
```

### Helper

The framework provides `ctx.helper` for developer use, but in some cases we want to override the helper method and only take effect when the template is rendered.

In template rendering, we often need to output a user-supplied html fragment, in which case, we often use the `helper.shtml` provided by the `egg-security` plugin.

```html
<div>{{ helper.shtml(data.content) | safe }}</div>
```

However, as shown in the above code, we need to use `| safe` to tell the template engine that the html is safe and it doesn't need to run `escape` again.

This is more cumbersome to use and easy to forget, so we can package it:

First provide a helper subclass:

```js
// {plugin_root}/lib/helper.js
module.exports = app => {
  return class ViewHelper extends app.Helper {
    // safe is injected by [egg-view-nunjucks] and will not be escaped during rendering.
    // Otherwise, the template call shtml will be escaped
    shtml(str) {
      return this.safe(super.shtml(str));
    }
  };
};
```

Use a custom helper when rendering

```js
// {plugin_root}/lib/view.js
const ViewHelper = require('./helper');

module.exports = class MyCustomView {
  render(filename, locals) {
    locals.helper = new ViewHelper(this.ctx); // call Nunjucks render
  }
};
```

You can [view](https://github.com/eggjs/egg-view-nunjucks/blob/2ee5ee992cfd95bc0bb5b822fbd72a6778edb118/lib/view.js#L11) the specific code here

### Security Related

Templates and security are related and [egg-security] also provides some methods for the template. The template engine can be used according to requirements.

First declare a dependency on [egg-security]

```json
{
  "name": "egg-view-nunjucks",
  "eggPlugin": {
    "name": "nunjucks",
    "dep": ["security"]
  }
}
```

The framework provides [app.injectCsrf](../core/security.md#appinjectcsrfstr) and [app.injectNonce](../core/security.md#appinjectnonncestr), for more information on [security section](../core/security.md).

### Unit tests

As a high-quality plugin, perfect unit testing is indispensable, and we also provide a lot of auxiliary tools to make it painless for plugin developers to write tests, see [unit testing](../core/unittest.md) and [plugin](./plugin.md) docs.

[egg-security]: https://github.com/eggjs/egg-security
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[egg-view-ejs]: https://github.com/eggjs/egg-view-ejs
