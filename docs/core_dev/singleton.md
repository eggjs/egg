# singleton 单例模式

egg 的许多插件都有单例模式的需求，例如：mysql, oss, mongodb 等等，我们常常会通过实现插件的方式来给 egg 加上这些功能。
但是由于这些单例模式往往又要支持多实例的形式，例如一个项目中可能用到多个 mysql 的数据库，用到多个 oss bucket，
这时如果任由各个插件自己实现，各种配置和接口都会五花八门，因此 egg 提供了一套统一的通用单例实现实践。

## app.addSingleton(name, create)

在 `app` 和 `agent` 实例上，egg 都提供了一个 `addSingleton` 的方法，
通过这个方法，我们可以创建一个支持单实例、多实例和动态创建实例的单例。同时也能统一各个单例的配置。

### 用户配置和接口

假设我们要添加的单例名称为 `mysql`，我们可以通过 `app.addSingleton('mysql', createMysql)` 方法来创建 `app.mysql` 单例。

#### 配置

用户的配置中可以配置是单实例还是多实例，同时还可以配置这些实例的公共配置：

```js
// 单实例
exports.mysql = {
  client: {
    host: 'host',
    port: 'port',
    user: 'user',
    password: 'password',
    database: 'database',
  },
};

// 多实例
exports.mysql = {
  clients: {
    db1: {
      host: 'host',
      port: 'port',
      database: 'db1',
    },    
    db1: {
      host: 'host',
      port: 'port',
      database: 'db2',
    },
  },

  // 多实例共享的默认配置
  default: {
    user: 'user',
    password: 'password',
  },
};
```

通过 `default` 指定的默认配置不仅仅可以在多实例的时候生效，在单实例以及后面将会提到的动态创建实例中也会生效，这样我们在编写插件的时候可以通过指定 `default` 参数来给所有的实例都设置这些默认配置。

#### 使用

由于大部分情况下，我们都只需要使用单实例，因此 egg 对单实例场景做了特殊优化，如果配置中配置成单实例了，那我们可以直接通过 `app.mysql` 获取到这个实例：

```js
const data = yield app.mysql.query('select * from table limit 10');
```

而当用户配置了多个实例的时候，我们需要通过配置中的 client key 来获取对应的实例：

```js
const db1 = app.mysql.get('db1');
const data = yield db1('select * from table limit 10');
```

有时候我们并没有办法在配置中就写明各个实例的配置，我们可以通过动态创建的方式来实现（注意，不管是用户配置成单实例还是多实例，动态创建的方法一定会存在，而且会继承配置中的默认配置）。

```js
app.db3 = app.mysql.createInstance({
  host: 'host',
  port: 'port',
  database: 'db3',
});
```

### 插件示例

下面我们通过一个简单的示例插件来展示一下怎样通过 `app.addSingleton` 编写一个单例插件。

- create.js

```js
class DataService {
  constructor(config) {
    this.config = config;
  }

  * getConfig() {
    return this.config;
  }

  ready(done) {
    setTimeout(done, 1000);
  }
}

let count = 0;
module.exports = function create(config, app) {
  const done = app.readyCallback(`DataService-${count++}`);
  const dataService = new DataService(config);
  dataService.ready(done);
  return dataService;
};
```

- app.js

```js
const createDataService = require('./create');
module.exports = function(app) {
  app.addSingleton('dataService', createDataService);  
};
```

- agent.js

```js
const createDataService = require('./create');
module.exports = function(agent) {
  agent.addSingleton('dataService', createDataService);  
};
```

通过上面三个文件，我们就可以将 `DataService` 创建成 `[app|agent].dataService` 单例，并提供给用户上面描述的配置方式和接口。
更详细的使用方式可以参照 [egg-mysql](https://github.com/egg/egg-mysql) 的实现。
