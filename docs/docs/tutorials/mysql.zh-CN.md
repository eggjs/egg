---
title: MySQL
---

在 Web 应用方面 MySQL 是最常见，最好的关系型数据库之一。非常多网站都选择 MySQL 作为网站数据库。

## egg-mysql

框架提供了 [egg-mysql] 插件来访问 MySQL 数据库。这个插件既可以访问普通的 MySQL 数据库，也可以访问基于 MySQL 协议的在线数据库服务。

### 安装与配置

安装对应的插件 [egg-mysql] ：

```bash
$ npm i --save egg-mysql
```

开启插件：

```js
// config/plugin.js
exports.mysql = {
  enable: true,
  package: 'egg-mysql',
};
```

在 `config/config.${env}.js` 配置各个环境的数据库连接信息。

#### 单数据源

如果我们的应用只需要访问一个 MySQL 数据库实例，可以如下配置：

```js
// config/config.${env}.js
exports.mysql = {
  // 单数据库信息配置
  client: {
    // host
    host: 'mysql.com',
    // 端口号
    port: '3306',
    // 用户名
    user: 'test_user',
    // 密码
    password: 'test_password',
    // 数据库名
    database: 'test',
  },
  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
};
```

使用方式：

```js
await app.mysql.query(sql, values); // 单实例可以直接通过 app.mysql 访问
```

#### 多数据源

如果我们的应用需要访问多个 MySQL 数据源，可以按照如下配置：

```js
exports.mysql = {
  clients: {
    // clientId, 获取client实例，需要通过 app.mysql.get('clientId') 获取
    db1: {
      // host
      host: 'mysql.com',
      // 端口号
      port: '3306',
      // 用户名
      user: 'test_user',
      // 密码
      password: 'test_password',
      // 数据库名
      database: 'test',
    },
    db2: {
      // host
      host: 'mysql2.com',
      // 端口号
      port: '3307',
      // 用户名
      user: 'test_user',
      // 密码
      password: 'test_password',
      // 数据库名
      database: 'test',
    },
    // ...
  },
  // 所有数据库配置的默认值
  default: {},

  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false,
};
```

使用方式：

```js
const client1 = app.mysql.get('db1');
await client1.query(sql, values);

const client2 = app.mysql.get('db2');
await client2.query(sql, values);
```

#### 动态创建

我们可以不需要将配置提前申明在配置文件中，而是在应用运行时动态的从配置中心获取实际的参数，再来初始化一个实例。

```js
// {app_root}/app.js
module.exports = (app) => {
  app.beforeStart(async () => {
    // 从配置中心获取 MySQL 的配置
    // { host: 'mysql.com', port: '3306', user: 'test_user', password: 'test_password', database: 'test' }
    const mysqlConfig = await app.configCenter.fetch('mysql');
    app.database = app.mysql.createInstance(mysqlConfig);
  });
};
```

## Service 层

由于对 MySQL 数据库的访问操作属于 Web 层中的数据处理层，因此我们强烈建议将这部分代码放在 Service 层中维护。

下面是一个 Service 中访问 MySQL 数据库的例子。

更多 Service 层的介绍，可以参考 [Service](../basics/service.md)

```js
// app/service/user.js
class UserService extends Service {
  async find(uid) {
    // 假如 我们拿到用户 id 从数据库获取用户详细信息
    const user = await this.app.mysql.get('users', { id: 11 });
    return { user };
  }
}
```

之后可以通过 Controller 获取 Service 层拿到的数据。

```js
// app/controller/user.js
class UserController extends Controller {
  async info() {
    const ctx = this.ctx;
    const userId = ctx.params.id;
    const user = await ctx.service.user.find(userId);
    ctx.body = user;
  }
}
```

## 如何编写 CRUD 语句

下面的语句若没有特殊注明，默认都书写在 `app/service` 下。

### Create

可以直接使用 `insert` 方法插入一条记录。

```js
// 插入
const result = await this.app.mysql.insert('posts', { title: 'Hello World' }); // 在 post 表中，插入 title 为 Hello World 的记录

=> INSERT INTO `posts`(`title`) VALUES('Hello World');

console.log(result);
=>
{
  fieldCount: 0,
  affectedRows: 1,
  insertId: 3710,
  serverStatus: 2,
  warningCount: 2,
  message: '',
  protocol41: true,
  changedRows: 0
}

// 判断插入成功
const insertSuccess = result.affectedRows === 1;
```

### Read

可以直接使用 `get` 方法或 `select` 方法获取一条或多条记录。`select` 方法支持条件查询与结果的定制。

- 查询一条记录

```js
const post = await this.app.mysql.get('posts', { id: 12 });

=> SELECT * FROM `posts` WHERE `id` = 12 LIMIT 0, 1;
```

- 查询全表

```js
const results = await this.app.mysql.select('posts');

=> SELECT * FROM `posts`;
```

- 条件查询和结果定制

```js
const results = await this.app.mysql.select('posts', { // 搜索 post 表
  where: { status: 'draft', author: ['author1', 'author2'] }, // WHERE 条件
  columns: ['author', 'title'], // 要查询的表字段
  orders: [['created_at','desc'], ['id','desc']], // 排序方式
  limit: 10, // 返回数据量
  offset: 0, // 数据偏移量
});

=> SELECT `author`, `title` FROM `posts`
  WHERE `status` = 'draft' AND `author` IN('author1','author2')
  ORDER BY `created_at` DESC, `id` DESC LIMIT 0, 10;
```

### Update

可以直接使用 `update` 方法更新数据库记录。

```js
// 修改数据，将会根据主键 ID 查找，并更新
const row = {
  id: 123,
  name: 'fengmk2',
  otherField: 'other field value',    // any other fields u want to update
  modifiedAt: this.app.mysql.literals.now, // `now()` on db server
};
const result = await this.app.mysql.update('posts', row); // 更新 posts 表中的记录

=> UPDATE `posts` SET `name` = 'fengmk2', `modifiedAt` = NOW() WHERE id = 123 ;

// 判断更新成功
const updateSuccess = result.affectedRows === 1;

// 如果主键是自定义的 ID 名称，如 custom_id，则需要在 `where` 里面配置
const row = {
  name: 'fengmk2',
  otherField: 'other field value',    // any other fields u want to update
  modifiedAt: this.app.mysql.literals.now, // `now()` on db server
};

const options = {
  where: {
    custom_id: 456
  }
};
const result = await this.app.mysql.update('posts', row, options); // 更新 posts 表中的记录

=> UPDATE `posts` SET `name` = 'fengmk2', `modifiedAt` = NOW() WHERE custom_id = 456 ;

// 判断更新成功
const updateSuccess = result.affectedRows === 1;
```

### Delete

可以直接使用 `delete` 方法删除数据库记录。

```js
const result = await this.app.mysql.delete('posts', {
  author: 'fengmk2',
});

=> DELETE FROM `posts` WHERE `author` = 'fengmk2';
```

## 直接执行 sql 语句

插件本身也支持拼接与直接执行 sql 语句。使用 `query` 可以执行合法的 sql 语句。

**注意！！我们极其不建议开发者拼接 sql 语句，这样很容易引起 sql 注入！！**

如果必须要自己拼接 sql 语句，请使用 `mysql.escape` 方法。

参考 [preventing-sql-injection-in-node-js](http://stackoverflow.com/questions/15778572/preventing-sql-injection-in-node-js)

```js
const postId = 1;
const results = await this.app.mysql.query('update posts set hits = (hits + ?) where id = ?', [1, postId]);

=> update posts set hits = (hits + 1) where id = 1;
```

## 使用事务

MySQL 事务主要用于处理操作量大，复杂度高的数据。比如说，在人员管理系统中，你删除一个人员，你既需要删除人员的基本资料，也要删除和该人员相关的信息，如信箱，文章等等。这时候使用事务处理可以方便管理这一组操作。
一个事务将一组连续的数据库操作，放在一个单一的工作单元来执行。该组内的每个单独的操作是成功，事务才能成功。如果事务中的任何操作失败，则整个事务将失败。

一般来说，事务是必须满足 4 个条件（ACID）： Atomicity（原子性）、Consistency（一致性）、Isolation（隔离性）、Durability（可靠性）

- 原子性：确保事务内的所有操作都成功完成，否则事务将被中止在故障点，以前的操作将回滚到以前的状态。
- 一致性：对于数据库的修改是一致的。
- 隔离性：事务是彼此独立的，不互相影响
- 持久性：确保提交事务后，事务产生的结果可以永久存在。

因此，对于一个事务来讲，一定伴随着 beginTransaction、commit 或 rollback，分别代表事务的开始，成功和失败回滚。

egg-mysql 提供了两种类型的事务。

### 手动控制

- 优点：`beginTransaction`, `commit` 或 `rollback` 都由开发者来完全控制，可以做到非常细粒度的控制。
- 缺点：手写代码比较多，不是每个人都能写好。忘记了捕获异常和 cleanup 都会导致严重 bug。

```js
const conn = await app.mysql.beginTransaction(); // 初始化事务

try {
  await conn.insert(table, row1); // 第一步操作
  await conn.update(table, row2); // 第二步操作
  await conn.commit(); // 提交事务
} catch (err) {
  // error, rollback
  await conn.rollback(); // 一定记得捕获异常后回滚事务！！
  throw err;
}
```

### 自动控制：Transaction with scope

- API：`beginTransactionScope(scope, ctx)`
  - `scope`: 一个 generatorFunction，在这个函数里面执行这次事务的所有 sql 语句。
  - `ctx`: 当前请求的上下文对象，传入 ctx 可以保证即便在出现事务嵌套的情况下，一次请求中同时只有一个激活状态的事务。
- 优点：使用简单，不容易犯错，就感觉事务不存在的样子。
- 缺点：整个事务要么成功，要么失败，无法做细粒度控制。

```js
const result = await app.mysql.beginTransactionScope(async (conn) => {
  // don't commit or rollback by yourself
  await conn.insert(table, row1);
  await conn.update(table, row2);
  return { success: true };
}, ctx); // ctx 是当前请求的上下文，如果是在 service 文件中，可以从 `this.ctx` 获取到
// if error throw on scope, will auto rollback
```

## 表达式(Literal)

如果需要调用 MySQL 内置的函数（或表达式），可以使用 `Literal`。

### 内置表达式

- `NOW()`：数据库当前系统时间，通过 `app.mysql.literals.now` 获取。

```js
await this.app.mysql.insert(table, {
  create_time: this.app.mysql.literals.now,
});

=> INSERT INTO `$table`(`create_time`) VALUES(NOW())
```

### 自定义表达式

下例展示了如何调用 MySQL 内置的 `CONCAT(s1, ...sn)` 函数，做字符串拼接。

```js
const Literal = this.app.mysql.literals.Literal;
const first = 'James';
const last = 'Bond';
await this.app.mysql.insert(table, {
  id: 123,
  fullname: new Literal(`CONCAT("${first}", "${last}"`),
});

=> INSERT INTO `$table`(`id`, `fullname`) VALUES(123, CONCAT("James", "Bond"))
```

[egg-mysql]: https://github.com/eggjs/egg-mysql
