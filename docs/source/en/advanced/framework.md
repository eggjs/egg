title: Framework Development
---

During maintaining a number of projects, are your familiar with situations below: 

- Each project contains the same configuration files that need to be copied every time, such as `gulpfile.js`, `webpack.config.js`.
- Each project has similiar dependancies.
- It's difficult to synchronize those projects based on the same configurations like those mentioned above once they have changed? 

Have your team got:

- a unified technique selection, such as the choice of databases, templates, frontend frameworks, and middlewares.
- a unified default configuration to balance the deviation of different situations, which are not supposed to resolve in code level, like the differences between companies and open communities.
- a unified [deployment plan](../core/deployment.md) keeping developers concentrate on code without paying attention to deployment details of connecting the framework and platforms.
- a unified code style to decrease code's repetition and optimize code's appearance, which is important for a enterprise level framework.

To satisfy these demands, Egg endows developers with the capacity of `customazing a framework`. It is just an abstract layer, which is able to construct a higher level framework, supporting inheritance of unlimited times. Futhermore, Egg apply a quantity of coding conventions based on Koa.

Therefore, a uniform spec can be applied on projects in which the differentiation fulfilled in plugins. And the best practice summed from those projects can continuously extracted from these plugins to the framework, which is available to other project by just updating the dependances' version.

See more details in [Progressive Development](../tutorials/progressive.md)。

## Framework And Multiprocess

The framework extension is applied to Multiprocess Model, as we know [Multiprocess Model](../core/cluster-and-ipc.md) and the diffirences between Agent Worker and App Worker, which have diffirent API and both need to inherit.

They both are inherited from [EggCore](https://github.com/eggjs/egg-core), and Agent is instantiated during the initiation of Agent Worker, while App is instantiated during the initiation of App Worker.

We could think about EggCore as the advanced version of Koa Application, which integrates built-in features such as [Loader](./loader.md)、[Router](../basics/router.md) and asynchronous launch.

```
       Koa Application
              ^
           EggCore
              ^
       ┌──────┴───────┐
       │              │
   Egg Agent      Egg Application
      ^               ^
 agent worker     app worker
```

## How To Customize A Framework

To setup by [egg-init](https://github.com/eggjs/egg-init) with the [framework](https://github.com/eggjs/egg-boilerplate-framework) option is a good way, in which generates a scaffold for you.

```bash
$ egg-init --type=framework yadan
$ cd yadan
$ npm i
$ npm test
```

But in order to illustrate details, let's do it step by step. Here is the [sample code](https://github.com/eggjs/examples/tree/master/framework).

### Framework API

Each of those APIs is required to be implemented almost twice - one for Agent and another for Application.

#### `egg.startCluster`

This is the entry function of Egg's multiprocess launcher, based on [egg-cluster](https://github.com/eggjs/egg-cluster), to start Master, but EggCore running in a single process doesn't invoke this function while Egg does.

```js
const startCluster = require('egg').startCluster;
startCluster({
  // directory of code
  baseDir: '/path/to/app',
  // directory of framework
  framework: '/path/to/framework',
}, () => {
  console.log('app started');
});
```

All available options could be found in [egg-cluster](https://github.com/eggjs/egg-cluster#options).

#### `egg.Application` And `egg.Agent`

These are both singletons but still different with each other. To inherit framework, it's likely to inherited these two classes.

#### `egg.AppWorkerLoader` and `egg.AgentWorkerLoader`

To customize framework, Loader is required and has to be inherited  from Egg Loader for the propose of either loading directories or rewriting functions.

### Framework Extension

If we consider a framework as a class, then Egg framework is the base class,and implementing a framework demands to implement entire APIs of Egg.

```js
// package.json
{
  "name": "yadan",
  "dependencies": {
    "egg": "^2.0.0"
  }
}

// index.js
module.exports = require('./lib/framework.js');

// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class Application extends egg.Application {
  get [EGG_PATH]() {
    // return the path of framework
    return path.dirname(__dirname);
  }
}

// rewrite Egg's Application
module.exports = Object.assign(egg, {
  Application,
});
```

The name of framework, default as `egg`, is a indispensable option to launch an application, set by `egg.framwork` of `package.json`, then Loader loads the exported app of a module named it.

```json
{
  "scripts": {
    "dev": "egg-bin dev"
  },
  "egg": {
    "framework": "yadan"
  }
}
```

As a loadUnit of framework, yadan is going to load specific directories and files, such as `app` and `config`. Find more files loaded at [Loader](./loader.md).

### Princeple of Framework Extension

The path of framework is set as a varible named as `Symbol.for('egg#eggPath') to expose itself to Loader. Why? It seems that the simplest way is to pass a param to the constructor. The reason is to expose those paths of each level of inherited frameworks and reserve their sequences. Since Egg is a framework capable of unlimited inheritance, each layer has to designate their own eggPath so that all the eggPaths are accessiable through the prototype chain.

Given a triple-layer framework: department level > enterprise level > Egg

```js
// enterprise
const Application = require('egg').Application;
class Enterprise extends Application {
  get [EGG_PATH]() {
    return '/path/to/enterprise';
  }
}
// Customize Application
exports.Application = Enterprise;

// department
const Application = require('enterprise').Application;
// extend enterprise's Application
class department extends Application {
  get [EGG_PATH]() {
    return '/path/to/department';
  }
}

// the path of `department` have to be designated as described above
const Application = require('department').Application;
const app = new Application();
app.ready();
```

These code are pseudocode to elaborate the framework's loading process, and we have provided scaffolds to [development](../core/development.md)和[deployment](../core/deployment.md).

### Custom Agent

Egg's mutilprocess model is composed of Application and Agent. Therefore Agent, another fundamental class similiar to Application, is also required to be implemented.

```js
// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class Application extends egg.Application {
  get [EGG_PATH]() {
    // return the path of framework
    return path.dirname(__dirname);
  }
}

class Agent extends egg.Agent {
  get [EGG_PATH]() {
    return path.dirname(__dirname);
  }
}

// rewrite Egg's Application
module.exports = Object.assign(egg, {
  Application,
  Agent,
});
```

** To be careful about that Agent and Application based on the same Class possess different APIs. **

### Custom Loader

Loader, the core of the launch process, is capable of loading data code, adjusting loading orders or even strengthen regulation of code.

As the same as Egg-Path, Loader exposes itself at `Symbol.for('egg#loader')` to ensuer it's accessibility on prototype chain.

```js
// lib/framework.js
const path = require('path');
const egg = require('egg');
const EGG_PATH = Symbol.for('egg#eggPath');

class YadanAppWorkerLoader extends egg.AppWorkerLoader {
  load() {
    super.load();
    // do something
  }
}

class Application extends egg.Application {
  get [EGG_PATH]() {
    // return the path of framework
    return path.dirname(__dirname);
  }
    // supplant default Loader
  get [EGG_LOADER]() {
    return YadanAppWorkerLoader;
  }
}

// rewrite Egg's Application
module.exports = Object.assign(egg, {
  Application,
  // custom Loader, a dependence of the high level frameword, needs to be exported.
  AppWorkerLoader: YadanAppWorkerLoader,
});
```

AgentworkerLoader is not going to be described because of it's similarity of AppWorkerLoader, but be aware of it's located at `agent.js` instand of `app.js`.

## The principle of Launch

Many descriptions of launch process are scattered at [Mutilprocess Model](../core/cluster-and-ipc.md), [Loader](./loader.md) and [Plugin](./plugin.md), and here is a summarization.

- `startCluster` is invoked with `baseDir` and `framework`, then Master process is launched.
- Master forks a new process as Agent Worker
  - instantiate Agent Class of the framework loaded from path passed by the `framework` param.
  - Agent finds out the AgentWorkerLoader and then starts to load
  - use AgentWorkerLoader to load Worker synchronously in the sequence of Plugin Config, Extend, `agent.js` and other files.
  - The initiation of `agent.js` is able to be customized, and it supports asynchronous launch after which it notifies Master and invoke the function passed to `beforeStart`.
- After recieving the message that Agent Worker is launched，Master forks App Workers by cluster.
  - App Workers are mutilple identical processes launched simultaneously
  - App Worker is instantiated, which is similiar to Agent inherited Application class of framework loaded from framework path.
  -  The same as Agent, Loading process of Application starts with AppWorkerLoader which loads files in the same order and finally informed Master.
- After informed of luanching successfully of each App Worker, Master is finally functioning.

## Framework Testing

You'd better read [unittest](../core/unittest.md) first, which is similiar to framework testing in a quantity of situations.

### Initiation

Here are some differences between initiation of frameworks.

```js
const mock = require('egg-mock');
describe('test/index.test.js', () => {
  let app;
  before(() => {
    app = mock.app({
      // test/fixtures/apps/example
      baseDir: 'apps/example',
      // importent !! Do not miss
      framework: true,
    });
    return app.ready();
  });

  after(() => app.close());
  afterEach(mock.restore);

  it('should success', () => {
    return app.httpRequest()
    .get('/')
    .expect(200);
  });
});
```

- Different from application testing, framework testing tests framework code instead of application code, so that baseDir varies for the propose of testing kinds of applications.
- BaseDir is potentially considered to be under the path of `test/fixtures`, otherwise it should be absolute paths.
- The `framework` option is indispensable, which could be a absolute path or `true` meaning the path of the framework to be current directory.
- The use of the app should wait for the `ready` event in `before` hook, or some of the APIs is not avaiable.
- Do not forget to invoke `app.close()` after testing, which could arouse the exhausting of fds, caused by unclosed log files.

### Cache

`mm.app` enables cache as default, which means new envoriment setting would not work once loaded.

```js
const mock = require('egg-mock');
describe('/test/index.test.js', () => {
  let app;
  afterEach(() => app.close());

  it('should test on local', () => {
    mock.env('local');
    app = mock.app({
      baseDir: 'apps/example',
      framework: true,
      cache: false,
    });
    return app.ready();
  });
  it('should test on prod', () => {
    mock.env('prod');
    app = mock.app({
      baseDir: 'apps/example',
      framework: true,
      cache: false,
    });
    return app.ready();
  });
});
```

### Multipleprocess Testing

Mutilprocess is rarely tested because of the high cost and the unavailability of API level's mock, meanwhile, processes have a slow start or even timeout, but it still remains the most effective way of testing multiprocess model.

The option of `mock.cluster` have no difference with `mm.app` while their APIs are totally distinct, however, SuperTest still works.

```js
const mock = require('egg-mock');
describe('/test/index.test.js', () => {
  let app;
  before(() => {
    app = mock.cluster({
      baseDir: 'apps/example',
      framework: true,
    });
    return app.ready();
  });
  after(() => app.close());
  afterEach(mock.restore);
  it('should success', () => {
    return app.httpRequest()
    .get('/')
    .expect(200);
  });
});
```

Tests of `stdout/stderr` are also avaiable, since `mm.cluster` is based on [coffee](https://github.com/popomore/coffee) in which multiprocess testing is supported.

```js
const mock = require('egg-mock');
describe('/test/index.test.js', () => {
  let app;
  before(() => {
    app = mock.cluster({
      baseDir: 'apps/example',
      framework: true,
    });
    return app.ready();
  });
  after(() => app.close());
  it('should get `started`', () => {
    // set the expectation of console
    app.expect('stdout', /started/);
  });
});
```

[egg-bin]: https://github.com/eggjs/egg-bin
