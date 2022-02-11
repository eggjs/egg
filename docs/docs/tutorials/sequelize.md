---
title: Sequelize
---

[In the previous section](./mysql.md), we showed how to access the database through the [egg-mysql] plugin in the framework. In some more complex applications, we may need an ORM framework to help us manage the data layer code. In the Node.js community, [sequelize] is a widely used ORM framework that supports multiple data sources such as MySQL, PostgreSQL, SQLite, and MSSQL.

In this chapter, we will walk through the steps of how to use sequelize in an egg project by developing an example of doing CURD on the data in the `users` table in MySQL.

## Preparing

In this example, we will use sequelize to connect to the MySQL data source, so we need to install MySQL on the machine before we start writing code. If it is MacOS, we can quickly install it via homebrew:

```bash
brew install mysql
brew services start mysql
```

## Initialization

Init project by `npm`:

```bash
$ mkdir sequelize-project && cd sequelize-project
$ npm init egg --type=simple
$ npm i
```

Install and configure the [egg-sequelize] plugin (which will help us load the defined Model object onto `app` and `ctx` ) and the [mysql2] module:

- Install

```bash
npm install --save egg-sequelize mysql2
```

- Import egg-sequelize in `config/plugin.js`

```js
exports.sequelize = {
  enable: true,
  package: 'egg-sequelize',
};
```

- Write the sequelize configuration in `config/config.default.js`

```js
exports.sequelize = {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'egg-sequelize-doc-default',
};
```

We can configure different data source addresses in different environment configurations to distinguish the databases used by different environments. For example, we can create a new `config/config.unittest.js` configuration file and write the following configuration. The connected database points to `egg-sequelize-doc-unittest`.

```js
exports.sequelize = {
  dialect: 'mysql',
  host: '127.0.0.1',
  port: 3306,
  database: 'egg-sequelize-doc-unittest',
};
```

After completing the above configuration, a project using sequelize is initialized. [egg-sequelize] and [sequelize] also support more configuration items, which can be found in their documentation.

## Database and Migrations Initialization

Next, let's temporarily leave the code of the egg project, design and initialize our database. First, we quickly create two databases for development and testing locally using the mysql command:

```bash
mysql -u root -e 'CREATE DATABASE IF NOT EXISTS `egg-sequelize-doc-default`;'
mysql -u root -e 'CREATE DATABASE IF NOT EXISTS `egg-sequelize-doc-unittest`;'
```

Then we started designing the `users` table, which has the following data structure:

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

We can build the table directly through the mysql command, but this is not a good practist for multiplayer collaboration. During the evolution of the project, each iteration is possible to make changes to the database data structure, how to track the data changes of each iteration, and quickly change the data structure in different environments (development, testing, CI) and switch bettween iterative? At this point we need [Migrations] to help us manage the changes in the data structure.

Sequelize provides the [sequelize-cli] tool to implement [Migrations], and we can also introduce sequelize-cli in the egg project.

- Install `sequelize-cli`

```bash
npm install --save-dev sequelize-cli
```

In the egg project, we want to put all the database Migrations related content in the `database` directory, so we create a new `.sequelizerc` configuration file in the project root directory:

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

- Init Migrations Configuration Files and Directories

```bash
npx sequelize init:config
npx sequelize init:migrations
```

After the execution, the `database/config.json` file and the `database/migrations` directory will be generated. We will modify the contents of `database/config.json`. It was changed to the database configuration used in our project:

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

At this point sequelize-cli and related configuration are also initialized, we can start writing the project's first Migration file to create one of our `users` table.

```bash
npx sequelize migration:generate --name=init-users
```

After execution, a migration file (`${timestamp}-init-users.js`) is generated in the `database/migrations` directory. We modify it to handle initializing the `users` table:

```js
'use strict';

module.exports = {
  // The function called when performing a database upgrade, create a `users` table
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
  // The function called when performing a database downgrade, delete the `users` table
  down: async (queryInterface) => {
    await queryInterface.dropTable('users');
  },
};
```

- Execute migrate for database changes

```bash
# upgrade database
npx sequelize db:migrate
# if there is a problem that needs to be rolled back, you can roll back a change via `db:migrate:undo`
# npx sequelize db:migrate:undo
# can be rolled back to the initial state via `db:migrate:undo:all`
# npx sequelize db:migrate:undo:all
```

After execution, our database initialization is complete.

## Coding

Finally we can start writing code to implement business logic. First, let's write the user model in the `app/model/` directory:

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

This model can be accessed in the Controller and Service via `app.model.User` or `ctx.model.User`, for example we write `app/controller/users.js`:

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

Finally we will mount this controller on the route:

```js
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.resources('users', '/users', controller.users);
};
```

The interface for the CURD operation of the `users` table is developed. To verify that the code logic is correct, we need to write some testcases to verify.

## Unit Test

Before writing the test, because in the previous egg configuration, we pointed the unit test environment and development environment to different databases, so we need to initialize the data structure of the test database through Migrations:

```bash
NODE_ENV=test npx sequelize db:migrate:up
```

Unit tests with database access are particularly cumbersome to write directly, We need to create a series of data to prepare the test data is a very cumbersome process. To simplify single testing, we can quickly create test data with the [factory-girl] module.

- Install `factory-girl`

```bash
npm install --save-dev factory-girl
```

- Define the data model of factory-girl into `test/factories.js`

```js
// test/factories.js
'use strict';

const { factory } = require('factory-girl');

module.exports = (app) => {
  // Factory instance can be accessed via app.factory
  app.factory = factory;

  // Define user and default data
  factory.define('user', app.model.User, {
    name: factory.sequence('User.name', (n) => `name_${n}`),
    age: 18,
  });
};
```

- Initialize the file `test/.setup.js`, introduce the factory, and ensure that the data is cleaned after the test is executed to avoid being affected.

```js
const { app } = require('egg-mock/bootstrap');
const factories = require('./factories');

before(() => factories(app));
afterEach(async () => {
  // clear database after each test case
  await Promise.all([app.model.User.destroy({ truncate: true, force: true })]);
});
```

Then we can start writing real test cases:

```js
// test/app/controller/users.test.js
const { assert, app } = require('egg-mock/bootstrap');

describe('test/app/controller/users.test.js', () => {
  describe('GET /users', () => {
    it('should work', async () => {
      // Quickly create some users object into the database via factory-girl
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

Finally, if we need to run unit tests in the CI, we need to ensure that we perform a migration to ensure data structure updates before executing the test code. For example, we declare `scripts.ci` in `package.json` to execute the unit test in the CI environment:

```js
{
  "scripts": {
    "ci": "eslint . && NODE_ENV=test npx sequelize db:migrate && egg-bin cov"
  }
}
```

## Full Example

A more complete example can be found in [eggjs/examples/sequelize].

## Boilerplate

We also provide sequelize boilerplate that integrates the modules [egg-sequelize], [sequelize-cli] and [factory-girl] provided in this documentation. You can quickly initialize a new application based on it by `npm init egg --type=sequelize`.

[mysql2]: https://github.com/sidorares/node-mysql2
[sequelize]: http://docs.sequelizejs.com/
[sequelize-cli]: https://github.com/sequelize/cli
[egg-sequelize]: https://github.com/eggjs/egg-sequelize
[migrations]: http://docs.sequelizejs.com/manual/tutorial/migrations.html
[factory-girl]: https://github.com/aexmachina/factory-girl
[eggjs/examples/sequelize]: https://github.com/eggjs/examples/tree/master/sequelize
[egg-mysql]: https://github.com/eggjs/egg-mysql
