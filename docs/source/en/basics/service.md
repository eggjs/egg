title: Service
---

Simply speaking, Service is an abstract layer which is used to encapsulate business logics in complex business circumstances, and this abstraction offers advantages as below:

- keep logics in Controller cleaner.
- keep business logics independent, since the abstracted Service can be called by many Controllers repeatedly.
- separate logics and representations, and make it easier to write test cases. Write test cases in detail referring to [here](../core/unittest.md).

## Usage Scenario

- Processing complex data, e.g. information to be shown need to be got from databases, and should be processed in specific rules before it can be sent and seen by the user. Or when the process is done, the database should be updated.
- Calling 3rd party services, e.g. getting Github information etc.

## Defining Service

- `app/service/user.js`

```js
module.exports = app => {
  class User extends app.Service {
    * find(uid) {
      const user = this.ctx.db.query(`select * from user where uid = ${uid}`);
      return user;
    }
  }
  return User;
};
```

### Notes

- Service files must be put under the `app/service` directory, and multi-level directory is supported, which can be accessed by cascading directory names.

```js
app/service/biz/user.js => ctx.service.biz.user
app/service/sync_user.js => ctx.service.syncUser
app/service/HackerNews.js => ctx.service.hackerNews
```

- one Service file can only define one Class, which should be returned by `module.exports`.
- Service should be defined in the Class way, and the parent class must be `app.Service`, which is passed as a parameter when initializing Service.
- Service is not a singleton but a **request level** object, the framework lazy-initializes it when the request `ctx.service.xx` for the first time, so the context of current request can be got from this.ctx in Service.

### Service ctx in Detail

To get the path chain of user request, the request context is injected by us during the Service initialization, so you are able to get context related information directly by `this.ctx` in methods. For detailed information about context, please refer to [Context](./extend.md#context).
With `ctx`, we can get various convenient attributes and methods encapsulated by the framework. For example we can use:

- `this.ctx.curl` to make network calls.
- `this.ctx.service.otherService` to call other Services.
- `this.ctx.db` to make database calls etc, where db may be a module mounted by other plugins in advance.

# Using Service

We begin to see how to use Service from a complete example below.

```js
// app/router.js
module.exports = app => {
  app.get('/user/:id', 'user.info');
};

// app/controller/user.js
exports.info = function* (ctx) {
  const userId = ctx.params.id;
  const userInfo = yield ctx.service.user.find(userId);
  ctx.body = userInfo;
};

// app/service/user.js
module.exports = app => {
  class User extends app.Service {
    // the constructor is not a must by default
    // constructor(ctx) {
    //   super(ctx); if some processes should be made in the constructor, this statement is a must in order to use `this.ctx` later
    //   // get ctx through this.ctx directly
    //   // get app through this.app directly too
    // }

    * find(uid) {
      // suppose we've got user's id and are going to get detailed user information from databases
      const user = this.ctx.db.query(`select * from user where uid = ${uid}`);

      // suppose some complex processes should be made here, and demanded informations are returned then. 
      const picture = yield this.getPicture(uid);

      return {
        name: user.user_name,
        age: user.age,
        picture,
      };
    }

    * getPicture(uid) {
      const result = yield this.ctx.curl(`http://photoserver/uid=${uid}`, {
        dataType: 'json',
      });
      return result.data;
    }
  }
  return User;
};

// curl http://127.0.0.1:7001/user/1234
```
