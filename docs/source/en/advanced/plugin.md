
title: Plugin Development
---

Plugins is the most important feature in Egg framework. It keeps Egg simple, stable and effeciently, and also it can make the best reuse of bussiness logic, to build an entire ecosystem. Some should be get confused

- Since Koa have already got plugins, what's the point of the Egg plugins
- What is the differences between middleware, plugin and application, what is there relationships
- how do i use the plugin
- how do i build a plugin
- ...

As we've already explained some these points in Chapter [using plugins](../basics/plugin.md) before. Now we are going through how to build a plugin.

## Plugin Development

### Quick Start with Scaffold

you can chose [plugin][egg-boilerplate-plugin] scaffold in [egg-init] for quick start.

```bash
$ egg-init --type=plugin egg-hello
$ cd egg-hello
$ npm i
$ npm test
```

## Directory of Plugin

plugin is actually a 'mini application',  directory of plugin is as below

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

it is very likely to the application directory, what's the difference?  

1. Plugin have no seperated router and controller. this is because:

    - router is strongly binded to the apps normally, it is not fit here.
    - one application might be get a plenty of depending plugins, routers of plugin is very possible conflict with others.it will be a disaster.
    - if you really need a generally router, you should make it the middleware of the plugins.

2. the specific information of plugin should be declared in the  `package.json`  by `eggPlugin`：

    - `{String} name` - plugin name(required), it must be unique, it will be used in the configuration of the dependencies of plugin.
    - `{Array} dependencies` -  the required depending plugins of current plugin(if one of these plugin here missing, the start of this plugin will be failure)
    - `{Array} optionalDependencies` - this optional dependencies of this plugin.(if these plugins is not activated, only warnings, the application will rise as normal).
    - `{Array} env` - this option is avaliable only when specified the enviorment. the list of env please refer to [env](../basics/env.md). this is optional, most time you can leave it.

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

    - `eggPlugin.dependencies` is for declaration of dependencies only, not for importing ,nor activating.
    - if you want to manage multiple plugins,you should do it in[framework](./framework.md)

## Dependencies Management of Plugins

The dependencies is managed by plugin himself, this is different from middleware.Before loading plugins, the application will read `eggPlugin > dependencies` and `eggPlugin > optionalDependencies` from `package.json` of the plugins, and then sort out the loading orders accordingly, for example, the loading order of the following plugings is `c => b => a`

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

** Attention: the value in the `dependencies` and `optionalDependencies` is the `eggPlugin.name` of plugin, not `package.name`. **

the `dependencies` and `optionalDependencies` is studied from `npm`, most time we are using `dependencies`,it is recommanded.there are about 2 situation to apply the `optionalDependencies`:

- only got depended in very special situation: for example,a auth plugin,only depending the mock plugin in development enviroment.
- weakly depending, for example: A depned on B, but without B, A can make compromise

Pay attention: if you are using `optionalDependencies`, then framework won't verify the activation of these dependencies, they are only for sorting loading orders. In such situation, the depending plugin will go through other ways such as `interface detection` to operate.

## What are plugins capable of

We've disscussed what plugin is.Now what are them capable of?

### Embeded objects API Extension

Extend the embeded objects of the frameworks, just like the application

- `app/extend/request.js` - extends Koa#Request class
- `app/extend/response.js` - extends Koa#Response class
- `app/extend/context.js` - extends Koa#Context class
- `app/extend/helper.js ` - extends Helper class
- `app/extend/application.js` - extends Application class
- `app/extend/agent.js` - extends Agent class

### Insert Custom Middlewares

1. Implement middleware inside directory `app/middleware` first

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

2. Insert middleware to the appropriate position in `app.js` (for example:insert static middleware before bodyParser )

  ```js
  const assert = require('assert');

  module.exports = app => {
    // insert static before bodyParser 
    const index = app.config.coreMiddleware.indexOf('bodyParser');
    assert(index >= 0, 'bodyParser highly needed');

    app.config.coreMiddleware.splice(index, 0, 'static');
  };
  ```

### Initializations when Application Starting

- read some local configuration before starting

  ```js
  // ${plugin_root}/app.js
  const fs = require('fs');
  const path = require('path');

  module.exports = app => {
    app.customData = fs.readFileSync(path.join(app.config.baseDir, 'data.bin'));

    app.coreLogger.info('read data ok');
  };
  ```

- if you want some async starting bussiness, you can do it with `app.beforeStart` API

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

- also you can add agent starting bussiness with `agent.beforeStart` API

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

### Set Timing Task

1. Set schedule plugin depending in `

  ```json
  {
    "name": "your-plugin",
    "eggPlugin": {
      "name": "your-plugin",
      "dependencies": [ "schedule" ]
    }
  }
  ```

2. Create a new file under `${plugin_root}/app/schedule/` directory to edit your timing task

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

Some plugins are made to introduce existing service into framework, like [egg-mysql],[egg-oss].They all needed to create corresponding instance in app.We notice something when developing this kind of plugin:

- use different instances of the same service in a application(e.g:connect to 2 different MySQL Database)
- dynamically intialize connection after fetch configuration from other service(get MySQL server address from config center and then initialize the connection)

If each plugin make their own implementation,it will be terrible, so the framework supply the  `app.addSingleton(name, creator)` API to make these things clear.

#### Wirting Plugin

We have simplfied the [egg-mysql] and check how to write a plugin.

```js
// egg-mysql/app.js
module.exports = app => {
  // the 1st param mysql defined the property mounted to app, we can access MySQL singleton instance by `app.mysql`
  // the 2nd param createMysql accept 2 params (config, app), and then return a MySQL instance
  app.addSingleton('mysql', createMysql);
}

/**
 * @param  {Object} config   the config is already operated by the framework, if the application configured multiple MySQL instance, each config will be passed in and call the createMysql seperately
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

As you can see, all we needed to do in this plugin is passing in the property needed to be mounted and the corresponding initial function. The management of all these configs, the way to access the instance are all packed and supplied by the framework.。

#### Application Layer Use Case

##### Singelton

1. declare MySQL configure in config file

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

2. access database by `app.mysql` directly

```js
// app/controller/post.js
class PostController extends Controller {
  async list() {
    const posts = await this.app.mysql.query(sql, values);
  },
}
```

##### Multi Instances

1. of cause we need to define the MySQL in the config,but diffrent from singleton,we need a `clients` in the config to define each config of the instances, also we can use `default` to configure the default properties of all the instances(for example host and port). 

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

2. access the corresponding instance using `app.mysql.get('db1')` 

```js
// app/controller/post.js
class PostController extends Controller {
  async list() {
    const posts = await this.app.mysql.get('db1').query(sql, values);
  },
}
```

##### Dynamic Instantiate

We can alse dynamicly initialize the instance when runing the app, without configure in the config file.

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

**Attention, when creating the instance dynamicly, the framework would read the `default` property in the config file as the default configuration**

### Plugin Locate Rule

When loading the plugins in the framework, it will follow the rule to locate them as below:

- if there is the path config, load them in path directly
- if there is no path config, search them with their names, the search orders are:

  1. `node_modules` directory of the app root
  2. `node_modules` directory of the dependencies
  3. `node_modules` of current directory(generally for unit test compability)

###  Plugin Specification

We are looking forward your new plugins,at the same time we expect the plugins would follow the specification as below:

- Naming Specification
  - `npm` packages must append prefix `egg-`,and all letters should be lowcase,for example:`egg-xxx`.The long names should be concatenate with middlelines:`egg-foo-bar`
  - the corresponded plugin should be name as camlecase, the name should be transfered refer to the middlelines of the `npm` name:`egg-foo-bar` => `fooBar`
  - the use of middleline is not mandatory,for example:userservice(egg-userservice) and ser-service(egg-user-service) are both acceptable
- `package.json` Specification
  - add `eggPlugin` propertu according to the details mentioned in this doc before
  - for index conveniet, add `egg`,`egg-plugin`,`eggPlugin` in `keywords`

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

Egg define the plugin name by the `eggPlugin.name`, it is only unique in application or framework, that means **many npm packages may be got the same plugin name**, why design this way?

First, Egg plugin is not only support npm package, it also support search plugins in local directory.In Chapter [progressive](../tutorials/progressive.md) we mentioned how to make progress through these two configs. Directory is more friendly to unit test. So, Egg can not make uniqueness through npm package name. 

More important, Egg can use this feature to make Adapter. For example, the plugin defined in[Template Develop Spec](./view-plugin.md#PluginNameSpecification) was named as view, but there are plugins named `egg-view-nunjucks` and `egg-view-react`, we only need to change the plugin and modify the templates, no need to modify the Controller, because all the plugins have implemented the same API.

**Make the same featured plugins the same name and same API, can make quick switch**. This is really really useful in templates and database.

[egg-init]: https://github.com/eggjs/egg-init
[egg-boilerplate-plugin]: https://github.com/eggjs/egg-boilerplate-plugin
[egg-mysql]: https://github.com/eggjs/egg-mysql
[egg-oss]: https://github.com/eggjs/egg-oss
