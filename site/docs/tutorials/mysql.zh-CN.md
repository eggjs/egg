---
title: MySQL
---

在 Web 应用方面，MySQL 是最常见且最优秀的关系型数据库之一。许多网站选择 MySQL 作为网站数据库。

## egg-mysql

框架提供了 [egg-mysql] 插件来访问 MySQL 数据库。这个插件既可以访问普通的 MySQL 数据库，也可以访问基于 MySQL 协议的在线数据库服务。

### 安装与配置

安装对应的插件 [egg-mysql]：

```bash
$ npm i --save egg-mysql
```

开启插件：

```js
// config/plugin.js
exports.mysql = {
  enable: true,
  package: 'egg-mysql'
};
```

在 `config/config.${env}.js` 中配置各个环境的数据库连接信息。

#### 单数据源

如果我们的应用只需要访问一个 MySQL 数据库实例，可以按以下方式配置：

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
    database: 'test'
  },
  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false
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
    // clientId, 获取 client 实例，需通过 app.mysql.get('clientId') 获取
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
    database: 'test'
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
    database: 'test'
    }
    // ...
  },
  // 所有数据库配置的默认值
  default: {},

  // 是否加载到 app 上，默认开启
  app: true,
  // 是否加载到 agent 上，默认关闭
  agent: false
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

我们也可以不在配置文件中预先声明配置，而是在应用运行时动态地从配置中心获取实际参数，然后初始化一个实例。

```js
// {app_root}/app.js
module.exports = app => {
  app.beforeStart(async () => {
    // 从配置中心获取 MySQL 的配置
    // { host: 'mysql.com', port: '3306', user: 'test_user', password: 'test_password', database: 'test' }
    const mysqlConfig = await app.configCenter.fetch('mysql');
    app.database = app.mysql.createInstance(mysqlConfig);
  });
};
```

[egg-mysql]: https://github.com/eggjs/egg-mysql "egg-mysql"
## Service 层

由于对 MySQL 数据库的访问操作属于 Web 层中的数据处理层，因此我们强烈建议将这部分代码放在 Service 层中维护。

下面是一个 Service 中访问 MySQL 数据库的例子。

更多 Service 层的介绍，可以参考 [Service](../basics/service.md)。

```js
// app/service/user.js
class UserService extends Service {
  async find(uid) {
    // 假如我们拿到用户 id，从数据库获取用户详细信息
    const user = await this.app.mysql.get('users', { id: uid });
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

在上述代码中，我们首先在 Service 层中定义了一个名为 `UserService` 的类，该类继承自 Service 基类。在 `UserService` 类中，我们定义了一个异步方法 `find`，该方法通过调用 `this.app.mysql.get` 方法从 `users` 表中获取到了 id 等于 uid 参数的用户数据，在获取数据后将用户信息以对象的形式返回。在 Controller 层，我们定义了一个名为 `UserController` 的类，该类继承自 Controller 基类。在 `UserController` 类中，我们定义了一个异步方法 `info`，该方法从上下文 `ctx` 中获取到了用户 ID，然后通过调用 `ctx.service.user.find` 方法获取到了用户信息，并最终将这个用户信息赋值给响应体 `ctx.body`。通过这种方式，我们就可以在 Controller 层中获取 Service 层提供的数据，从而实现层与层之间的数据传递和业务逻辑的分离。
## 如何编写 CRUD 语句

下面的语句，若没有特殊注明，默认都书写在 `app/service` 下。

### Create

可以直接使用 `insert` 方法插入一条记录。

```js
// 插入
const result = await this.app.mysql.insert('posts', { title: 'Hello World' }); // 在 posts 表中，插入 title 为 Hello World 的记录

// SQL 语句相当于
// INSERT INTO `posts`(`title`) VALUES('Hello World');

console.log(result);
// 输出为
// {
//   fieldCount: 0,
//   affectedRows: 1,
//   insertId: 3710,
//   serverStatus: 2,
//   warningCount: 2,
//   message: '',
//   protocol41: true,
//   changedRows: 0
// }

// 判断插入成功
const insertSuccess = result.affectedRows === 1;
```

### Read

可以直接使用 `get` 方法或 `select` 方法获取一条或多条记录。`select` 方法支持条件查询与结果定制。
可以使用 `count` 方法对查询结果的所有行进行计数。

- 查询一条记录

```js
const post = await this.app.mysql.get('posts', { id: 12 });

// SQL 语句相当于
// SELECT * FROM `posts` WHERE `id` = 12 LIMIT 0, 1;
```

- 查询全表

```js
const results = await this.app.mysql.select('posts');

// SQL 语句相当于
// SELECT * FROM `posts`;
```

- 条件查询和结果定制

```js
const results = await this.app.mysql.select('posts', { // 搜索 posts 表
  where: { status: 'draft', author: ['author1', 'author2'] }, // WHERE 条件
  columns: ['author', 'title'], // 要查询的字段
  orders: [['created_at','desc'], ['id','desc']], // 排序方式
  limit: 10, // 返回数据量
  offset: 0, // 数据偏移量
});

// SQL 语句相当于
// SELECT `author`, `title` FROM `posts`
// WHERE `status` = 'draft' AND `author` IN('author1','author2')
// ORDER BY `created_at` DESC, `id` DESC LIMIT 0, 10;
```

- 统计查询结果的行数

```js
const total = await this.app.mysql.count('posts', { status: 'published' }); // 统计 posts 表中 status 为 published 的行数

// SQL 语句相当于
// SELECT COUNT(*) FROM `posts` WHERE `status` = 'published'
```

### Update

可以直接使用 `update` 方法更新数据库记录。

```js
// 修改数据
const row = {
  id: 123,
  name: 'fengmk2',
  otherField: 'other field value', // 其他想要更新的字段
  modifiedAt: this.app.mysql.literals.now, // 数据库服务器上的当前时间
};
const result = await this.app.mysql.update('posts', row); // 更新 posts 表中的记录

// SQL 语句相当于
// UPDATE `posts` SET `name` = 'fengmk2', `modifiedAt` = NOW() WHERE `id` = 123;

// 判断更新成功
const updateSuccess = result.affectedRows === 1;

// 如果主键是自定义的 ID 名称，如 custom_id，则需要在 `where` 里配置
const row2 = {
  name: 'fengmk2',
  otherField: 'other field value', // 其他想要更新的字段
  modifiedAt: this.app.mysql.literals.now, // 数据库服务器上的当前时间
};

const options = {
  where: {
    custom_id: 456
  }
};
const result2 = await this.app.mysql.update('posts', row2, options); // 更新 posts 表中的记录

// SQL 语句相当于
// UPDATE `posts` SET `name` = 'fengmk2', `modifiedAt` = NOW() WHERE `custom_id` = 456 ;

// 判断更新成功
const updateSuccess2 = result2.affectedRows === 1;
```

### Delete

可以直接使用 `delete` 方法删除数据库记录。

```js
const result = await this.app.mysql.delete('posts', {
  author: 'fengmk2',
});

// SQL 语句相当于
// DELETE FROM `posts` WHERE `author` = 'fengmk2';
```
## 直接执行 SQL 语句

插件本身也支持拼接与直接执行 SQL 语句。使用 `query` 方法可以执行合法的 SQL 语句。

**注意！！我们极其不建议开发者拼接 SQL 语句，这样很容易引起 SQL 注入！！**

如果必须要自己拼接 SQL 语句，请使用 `mysql.escape` 方法。

参考 [preventing-sql-injection-in-node-js](http://stackoverflow.com/questions/15778572/preventing-sql-injection-in-node-js)。

```js
const postId = 1;
const results = await this.app.mysql.query('update posts set hits = (hits + ?) where id = ?', [1, postId]);

// => update posts set hits = (hits + 1) where id = 1;
```

## 使用事务

MySQL 事务主要用于处理操作量大，复杂度高的数据。例如，在人员管理系统中，当你删除一个人员，你既需要删除人员的基本资料，也要删除与该人员相关的信息，如信箱、文章等等。这时候使用事务处理可以方便管理这一组操作。一个事务将一组连续的数据库操作，放在一个单一的工作单元来执行。只有该组内的每个单独的操作都成功，事务才能成功。如果事务中的任何操作失败，则整个事务将失败。

一般来说，事务必须满足 4 个条件（ACID）：Atomicity（原子性）、Consistency（一致性）、Isolation（隔离性）、Durability（可靠性）。

- 原子性：确保事务内的所有操作都成功完成，否则事务将被中止在故障点，以前的操作将回滚到以前的状态。
- 一致性：对数据库的修改是一致的。
- 隔离性：事务是彼此独立的，不互相影响。
- 持久性：确保提交事务后，事务产生的结果可以永久存在。

因此，对于一个事务来说，一定伴随着 `beginTransaction`、`commit` 或 `rollback`，分别代表事务的开始、成功和失败回滚。

egg-mysql 提供了两种类型的事务。

### 手动控制

- 优点：`beginTransaction`、`commit` 或 `rollback` 都由开发者完全控制，可以做到非常细粒度的控制。
- 缺点：代码量比较多，不是每个人都能写好，忽视捕获异常和 cleanup 都会导致严重的 bug。

```js
const conn = await app.mysql.beginTransaction(); // 初始化事务

try {
  await conn.insert(table, row1); // 第一步操作
  await conn.update(table, row2); // 第二步操作
  await conn.commit(); // 提交事务
} catch (err) {
  // 错误，回滚
  await conn.rollback(); // 一定记得捕获异常后回滚事务！！
  throw err;
}
```

### 自动控制：Transaction with scope

- API：`beginTransactionScope(scope, ctx)`
  - `scope`：一个 `generatorFunction`，在这个函数里执行这次事务的所有 SQL 语句。
  - `ctx`：当前请求的上下文对象，传入 `ctx` 可以保证即使在出现事务嵌套的情况下，一次请求中同时只有一个激活状态的事务。
- 优点：使用简单，容易操作，感觉事务不存在。
- 缺点：整个事务要么成功，要么失败，无法做细粒度控制。

```js
const result = await app.mysql.beginTransactionScope(async (conn) => {
  // don't commit or rollback by yourself
  await conn.insert(table, row1);
  await conn.update(table, row2);
  return { success: true };
}, ctx); // `ctx` 是当前请求的上下文，如果是在 service 文件中，可以从 `this.ctx` 获取到
// 如果在 scope 中抛出错误，将自动回滚
```

## 表达式（Literal）

如果需要调用 MySQL 内置的函数（或表达式），可以使用 `Literal`。

### 内置表达式

- `NOW()`：数据库当前系统时间，通过 `app.mysql.literals.now` 获取。

```js
await this.app.mysql.insert(table, {
  create_time: this.app.mysql.literals.now,
});

// => INSERT INTO `$table` (`create_time`) VALUES (NOW())
```

### 自定义表达式

以下示例展示如何调用 MySQL 内置的 `CONCAT(s1, ...sn)` 函数，进行字符串拼接。

```js
const Literal = this.app.mysql.literals.Literal;
const first = 'James';
const last = 'Bond';
await this.app.mysql.insert(table, {
  id: 123,
  fullname: new Literal(`CONCAT("${first}", "${last}")`),
});

// => INSERT INTO `$table` (`id`, `fullname`) VALUES (123, CONCAT("James", "Bond"))
```

[egg-mysql]: https://github.com/eggjs/egg-mysql
