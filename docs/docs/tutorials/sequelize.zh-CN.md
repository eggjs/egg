---
title: Sequelize
---

[前面的章节中](./mysql.md)，我们介绍了如何在框架中通过 [egg-mysql] 插件来访问数据库。而在一些较为复杂的应用中，我们可能会需要一个 ORM 框架来帮助我们管理数据层的代码。而在 Node.js 社区中，[sequelize] 是一个广泛使用的 ORM 框架，它支持 MySQL、PostgreSQL、SQLite 和 MSSQL 等多个数据源。

本章节我们会通过开发一个对 MySQL 中 `users` 表的数据做 CURD 的例子来一步步介绍如何在 egg 项目中使用 sequelize。

## 准备工作

在这个例子中，我们会使用 sequelize 连接到 MySQL 数据源，因此在开始编写代码之前，我们需要先在本机上安装好 MySQL，如果是 MacOS，可以通过 homebrew 快速安装：

```bash
brew install mysql
brew services start mysql
```

## 初始化项目

通过 `npm` 初始化一个项目:

```bash
$ mkdir sequelize-project && cd sequelize-project
$ npm init egg --type=simple
$ npm i
```

安装并配置 [egg-sequelize] 插件（它会辅助我们将定义好的 Model 对象加载到 app 和 ctx 上）和 [mysql2] 模块：

- 安装

```bash
npm install --save egg-sequelize mysql2
```

- 在 `config/plugin.js` 中引入 egg-sequelize 插件

```js
exports.sequelize = {
  enable: true,
  package: 'egg-sequelize',
};
```

- 在 `config/config.default.js` 中编写 sequelize 配置

```js
exports.sequelize = {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'egg-sequelize-doc-default',
};
```

我们可以在不同的环境配置中配置不同的数据源地址，用于区分不同环境使用的数据库，例如我们可以新建一个 `config/config.unittest.js` 配置文件，写入如下配置，将单测时连接的数据库指向 `egg-sequelize-doc-unittest`。

```js
exports.sequelize = {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'egg-sequelize-doc-unittest',
};
```

完成上面的配置之后，一个使用 sequelize 的项目就初始化完成了。[egg-sequelize] 和 [sequelize] 还支持更多的配置项，可以在他们的文档中找到。

## 初始化数据库和 Migrations

接下来我们先暂时离开 egg 项目的代码，设计和初始化一下我们的数据库。首先我们通过 mysql 命令在本地快速创建开发和测试要用到的两个 database：

```bash
mysql -u root -e 'CREATE DATABASE IF NOT EXISTS `egg-sequelize-doc-default`;'
mysql -u root -e 'CREATE DATABASE IF NOT EXISTS `egg-sequelize-doc-unittest`;'
```

然后我们开始设计 `users` 表，它有如下的数据结构：

```sql
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT COMMENT 'primary key',
  `name` varchar(30) DEFAULT NULL COMMENT 'user name',
  `age` int(11) DEFAULT NULL COMMENT 'user age',
  `created_at` datetime DEFAULT NULL COMMENT 'created time',
  `updated_at` datetime DEFAULT NULL COMMENT 'updated time',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='user';
```

我们可以直接通过 mysql 命令将表直接建好，但是这并不是一个对多人协作非常友好的开发模式。在项目的演进过程中，每一个迭代都有可能对数据库数据结构做变更，怎样跟踪每一个迭代的数据变更，并在不同的环境（开发、测试、CI）和迭代切换中，快速变更数据结构呢？这时候我们就需要 [Migrations] 来帮我们管理数据结构的变更了。

sequelize 提供了 [sequelize-cli] 工具来实现 [Migrations]，我们也可以在 egg 项目中引入 sequelize-cli。

- 安装 sequelize-cli

```bash
npm install --save-dev sequelize-cli
```

在 egg 项目中，我们希望将所有数据库 Migrations 相关的内容都放在 `database` 目录下，所以我们在项目根目录下新建一个 `.sequelizerc` 配置文件：

```js
'use strict';

const path = require('path');

module.exports = {
  config: path.join(__dirname, 'database/config.json'),
  'migrations-path': path.join(__dirname, 'database/migrations'),
  'seeders-path': path.join(__dirname, 'database/seeders'),
  'models-path': path.join(__dirname, 'app/model'),
};
```

- 初始化 Migrations 配置文件和目录

```bash
npx sequelize init:config
npx sequelize init:migrations
```

执行完后会生成 `database/config.json` 文件和 `database/migrations` 目录，我们修改一下 `database/config.json` 中的内容，将其改成我们项目中使用的数据库配置：

```
{
  "development": {
    "username": "root",
    "password": null,
    "database": "egg-sequelize-doc-default",
    "host": "127.0.0.1",
    "dialect": "mysql"
  },
  "test": {
    "username": "root",
    "password": null,
    "database": "egg-sequelize-doc-unittest",
    "host": "127.0.0.1",
    "dialect": "mysql"
  }
}
```

此时 sequelize-cli 和相关的配置也都初始化好了，我们可以开始编写项目的第一个 Migration 文件来创建我们的一个 users 表了。

```bash
npx sequelize migration:generate --name=init-users
```

执行完后会在 `database/migrations` 目录下生成一个 migration 文件(`${timestamp}-init-users.js`)，我们修改它来处理初始化 `users` 表：

```js
'use strict';

module.exports = {
  // 在执行数据库升级时调用的函数，创建 users 表
  up: async (queryInterface, Sequelize) => {
    const { INTEGER, DATE, STRING } = Sequelize;
    await queryInterface.createTable('users', {
      id: { type: INTEGER, primaryKey: true, autoIncrement: true },
      name: STRING(30),
      age: INTEGER,
      created_at: DATE,
      updated_at: DATE,
    });
  },
  // 在执行数据库降级时调用的函数，删除 users 表
  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  },
};
```

- 执行 migrate 进行数据库变更

```bash
# 升级数据库
npx sequelize db:migrate
# 如果有问题需要回滚，可以通过 `db:migrate:undo` 回退一个变更
# npx sequelize db:migrate:undo
# 可以通过 `db:migrate:undo:all` 回退到初始状态
# npx sequelize db:migrate:undo:all
```

执行之后，我们的数据库初始化就完成了。

## 编写代码

现在终于可以开始编写代码实现业务逻辑了，首先我们来在 `app/model/` 目录下编写 user 这个 Model：

```js
'use strict';

module.exports = (app) => {
  const { STRING, INTEGER, DATE } = app.Sequelize;

  const User = app.model.define('user', {
    id: { type: INTEGER, primaryKey: true, autoIncrement: true },
    name: STRING(30),
    age: INTEGER,
    created_at: DATE,
    updated_at: DATE,
  });

  return User;
};
```

这个 Model 就可以在 Controller 和 Service 中通过 `app.model.User` 或者 `ctx.model.User` 访问到了，例如我们编写 `app/controller/users.js`：

```js
// app/controller/users.js
const Controller = require('egg').Controller;

function toInt(str) {
  if (typeof str === 'number') return str;
  if (!str) return str;
  return parseInt(str, 10) || 0;
}

class UserController extends Controller {
  async index() {
    const ctx = this.ctx;
    const query = {
      limit: toInt(ctx.query.limit),
      offset: toInt(ctx.query.offset),
    };
    ctx.body = await ctx.model.User.findAll(query);
  }

  async show() {
    const ctx = this.ctx;
    ctx.body = await ctx.model.User.findByPk(toInt(ctx.params.id));
  }

  async create() {
    const ctx = this.ctx;
    const { name, age } = ctx.request.body;
    const user = await ctx.model.User.create({ name, age });
    ctx.status = 201;
    ctx.body = user;
  }

  async update() {
    const ctx = this.ctx;
    const id = toInt(ctx.params.id);
    const user = await ctx.model.User.findByPk(id);
    if (!user) {
      ctx.status = 404;
      return;
    }

    const { name, age } = ctx.request.body;
    await user.update({ name, age });
    ctx.body = user;
  }

  async destroy() {
    const ctx = this.ctx;
    const id = toInt(ctx.params.id);
    const user = await ctx.model.User.findByPk(id);
    if (!user) {
      ctx.status = 404;
      return;
    }

    await user.destroy();
    ctx.status = 200;
  }
}

module.exports = UserController;
```

最后我们将这个 controller 挂载到路由上：

```js
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.resources('users', '/users', controller.users);
};
```

针对 `users` 表的 CURD 操作的接口就开发完了，为了验证代码逻辑是否正确，我们接下来需要编写单元测试来验证。

## 单元测试

在编写测试之前，由于在前面的 egg 配置中，我们将单元测试环境和开发环境指向了不同的数据库，因此需要通过 Migrations 来初始化测试数据库的数据结构：

```bash
NODE_ENV=test npx sequelize db:migrate:up
```

有数据库访问的单元测试直接写起来会特别繁琐，特别是很多接口我们需要创建一系列的数据才能进行，造测试数据是一个非常繁琐的过程。为了简化单测，我们可以通过 [factory-girl] 模块来快速创建测试数据。

- 安装 `factory-girl` 依赖

```bash
npm install --save-dev factory-girl
```

- 定义 factory-girl 的数据模型到 `test/factories.js` 中

```js
// test/factories.js
'use strict';

const { factory } = require('factory-girl');

module.exports = (app) => {
  // 可以通过 app.factory 访问 factory 实例
  app.factory = factory;

  // 定义 user 和默认数据
  factory.define('user', app.model.User, {
    name: factory.sequence('User.name', (n) => `name_${n}`),
    age: 18,
  });
};
```

- 初始化文件 `test/.setup.js`，引入 factory，并确保测试执行完后清理数据，避免被影响。

```js
const { app } = require('egg-mock/bootstrap');
const factories = require('./factories');

before(() => factories(app));
afterEach(async () => {
  // clear database after each test case
  await Promise.all([app.model.User.destroy({ truncate: true, force: true })]);
});
```

接下来我们就可以开始编写真正的测试用例了：

```js
// test/app/controller/users.test.js
const { assert, app } = require('egg-mock/bootstrap');

describe('test/app/controller/users.test.js', () => {
  describe('GET /users', () => {
    it('should work', async () => {
      // 通过 factory-girl 快速创建 user 对象到数据库中
      await app.factory.createMany('user', 3);
      const res = await app.httpRequest().get('/users?limit=2');
      assert(res.status === 200);
      assert(res.body.length === 2);
      assert(res.body[0].name);
      assert(res.body[0].age);
    });
  });

  describe('GET /users/:id', () => {
    it('should work', async () => {
      const user = await app.factory.create('user');
      const res = await app.httpRequest().get(`/users/${user.id}`);
      assert(res.status === 200);
      assert(res.body.age === user.age);
    });
  });

  describe('POST /users', () => {
    it('should work', async () => {
      app.mockCsrf();
      let res = await app.httpRequest().post('/users').send({
        age: 10,
        name: 'name',
      });
      assert(res.status === 201);
      assert(res.body.id);

      res = await app.httpRequest().get(`/users/${res.body.id}`);
      assert(res.status === 200);
      assert(res.body.name === 'name');
    });
  });

  describe('DELETE /users/:id', () => {
    it('should work', async () => {
      const user = await app.factory.create('user');

      app.mockCsrf();
      const res = await app.httpRequest().delete(`/users/${user.id}`);
      assert(res.status === 200);
    });
  });
});
```

最后，如果我们需要在 CI 中运行单元测试，需要确保在执行测试代码之前，执行一次 migrate 确保数据结构更新，例如我们在 `package.json` 中声明 `scripts.ci` 来在 CI 环境下执行单元测试：

```js
{
  "scripts": {
    "ci": "eslint . && NODE_ENV=test npx sequelize db:migrate && egg-bin cov"
  }
}
```

## 完整示例

更完整的示例可以查看 [eggjs/examples/sequelize]。

## 脚手架

我们也提供了 sequelize 的脚手架，集成了文档中提供的 [egg-sequelize], [sequelize-cli] 与 [factory-girl] 等模块。可以通过 `npm init egg --type=sequelize` 来基于它快速初始化一个新的应用。

[mysql2]: https://github.com/sidorares/node-mysql2
[sequelize]: http://docs.sequelizejs.com/
[sequelize-cli]: https://github.com/sequelize/cli
[egg-sequelize]: https://github.com/eggjs/egg-sequelize
[migrations]: http://docs.sequelizejs.com/manual/tutorial/migrations.html
[factory-girl]: https://github.com/aexmachina/factory-girl
[eggjs/examples/sequelize]: https://github.com/eggjs/examples/tree/master/sequelize
[egg-mysql]: https://github.com/eggjs/egg-mysql
