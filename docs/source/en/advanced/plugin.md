
title: Plugin Development
---

Plugins is the most important feature in Egg framework. It keeps Egg simple, stable and effecient, and also it can make the best reuse of business logic, to build an entire ecosystem. Someone should be got confused:

- Since Koa has already got the plugin feature, what's the point of the Egg plugins
- What is the differences between middleware, plugin and application, what is the relationship
- How can I use the plugin
- How do I build a plugin
- ...

As we've already explained some these points in Chapter [using plugins](../basics/plugin.md) before. Now we are going through how to build a plugin.

## Plugin Development

### Quick Start with Scaffold

You can choose [plugin][egg-boilerplate-plugin] scaffold in [egg-init] for quick start.

```bash
$ egg-init --type=plugin egg-hello
$ cd egg-hello
$ npm i
$ npm test
```

## Directory of Plugin

Plugin is actually a 'mini application', directory of plugin is as below

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

It is almost the same as the application directory, what's the difference?  

1. Plugin have no independant router or controller. This is because:

    - Usually routers are strongly bound to application, it is not fit here.
    - An application might have plenty of dependant plugins, routers of plugin are very possible conflict with others. It would be a disaster.
    - If you really need a general router, you should implement it as middleware of the plugin.

2. The specific information of plugin should be declared in the  `package.json`  by `eggPlugin`：

    - `{String} name` - plugin name(required), it must be unique, it will be used in the config of the dependencies of plugin.
    - `{Array} dependencies` - the list of strong dependant plugins of current plugin(if one of these plugins here is not found, application startup plugin will be failed)
    - `{Array} optionalDependencies` - this optional dependencies of this plugin.(if these plugins are not activated, only warnings would be occurred, and not affect the startup of the application).
    - `{Array} env` - this option is avaliable only when specified the enviroment. The list of env please refer to [env](../basics/env.md). This is optional, most time you can leave it.

    ```json
    {
      "name": "egg-rpc",
      "eggPlugin": {
        "name": "rpc",
        "dependencies": [ "registry" ],
        "optionalDependencies": [ "vip" ],
        "env": [ "local", "test", "unittest", "prod" ]
      }
    }
    ```

3. No `plugin.js`：

    - `eggPlugin.dependencies` is for declaring dependencies only, not for importing, nor activating.
    - If you want to manage multiple plugins, you should do it in[framework](./framework.md)

## Dependencies Management of Plugins

The dependencies are managed by plugin himself, this is different from middleware. Before loading plugins, application will read dependencies from `eggPlugin > dependencies` and `eggPlugin > optionalDependencies` in `package.json`, and then sort out the loading orders according to their relationships, for example, the loading order of the following plugins is `c => b => a`

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

** Attention: The values in `dependencies` and `optionalDependencies` are the `eggPlugin.name` of plugins, not `package.name`. **

The `dependencies` and `optionalDependencies` is studied from `npm`, most time we are using `dependencies`, it is recommended. There are about two situations to apply the `optionalDependencies`:

- Only get dependant in specific enviroment: for example, a authentication plugin, only depend on the mock plugin in development enviroment.
- Weakly depending, for example: A depned on B, but without B, A can take other choice

Pay attention: if you are using `optionalDependencies`, framework won't verify the activation of these dependencies, they are only for sorting loading orders. In such situation, the plugin will go through other ways such as `interface detection` to decide related logic.

## What is plugin capable of

We've discussed what plugin is. Now what is it capable of?

### Embeded Objects API Extension

Extend the embeded objects of the framework, just like the application 

- `app/extend/request.js` - extends Koa#Request
- `app/extend/response.js` - extends Koa#Response
- `app/extend/context.js` - extends Koa#Context
- `app/extend/helper.js ` - extends Helper
- `app/extend/application.js` - extends Application
- `app/extend/agent.js` - extends Agent

### Insert Custom Middlewares

1. First, define and implement middleware inside directory `app/middleware`

  ```js
  'use strict';

  const staticCache = require('koa-static-cache');
  const assert = require('assert');
  const mkdirp = require('mkdirp');

  module.exports = (options, app) => {
    assert.strictEqual(typeof options.dir, 'string', 'Must set `app.config.static.dir` when static plugin enable');

    // ensure directory exists
    mkdirp.sync(options.dir);

    app.loggers.coreLogger.info('[egg-static] starting static serve %s -> %s', options.prefix, options.dir);

    return staticCache(options);
  };
  ```

2. Insert middleware to the appropriate position in `app.js`(e.g. insert static middleware before bodyParser )

  ```js
  const assert = require('assert');

  module.exports = app => {
    // insert static before bodyParser 
    const index = app.config.coreMiddleware.indexOf('bodyParser');
    assert(index >= 0, 'bodyParser highly needed');

    app.config.coreMiddleware.splice(index, 0, 'static');
  };
  ```

### Initializations on Application Starting

- If you want to read some local config before startup

  ```js
  // ${plugin_root}/app.js
  const fs = require('fs');
  const path = require('path');

  module.exports = app => {
    app.customData = fs.readFileSync(path.join(app.config.baseDir, 'data.bin'));

    app.coreLogger.info('read data ok');
  };
  ```

- If you want to do some async starting bussiness, you can do it with `app.beforeStart` API

  ```js
  // ${plugin_root}/app.js
  const MyClient = require('my-client');

  module.exports = app => {
    app.myClient = new MyClient();
    app.myClient.on('error', err => {
      app.coreLogger.error(err);
    });
    app.beforeStart(async () => {
      await app.myClient.ready();
      app.coreLogger.info('my client is ready');
    });
  };
  ```

- You can add  starting bussiness of agent with `agent.beforeStart` API

  ```js
  // ${plugin_root}/agent.js
  const MyClient = require('my-client');

  module.exports = agent => {
    agent.myClient = new MyClient();
    agent.myClient.on('error', err => {
      agent.coreLogger.error(err);
    });
    agent.beforeStart(async () => {
      await agent.myClient.ready();
      agent.coreLogger.info('my client is ready');
    });
  };
  ```

### Setup Timing Task

1. Setup dependencies of schedule plugin in `package.json`

  ```json
  {
    "name": "your-plugin",
    "eggPlugin": {
      "name": "your-plugin",
      "dependencies": [ "schedule" ]
    }
  }
  ```

2. Create a new file in `${plugin_root}/app/schedule/` directory to edit your timing task

  ```js
  exports.schedule = {
    type: 'worker',
    cron: '0 0 3 * * *',
    // interval: '1h',
    // immediate: true,
  };

  exports.task = async ctx => {
    // your logic code
  };
  ```

### Best Practice of Global Instance Plugin

Some plugins are made to introduce existing service into framework, like [egg-mysql],[egg-oss].They all need to create corresponding instance in application. We notice something when developing this kind of plugins:

- Use different instances of the same service in one application(e.g:connect to two different MySQL Database)
- Dynamically intialize connection after get config from other service(get MySQL server address from config center and then initialize connection)

If each plugin make their own implementation, all sorts of configs  and initializations will be chaotic. So the framework supply the  `app.addSingleton(name, creator)` API to make it clear.

#### Writing Plugin

We have simplfied the [egg-mysql] plugin in order to use it in this tutorial

```js
// egg-mysql/app.js
module.exports = app => {
  // The first parameter mysql defined the field  mounted to app, we can access MySQL singleton instance by `app.mysql`
  // The second parameter createMysql accept 2 parameters (config, app), and then return a MySQL instance
  app.addSingleton('mysql', createMysql);
}

/**
 * @param  {Object} config   The config which already processed by the framework. If the application configured multiple MySQL instances, each config would be passed in and call the createMysql seperately
 * @param  {Application} app  the current application
 * @return {Object}          return the created MySQL instance
 */
function createMysql(config, app) {
  assert(config.host && config.port && config.user && config.database);
  // create instance
  const client = new Mysql(config);

  // check before start the application
  app.beforeStart(async function startMysql() {
    const rows = await client.query('select now() as currentTime;');
    const index = count++;
    app.coreLogger.info(`[egg-mysql] instance[${index}] status OK, rds currentTime: ${rows[0].currentTime}`);
  });

  return client;
}
```

As you can see, all we need to do for this plugin is passing in the field that needed to be mounted and the corresponding initialize function. Framework will be in charge of managing all the configs and the way to access the instances.

#### Application Layer Use Case

##### Singelton

1. Declare MySQL config in config file

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

2. Access database by `app.mysql` directly

```js
// app/controller/post.js
class PostController extends Controller {
  async list() {
    const posts = await this.app.mysql.query(sql, values);
  },
}
```

##### Multiple Instances

1. Of cause we need to configure MySQL in the config file, but diffrent from singleton, we need to add  `clients` in the config to configure each instance. The default configs(e.g. host and port) can be configured in `default` . 

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

2. Access the right instance by `app.mysql.get('db1')` 

```js
// app/controller/post.js
class PostController extends Controller {
  async list() {
    const posts = await this.app.mysql.get('db1').query(sql, values);
  },
}
```

##### Dynamically Instantiate

We can dynamically initialize instance without config when running the application.

```js
// app.js
module.exports = app => {
  app.beforeStart(async () => {
    //  get MySQL config from configcenter { host, post, password, ... }
    const mysqlConfig = await app.configCenter.fetch('mysql');
    // create MySQL instance dynamically
    app.database = app.mysql.createInstance(mysqlConfig);
  });
};
```

Access the instance by `app.database` 

```js
// app/controller/post.js
class PostController extends Controller {
  async list() {
    const posts = await this.app.databse.query(sql, values);
  },
}
```

**Attention, when creating the instance dynamically, framework would read the `default` property in the config file as the default config**

### Plugin Locate Rule

When loading the plugins in the framework, it will follow the rules to locate them as below:

- If there is the path config, load them in path directly
- If there is no path config, search them with the package name, the search orders are:

  1. `node_modules` directory of the application root
  2. `node_modules` directory of the dependencies
  3. `node_modules` of current directory(generally for unit test compability)

###  Plugin Specification

We are expecting people could build new plugins. In the meantime we hope these plugins could follow the rules as below: 

- Naming Rules
  - `npm` packages must append prefix `egg-`,and all letters must be lowcase,for example:`egg-xxx`. The long names should be concatenate with middlelines:`egg-foo-bar`.
  - The corresponding plugin should be named in camlecase. The name should be translated according to the middlelines of the `npm` name:`egg-foo-bar` => `fooBar`.
  - The use of middlelines is not mandatory,for example:userservice(egg-userservice) and ser-service(egg-user-service) are both acceptable.
- `package.json` Rules
  - Add `eggPlugin` property according to the details discussed before.
  - For index conveniet, add `egg`,`egg-plugin`,`eggPlugin` in `keywords`.

  ```json
  {
    "name": "egg-view-nunjucks",
    "version": "1.0.0",
    "description": "view plugin for egg",
    "eggPlugin": {
      "name": "nunjucks",
      "dep": [
        "security"
      ]
    },
    "keywords": [
      "egg",
      "egg-plugin",
      "eggPlugin",
      "egg-plugin-view",
      "egg-view",
      "nunjucks"
    ],
  }
  ```

##  Why do not use the npm package name as the plugin name?

Egg define the plugin name by the `eggPlugin.name`, it is only unique in application or framework, that means **many npm packages might get the same plugin name**, why design this way?

First, Egg plugin is not only support npm package, it also support search plugins in local directory. In Chapter [progressive](../tutorials/progressive.md) we mentioned how to make progress by using these two configs. Directory is more friendly to unit test. So, Egg can not ensure uniqueness through npm package name. 

More important, Egg can use this feature to make Adapter. For example, the plugin defined in[Template Develop Spec](./view-plugin.md#PluginNameSpecification) was named as view, but there are plugins named `egg-view-nunjucks` and `egg-view-react`, the users only need to change the plugin and modify the templates, no need to modify the Controller, because all these plugins have implemented the same API.

**Make the same featured plugins the same name and same API, can make quick switch between them**. This is really really useful in template and database.

[egg-init]: https://github.com/eggjs/egg-init
[egg-boilerplate-plugin]: https://github.com/eggjs/egg-boilerplate-plugin
[egg-mysql]: https://github.com/eggjs/egg-mysql
[egg-oss]: https://github.com/eggjs/egg-oss
