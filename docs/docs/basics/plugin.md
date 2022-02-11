---
title: Plugin
order: 9
---

Plugin mechanism is a major feature of our framework. Not only can it ensure that the core of the framework is sufficiently streamlined, stable and efficient, but also can promote the reuse of business logic and the formation of an ecosystem. In the following sections, we will try to answer questions such as

- Koa already has a middleware mechanism, why plugins?
- What are the differences/relationship between middleware and plugins?
- How do I use a plugin?
- How do I write a plugin?
- ...

## Why plugins?

Here are some of the issues we think that can arise when using Koa middleware:

1.  Middleware loading is sequential and it is the user's responsibility to setup the execution sequence since middleware mechanism can not manage the actual order. This, in fact, is not very friendly. When the order is not correct, it can lead to unexpected results.
2.  Middleware positioning is geared towards intercepting user requests to add additional logic before or after such as: authentication, security checks, logging and so on. However, in some cases, such functionality can be unrelated to the request, for example, timing tasks, message subscriptions, back-end logic and so on.
3.  Some features include very complex initialization logic that needs to be done at application startup. This is obviously not suitable for middleware to achieve.

To sum up, we need a more powerful mechanism to manage, orchestrate those relatively independent business logic.

### The Relationship Between Middleware, Plugins and Application

A plugin is actually a "mini-application", almost the same as an app:

- It contains [Services](./service.md), [middleware](./middleware.md), [config](./config.md), [framework extensions](./extend.md), etc.
- It does not have separate [Router](./router.md) and [Controller](./controller.md).
- It does not have `plugin.js`, it could only define dependencies with others, but could not deside whether other plugin is enable or not.

Their relationship is:

- Applications can be directly introduced into Koa's middleware.
- When it comes to the scene mentioned in the previous section, the app needs to import the plugin.
- The plugin itself can contain middleware.
- Multiple plugins can be wrapped as an [upper frame](../advanced/framework.md).

## Using Plugins

Plugins are usually added via the npm module:

```bash
$ npm i egg-mysql --save
```

**Note: We recommend introducing dependencies in the `^` way, and locking versions are strongly discouraged.**

```json
{
  "dependencies": {
    "egg-mysql": "^ 3.0.0"
  }
}
```

Then you need to declare it in the `config / plugin.js` application or framework:

```js
// config / plugin.js
// Use mysql plugin
exports.mysql = {
  enable: true,
  package: 'egg-mysql',
};
```

You can directly use the functionality provided by the plugin:

```js
app.mysql.query(sql, values);
```

### Configuring Plugins

Each configuration item in `plugin.js` supports:

- `{Boolean} enable` - Whether to enable this plugin, the default is true
- `{String} package` -`npm` module name, plugin is imported via `npm` module
- `{String} path` - The plugin's absolute path, mutually exclusive with package configuration
- `{Array} env` - Only enable plugin in the specified runtime (environment), overriding the plugin's own configuration in `package.json`

### Enabling/Disabling plugins

The application does not need the package or path configuration when using the plugins built in the upper framework. You only need to specify whether they are enabled or not:

```js
// For the built-in plugin, you can use the following simple way to turn on or off
exports.onerror = false;
```

### Environment Configuration

We also support `plugin.{Env}.js`, which will load plugin configurations based on [Runtime](../basics/env.md).

For example, if you want to load the plugin `egg-dev` only in the local environment, you can install it to `devDependencies` and adjust the plugin configuration accordingly.

```js
// npm i egg-dev --save-dev
// package.json
{
  "devDependencies": {
    "egg-dev": "*"
  }
}
```

Then declare in `plugin.local.js`:

```js
// config / plugin.local.js
exports.dev = {
  enable: true,
  package: 'egg-dev',
};
```

In this way, `npm i --production` in the production environment does not need to download the`egg-dev` package.

**Note:**

- `plugin.default.js` does not exists. Use `local` for dev environments.

- Use this feature only in the application layer. Do not use it in the framework layer.

### Package Name and Path

- The `package` is introduced in the `npm` style which is the most common way to import
- `path` is an absolute path introduced when you want to load the plugin from different location such as when a plugin is still at the development stage or not available on `npm`
- To see the application of these two scenarios, please see [progressive development](../intro/progressive.md).

```js
// config / plugin.js
const path = require('path');
exports.mysql = {
  enable: true,
  path: path.join(__dirname, '../lib/plugin/egg-mysql'),
};
```

## Plugin Configuration

The plugin will usually contain its own default configuration, you can overwrite this in `config.default.js`:

```js
// config / config.default.js
exports.mysql = {
  client: {
    host: 'mysql.com',
    port: '3306',
    user: 'test_user',
    password: 'test_password',
    database: 'test',
  },
};
```

Specific consolidation rules can be found in [Configuration](./config.md).

## Plugin List

- Framework has default built-in plugins for enterprise applications [Common plugins](https://eggjs.org/zh-cn/plugins/):
    - [onerror](https://github.com/eggjs/egg-onerror) Uniform Exception Handling
    - [Session](https://github.com/eggjs/egg-session) Session implementation
    - [i18n](https://github.com/eggjs/egg-i18n) Multilingual
    - [watcher](https://github.com/eggjs/egg-watcher) File and folder monitoring
    - [multipart](https://github.com/eggjs/egg-multipart) File Streaming Upload
    - [security](https://github.com/eggjs/egg-security) Security
    - [development](https://github.com/eggjs/egg-development) Development Environment Configuration
    - [logrotator](https://github.com/eggjs/egg-logrotator) Log segmentation
    - [schedule](https://github.com/eggjs/egg-schedule) Timing tasks
    - [static](https://github.com/eggjs/egg-static) Static server
    - [jsonp](https://github.com/eggjs/egg-jsonp) jsonp support
    - [view](https://github.com/eggjs/egg-view) Template Engine
- More community plugins can be found on GitHub [egg-plugin](https://github.com/topics/egg-plugin).

## Developing a Plugin

See the documentation [plugin development](../advanced/plugin.md).
