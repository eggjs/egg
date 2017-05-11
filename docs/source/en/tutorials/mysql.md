title: MySQL
---

MySQL is one of the most common and best RDBMS in terms of web applications. It is used in many large-scale websites such as Google and Facebook. The document provides a tutorial to access MySQL using Egg framework and plugins.
## egg-mysql

egg-mysql is provided to access both the MySQL databases and MySQL-based online database service. 

### Installation and Configuration

Install [egg-mysql]

```bash
$ npm i --save egg-mysql
```

Enable Plugin:

```js
// config/plugin.js
exports.mysql = {
  enable: true,
  package: 'egg-mysql',
};
```
Configure database information in `config/config.${env}.js`

#### Single Data Source

Configuration to accesss single MySQL instance as shown below:

```js
// config/config.${env}.js
exports.mysql = {
  // database configuration 
  client: {
    host: 'mysql.com',
    port: '3306',
    user: 'test_user',
    password: 'test_password',
    database: 'test',
  },
  // load into app, default true
  app: true,
  // load into agent, default false
  agent: false,
};
```

Use: 

```js
yield app.mysql.query(sql, values); // single instance can be accessed through app.mysql
```

#### Multiple Data Sources

Configuration to accesss multiple MySQL instances as below:

```js
exports.mysql = {
  clients: {
    // clientId, obtain the client instances using the app.mysql.get('clientId')
    db1: {
      host: 'mysql.com',
      port: '3306',
      user: 'test_user',
      password: 'test_password',
      database: 'test',
    },
    db2: {
      host: 'mysql2.com',
      port: '3307',
      user: 'test_user',
      password: 'test_password',
      database: 'test',
    },
    // ...
  },
  //default configuration of all databases
  default: {

  },

  // load into app, default true
  app: true,
  // load into agent, default false
  agent: false,
};
```

Use:

```js
const client1 = app.mysql.get('db1');
yield client1.query(sql, values);

const client2 = app.mysql.get('db2');
yield client2.query(sql, values);
```

#### Dynamic Creation

Pre-declaration of configuration might not needed in the configuration file. Obtaining the actual parameters dynamically from the configuration center then initialize an instance instead.

```js
// {app_root}/app.js
module.exports = function(app) {
  app.beforeStart(function* () {
    // obtain the MySQL configuration from the configuration center
    // { host: 'mysql.com', port: '3306', user: 'test_user', password: 'test_password', database: 'test' }
    const mysqlConfig = yield app.configCenter.fetch('mysql');
    app.database = app.mysql.createInstance(mysqlConfig);
  });
};
```

## service layer

Connecting to MySQL is a data processing layer in the Web layer. So it is strongly recommended that keeping the code in the service layer.

An example of connecting to MySQL as follows.

Details of service layer, refer to [service](../basics/service.md)

```js
// app/service/user.js
module.exports = app => {
  return class User extends app.Service {
    * find(uid) {
      // assume we have the user id then trying to get the user details from database
      const user = yield app.mysql.get('users', {
          id: 11,
      });
      return {
        user,
      };
    }
  }
};
```

After that, obtaining the data from service layer using the controller

```js
// app/controller/user.js
exports.info = function* (ctx) {
  const userId = ctx.params.id;
  const user = yield ctx.service.user.find(userId);
  ctx.body = user;
};
```

## Writing CRUD 

Following statments default under `app/service` if not specifed

### Create

INSERT method to perform the INSERT INTO query

```js
// INSERT
const result = yield this.app.mysql.insert('posts', { title: 'Hello World' }); //insert a record title 'Hello World' to 'posts' table

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

// check if insertion is success or failure
const insertSuccess = result.affectedRows === 1;
```

### Read

Use `get` or `select` to select one or multiple records. `select` method support query criteria and result customization

- get one record

```js
const post = yield this.app.mysql.get('posts', { id: 12 });

=> SELECT * FROM `posts` WHERE `id` = 12 LIMIT 0, 1;
```

- query all from the table

```js
const results = yield this.app.mysql.select('posts');

=> SELECT * FROM `posts`;
```

- query criteria and result customization

```js
const results = yield this.app.mysql.select('posts', { // search posts table
  where: { status: 'draft', author: ['author1', 'author2'] }, // WHERE criteria
  columns: ['author', 'title'], // get the value of certain columns
  orders: [['created_at','desc'], ['id','desc']], // sort order
  limit: 10, // limit the return rows
  offset: 0, // data offset
});

=> SELECT `author`, `title` FROM `posts`
  WHERE `status` = 'draft' AND `author` IN('author1','author2')
  ORDER BY `created_at` DESC, `id` DESC LIMIT 0, 10;
```


### Update

UPDATE operation to update the records of databases

```js
// modify data and search by primary key ID, and refresh
const row = {
  id: 123,
  name: 'fengmk2',
  otherField: 'other field value',    // any other fields u want to update
  modifiedAt: this.app.mysql.literals.now, // `now()` on db server
};
const result = yield this.app.mysql.update('posts', row); // update records in 'posts'

=> UPDATE `posts` SET `name` = 'fengmk2', `modifiedAt` = NOW() WHERE id = 123 ;

// check if update is success or failure
const updateSuccess = result.affectedRows === 1;
```

### Delete

DELETE operation to delete the records of databases

```js
const result = yield this.app.mysql.delete('posts', {
  author: 'fengmk2',
});

=> DELETE FROM `posts` WHERE `author` = 'fengmk2';
```

## Implementation of SQL statement

Plugin supports splicing and execute SQL statment directly. It can use `query` to execute a valid SQL statement

**Note!! Strongly do not recommend developers splicing SQL statement, it is easier to cause SQL injection!!**

Use the `mysql.escape` method if you have to splice SQL statement

Refer to [preventing-sql-injection-in-node-js](http://stackoverflow.com/questions/15778572/preventing-sql-injection-in-node-js)

```js
const postId = 1;
const results = yield this.app.mysql.query('update posts set hits = (hits + ?) where id = ?', [1, postId]);

=> update posts set hits = (hits + 1) where id = 1;
```

## Transaction
Transaction is mainly used to deal with large data of high complexity. For example, in a personnel management system, deleting a person which need to delete the basic information of the staff, but also need to delete the related information of staff, such as mailboxes, articles and so on. It is easier to use transaction to run a set of operations.
A transaction is a set of continuous database operations which performed as a single unit of work. Each individual operation within the group is successful and the transaction succeeds. If one part of the transaction fails, then the entire transaction fails.
In gerenal, transaction must be atomic, consistent, isolated and durable.
- Atomicity requires that each transaction be "all or nothing": if one part of the transaction fails, then the entire transaction fails, and the database state is left unchanged. 
- The consistency property ensures that any transaction will bring the database from one valid state to another. 
- The isolation property ensures that the concurrent execution of transactions results in a system state that would be obtained if transactions were executed sequentially
- The durability property ensures that once a transaction has been committed, it will remain so.

Therefore, for a transaction, must be accompanied by beginTransaction, commit or rollback, respectively, beginning of the transaction, success and failure to roll back.

egg-mysql proviodes two types of transactions

### Manual Control

- adventage: ```beginTransaction```, ```commit``` or ```rollback``` can be completely under control by developer
- disadventage: more handwritten code, Forgot catching error or cleanup will lead to serious bug.

```js
const conn = yield app.mysql.beginTransaction(); // initialize the transaction

try {
  yield conn.insert(table, row1);  // first step
  yield conn.update(table, row2);  // second step
  yield conn.commit(); // commit the transaction
} catch (err) {
  // error, rollback
  yield conn.rollback(); // rollback after catching the exception!!  
  throw err;
}
```

### Automatic control: Transaction with scope

- API：`*beginTransactionScope(scope, ctx)`
  - `scope`: A generatorFunction which will execute all sqls of this transaction.
  - `ctx`: The context object of current request, it will ensures that even in the case of a nested transaction, there is only one active transaction in a request at the same time.
- adventage: easy to use, as if there is no transaction in your code.
- disadvantage: all transation will be successful or failed, cannot control precisely
```js
const result = yield app.mysql.beginTransactionScope(function* (conn) {
  // don't commit or rollback by yourself
  yield conn.insert(table, row1);
  yield conn.update(table, row2);
  return { success: true };
}, ctx); // ctx is the context of current request, accessed by `this.ctx`  within in service file.
// if error throw on scope, will auto rollback
```

## Literal

 Use `Literal` if need to call literals or functions in MySQL

### Inner Literal

- `NOW()`：The database system time, obtained by `app.mysql.literals.now`

```js
yield this.app.mysql.insert(table, {
  create_time: this.app.mysql.literals.now,
});

=> INSERT INTO `$table`(`create_time`) VALUES(NOW())
```

### Custom literal

The following demo showe how to call `CONCAT(s1, ...sn)` funtion in mysql to do string splicing.

```js
const Literal = this.app.mysql.literals.Literal;
const first = 'James';
const last = 'Bond';
yield this.app.mysql.insert(table, {
  id: 123,
  fullname: new Literal(`CONCAT("${first}", "${last}"`),
});

=> INSERT INTO `$table`(`id`, `fullname`) VALUES(123, CONCAT("James", "Bond"))
```

[egg-mysql]: https://github.com/eggjs/egg-mysql
