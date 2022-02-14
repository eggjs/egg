---
title: Plugin Development
order: 2
---

Plugins are the most important features in Egg framework. They keep Egg simple, stable and efficient, and also they make the best reuse of business logic to build an entire ecosystem. Maybe we want to ask:

- Since Koa already has the mechanism of middleware, Why do we need plugins?
- What are the differences / relationships among middlewares, plugins and applications?
- How can I use the plugin?
- How do I build a plugin?
- ...

As we've already explained some these points in chapter [using plugins](../basics/plugin.md) before. Now we are going through how to build a plugin.

## Plugin Development

### Quick Start with Scaffold

Just use [egg-boilerplate-plugin] to generates a scaffold for you.

```bash
$ mkdir egg-hello && cd egg-hello
$ npm init egg --type=plugin
$ npm i
$ npm test
```

## Directory of Plugin

Plugin is actually a `mini application`, directory of plugin is as below:

```js
. egg-hello
├── package.json
├── app.js (optional)
├── agent.js (optional)
├── app
│   ├── extend (optional)
│   |   ├── helper.js (optional)
│   |   ├── request.js (optional)
│   |   ├── response.js (optional)
│   |   ├── context.js (optional)
│   |   ├── application.js (optional)
│   |   └── agent.js (optional)
│   ├── service (optional)
│   └── middleware (optional)
│       └── mw.js
├── config
|   ├── config.default.js
│   ├── config.prod.js
|   ├── config.test.js (optional)
|   ├── config.local.js (optional)
|   └── config.unittest.js (optional)
└── test
    └── middleware
        └── mw.test.js
```

It is almost the same as the application directory, what're the differences?

1. Plugin have no independant router or controller. This is because:

   - Usually routers are strongly bound to application, it is not fit here.
   - An application might have plenty of dependant plugins, routers of plugin are very possible conflict with others. It would be a disaster.
   - If you really need a general router, you should implement it as middleware of the plugin.

2. The specific information of plugin should be declared in the `package.json` of `eggPlugin`：

   - `{String} name` - plugin name(required), it must be unique, it will be used in the config of the dependencies of plugins.
   - `{Array} dependencies` - strong dependent plugins list of the current plugin(if one of these plugins here is not found, application's startup will fail).
   - `{Array} optionalDependencies` - optional dependencies list of this plugin.(if these plugins are not activated, only warnings would be occurred, and will not affect the startup of the application).
   - `{Array} env` - this option is available only when specifying the environment. For the list of env, please refer to [env](../basics/env.md). This is optional, most time you can leave it.

     ```json
     {
       "name": "egg-rpc",
       "eggPlugin": {
         "name": "rpc",
         "dependencies": ["registry"],
         "optionalDependencies": ["vip"],
         "env": ["local", "test", "unittest", "prod"]
       }
     }
     ```

3. No `plugin.js`：

   - `eggPlugin.dependencies` is for declaring dependencies only, not for importing, nor activating.
   - If you want to manage multiple plugins, you should do it in[upper framework](./framework.md)

## Dependencies Management of Plugins

The dependencies are managed by plugin himself, which is different from middlewares. Before loading plugins, application will read `eggPlugin > dependencies` and `eggPlugin > optionalDependencies` from `package.json`, and then sort out the loading orders according to their relationships, for example, the loading order of the following plugins is `c => b => a`:

```json
// plugin a
{
  "name": "egg-plugin-a",
  "eggPlugin": {
    "name": "a",
    "dependencies": [ "b" ]
  }
}

// plugin b
{
  "name": "egg-plugin-b",
  "eggPlugin": {
    "name": "b",
    "optionalDependencies": [ "c" ]
  }
}

// plugin c
{
  "name": "egg-plugin-c",
  "eggPlugin": {
    "name": "c"
  }
}
```

**Attention: The values in `dependencies` and `optionalDependencies` are the `eggPlugin.name` of plugins, not `package.name`.**

The `dependencies` and `optionalDependencies` are learnt from `npm`, most time we use `dependencies`, which is recommended. There are about two situations to apply the `optionalDependencies`:

- Only be dependant in specific environment: for example, an authentication plugin, only depends on the mock plugin in development environment.
- Weakly depending, for example: A depends on B, but without B, A can take other choices.

Attention: if you are using `optionalDependencies`, framework won't verify the activation of these dependencies, they are only for sorting loading orders. In such situation, the plugin will go through other ways such as `interface detection` to decide processing logic.

## What can Plugin Do?

We've discussed what plugin is. Now what can it do?

### Built-in Objects API Extensions

Extend the built-in objects of the framework, just like the application

- `app/extend/request.js` - extends Koa#Request object
- `app/extend/response.js` - extends Koa#Response object
- `app/extend/context.js` - extends Koa#Context object
- `app/extend/helper.js ` - extends Helper object
- `app/extend/application.js` - extends Application object
- `app/extend/agent.js` - extends Agent object

### Insert Custom Middlewares

1. First, define and implement middleware under directory `app/middleware`:

   ```js
   'use strict';

   const staticCache = require('koa-static-cache');
   const assert = require('assert');
   const mkdirp = require('mkdirp');

   module.exports = (options, app) => {
     assert.strictEqual(
       typeof options.dir,
       'string',
       'Must set `app.config.static.dir` when static plugin enable',
     );

     // ensure directory exists
     mkdirp.sync(options.dir);

     app.loggers.coreLogger.info(
       '[egg-static] starting static serve %s -> %s',
       options.prefix,
       options.dir,
     );

     return staticCache(options);
   };
   ```

2. Insert middleware to the appropriate position in `app.js`(e.g. insert static middleware before bodyParser):

   ```js
   const assert = require('assert');

   module.exports = (app) => {
     // insert static middleware before bodyParser
     const index = app.config.coreMiddleware.indexOf('bodyParser');
     assert(index >= 0, 'bodyParser highly needed');

     app.config.coreMiddleware.splice(index, 0, 'static');
   };
   ```

### Initialization on Application Starting

- If you want to read some local config before startup:

  ```js
  // ${plugin_root}/app.js
  const fs = require('fs');
  const path = require('path');

  module.exports = (app) => {
    app.customData = fs.readFileSync(path.join(app.config.baseDir, 'data.bin'));

    app.coreLogger.info('read data ok');
  };
  ```

- If you want to do some async starting business, you can do it with `app.beforeStart` API:

  ```js
  // ${plugin_root}/app.js
  const MyClient = require('my-client');

  module.exports = (app) => {
    app.myClient = new MyClient();
    app.myClient.on('error', (err) => {
      app.coreLogger.error(err);
    });
    app.beforeStart(async () => {
      await app.myClient.ready();
      app.coreLogger.info('my client is ready');
    });
  };
  ```

- You can add initialization business of agent with `agent.beforeStart` API:

  ```js
  // ${plugin_root}/agent.js
  const MyClient = require('my-client');

  module.exports = (agent) => {
    agent.myClient = new MyClient();
    agent.myClient.on('error', (err) => {
      agent.coreLogger.error(err);
    });
    agent.beforeStart(async () => {
      await agent.myClient.ready();
      agent.coreLogger.info('my client is ready');
    });
  };
  ```

### Setup Schedule Task

1. Setup dependencies of schedule plugin in `package.json`:

   ```json
   {
     "name": "your-plugin",
     "eggPlugin": {
       "name": "your-plugin",
       "dependencies": ["schedule"]
     }
   }
   ```

2. Create a new file in `${plugin_root}/app/schedule/` directory to edit your schedule task:

   ```js
   exports.schedule = {
     type: 'worker',
     cron: '0 0 3 * * *',
     // interval: '1h',
     // immediate: true,
   };

   exports.task = async (ctx) => {
     // your logic code
   };
   ```

### Best Practice of Global Instance Plugins

Some plugins are made to introduce existing service into framework, like [egg-mysql], [egg-oss].They all need to create corresponding instances in applications. We notice that there are some common problems when developing plugins of this kind:

- Use different instances of the same service in one application (e.g: connect to two different MySQL databases).
- Dynamically initialize connection after getting config from other service (e.g: get the MySQL server address from configuration center and then create connection).

If each plugin makes their own implementation, all sorts of configs and initializations will be chaotic. So the framework supplies the `app.addSingleton(name, creator)` API to unify the creation of this kind of services. Note that while using the `app.addSingleton(name, creator)` method, the configuration file must have the `client` or `clients` key configuration as the `config` to the `creator` function.

#### Ways of writing plugins

We simplify the [egg-mysql] plugin to see how to write it:

```js
// egg-mysql/app.js
module.exports = (app) => {
  // The first parameter mysql defines the field  mounted to app, we can access MySQL singleton instance via `app.mysql`
  // The second parameter createMysql accepts two parameters (config, app), and then returns a MySQL instance
  app.addSingleton('mysql', createMysql);
};

/**
 * @param  {Object} config   The config is processed by the framework. If the application is configured with multiple MySQL instances, each config would be passed in and call multiple createMysql
 * @param  {Application} app  the current application
 * @return {Object}          return the created MySQL instance
 */
function createMysql(config, app) {
  assert(config.host && config.port && config.user && config.database);
  // create instance
  const client = new Mysql(config);

  // check before start the application
  app.beforeStart(async () => {
    const rows = await client.query('select now() as currentTime;');
    app.coreLogger.info(
      `[egg-mysql] init instance success, rds currentTime: ${rows[0].currentTime}`,
    );
  });

  return client;
}
```

The initialization function also supports `Async function`, convenient for some special plugins that need to be asynchronous to get some configuration files.

```js
async function createMysql(config, app) {
  // get mysql configurations asynchronous
  const mysqlConfig = await app.configManager.getMysqlConfig(config.mysql);
  assert(
    mysqlConfig.host &&
      mysqlConfig.port &&
      mysqlConfig.user &&
      mysqlConfig.database,
  );
  // create instance
  const client = new Mysql(mysqlConfig);

  // check before start the application
  const rows = await client.query('select now() as currentTime;');
  app.coreLogger.info(
    `[egg-mysql] init instance success, rds currentTime: ${rows[0].currentTime}`,
  );

  return client;
}
```

As you can see, all we need to do for this plugin is passing the fields that need to be mounted and the corresponding initialization function. Framework will be in charge of managing all the configs and the ways to access the instances.

#### Application Layer Usage Case

##### Single Instance

1. Declare MySQL config in config file:

   ```js
   // config/config.default.js
   module.exports = {
     mysql: {
       client: {
         host: 'mysql.com',
         port: '3306',
         user: 'test_user',
         password: 'test_password',
         database: 'test',
       },
     },
   };
   ```

2. Access database through `app.mysql` directly:

   ```js
   // app/controller/post.js
   class PostController extends Controller {
     async list() {
       const posts = await this.app.mysql.query(sql, values);
     },
   }
   ```

##### Multiple Instances

1. We need to configure MySQL in the config file, but different from single instance, we need to add `clients` in the config to declare the configuration of different instances. Meanwhile, the `default` field can be used to configure the shared configuration in multiple instances (e.g: `host` and `port`). In this case, we should use `get` function to specify the corresponding instance(e.g: use `app.mysql.get('db1').query()` instead of using `app.mysql.query()` directly to get an `undefined`).

   ```js
   // config/config.default.js
   exports.mysql = {
     clients: {
       // clientId, access the client instance by app.mysql.get('clientId')
       db1: {
         user: 'user1',
         password: 'upassword1',
         database: 'db1',
       },
       db2: {
         user: 'user2',
         password: 'upassword2',
         database: 'db2',
       },
     },
     // default configuration for all databases
     default: {
       host: 'mysql.com',
       port: '3306',
     },
   };
   ```

2. Access the corresponding instance by `app.mysql.get('db1')`:

   ```js
   // app/controller/post.js
   class PostController extends Controller {
     async list() {
       const posts = await this.app.mysql.get('db1').query(sql, values);
     },
   }
   ```

##### Dynamically Instantiating

Instead of declaring the configuration in the configuration file in advance, we can dynamically initialize an instance at the runtime of the application.

```js
// app.js
module.exports = (app) => {
  app.beforeStart(async () => {
    //  get MySQL config from configuration center { host, post, password, ... }
    const mysqlConfig = await app.configCenter.fetch('mysql');
    // create MySQL instance dynamically
    app.database = app.mysql.createInstanceAsync(mysqlConfig);
  });
};
```

Access the instance through `app.database`

```js
// app/controller/post.js
class PostController extends Controller {
  async list() {
    const posts = await this.app.database.query(sql, values);
  },
}
```

**Attention: when creating the instance dynamically, framework would read the `default` configuration from the config file as the default.**

### Plugin Locate Rule

When loading the plugins in the framework, it will follow the rules below:

- If there is the path configuration, load them in path directly.
- If there is no path configuration, search them with the package name, the search orders are:

  1. `node_modules` directory of the application root
  2. `node_modules` directory of the dependencies
  3. `node_modules` of current directory(generally for unit test compatibility)

### Plugin Specification

It's well welcomed to your contributions to the new plugins, but also hope you follow some of following specifications:

- Naming Rules:
  - `npm` packages must append prefix `egg-`,and all letters must be lowercase, e.g: `egg-xxx`. The long names should be concatenated with middle-lines: `egg-foo-bar`.
  - The corresponding plugin should be named in camel-case. The name should be translated according to the middle-lines of the `npm` name:`egg-foo-bar` => `fooBar`.
  - The use of middle-lines is not compulsive, e.g: userservice(egg-userservice) and user-service(egg-user-service) are both acceptable.
- `package.json` Rules:

  - Add `eggPlugin` property according to the details discussed before.
  - For convenient index, add `egg`,`egg-plugin`,`eggPlugin` in `keywords`:

    ```json
    {
      "name": "egg-view-nunjucks",
      "version": "1.0.0",
      "description": "view plugin for egg",
      "eggPlugin": {
        "name": "nunjucks",
        "dep": ["security"]
      },
      "keywords": [
        "egg",
        "egg-plugin",
        "eggPlugin",
        "egg-plugin-view",
        "egg-view",
        "nunjucks"
      ]
    }
    ```

## Why Do Not Use the `npm` Package Name as the Plugin Name?

Egg defines the plugin name through the `eggPlugin.name`, it is only unique in application or framework, that means **many npm packages might get the same plugin name**, why design in this way?

First, Egg plugin does not only support npm packages, but also supports plugins-searching in local directory. In Chapter [progressive](../intro/progressive.md) we've mentioned how to make progress by using these two configurations. Directories are more friendly to unit tests. So, Egg can not ensure uniqueness through npm package names.

What's more, Egg can use this feature to make an adapter, for example, the plugin defined in[Template Develop Spec](./view-plugin.md#PluginNameSpecification) was named as view, but there are plugins named `egg-view-nunjucks` and `egg-view-react`, the users only need to change the plugin and modify the templates, no need to modify the controllers, because all these plugins have implemented the same APIs.

**Giving the same plugin name and the same API to the same plugin can make quick switch between them**. This is really really useful in template and database.

[egg-boilerplate-plugin]: https://github.com/eggjs/egg-boilerplate-plugin
[egg-mysql]: https://github.com/eggjs/egg-mysql
[egg-oss]: https://github.com/eggjs/egg-oss
