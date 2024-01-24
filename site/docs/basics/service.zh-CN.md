---
title: 服务（Service）
order: 8
---

简单来说，Service 就是在复杂业务场景下用于做业务逻辑封装的一个抽象层，它的提供具有以下几个优点：

- 保持 Controller 中的逻辑更简洁。
- 保持业务逻辑的独立性，抽象出的 Service 可以被多个 Controller 重复使用。
- 分离逻辑和展示，这样更便于编写测试用例。具体的测试用例编写方法，可以参见[这里](../core/unittest.md)。
## 使用场景

- 数据处理：当需要展示的信息须从数据库获取，并经规则计算后才能显示给用户，或计算后需更新数据库时。
- 第三方服务调用：例如获取 GitHub 信息等。
## 定义 Service

```js
// app/service/user.js
const Service = require('egg').Service;

class UserService extends Service {
  async find(uid) {
    const user = await this.ctx.db.query(
      'select * from user where uid = ?',
      uid
    );
    return user;
  }
}

module.exports = UserService;
```

### 属性

每一次用户请求，框架都会实例化对应的 Service 实例。因为它继承自 `egg.Service`，所以我们拥有以下属性便于开发：

- `this.ctx`：当前请求的上下文 [Context](./extend.md#context) 对象实例。通过它，我们可以获取框架封装的处理当前请求的各种便捷属性和方法。
- `this.app`：当前应用 [Application](./extend.md#application) 对象实例。通过它，我们可以访问框架提供的全局对象和方法。
- `this.service`：应用定义的 [Service](./service.md)。通过它，我们可以访问到其他业务层，等同于 `this.ctx.service`。
- `this.config`：应用运行时的 [配置项](./config.md)。
- `this.logger`：logger 对象。它有四个方法（`debug`，`info`，`warn`，`error`），分别代表不同级别的日志。使用方法和效果与 [context logger](../core/logger.md#context-logger) 所述一致。但通过这个 logger 记录的日志，在日志前会加上文件路径，方便定位日志位置。

### Service ctx 详解

为了能获取用户请求的链路，在 Service 初始化时，注入了请求上下文。用户可以通过 `this.ctx` 直接获取上下文相关信息。关于上下文的更多详细解释，请参考 [Context](./extend.md#context)。有了 `ctx`，我们可以：

- 使用 `this.ctx.curl` 发起网络调用。
- 通过 `this.ctx.service.otherService` 调用其他 Service。
- 调用 `this.ctx.db` 发起数据库操作，`db` 可能是插件预挂载到 app 上的模块。

### 注意事项

- Service 文件必须放在 `app/service` 目录下，支持多级目录。可以通过目录名级联访问。

  ```js
  // app/service/biz/user.js 对应到 ctx.service.biz.user
  app/service/biz/user.js => ctx.service.biz.user
  // app/service/sync_user.js 对应到 ctx.service.syncUser
  app/service/sync_user.js => ctx.service.syncUser
  // app/service/HackerNews.js 对应到 ctx.service.hackerNews
  app/service/HackerNews.js => ctx.service.hackerNews
  ```

- 一个 Service 文件仅包含一个类，该类需通过 `module.exports` 导出。
- Service 应通过 Class 形式定义，且继承自 `egg.Service`。
- Service 不是单例，它是请求级别的对象。框架在每次请求中初次访问 `ctx.service.xx` 时才进行实例化。因此，Service 中可以通过 `this.ctx` 获取当前请求的上下文。
```js
// app/router.js
module.exports = app => {
  app.router.get('/user/:id', app.controller.user.info);
};

// app/controller/user.js
const Controller = require('egg').Controller;
class UserController extends Controller {
  async info() {
    const { ctx } = this;
    const userId = ctx.params.id;
    const userInfo = await ctx.service.user.find(userId);
    ctx.body = userInfo;
  }
}
module.exports = UserController;

// app/service/user.js
const Service = require('egg').Service;
class UserService extends Service {
  // 默认不需要提供构造函数。
  /* constructor(ctx) {
       super(ctx); // 如果需要在构造函数做一些处理，一定要有这句话，才能保证后面 `this.ctx` 的使用。
       // 就可以直接通过 this.ctx 获取 ctx 了
       // 还可以直接通过 this.app 获取 app 了
     } */
  async find(uid) {
    // 假如我们拿到用户 id，从数据库获取用户详细信息
    const user = await this.ctx.db.query(
      'select * from user where uid = ?',
      uid
    );

    // 假定这里还有一些复杂的计算，然后返回需要的信息
    const picture = await this.getPicture(uid);

    return {
      name: user.user_name,
      age: user.age,
      picture
    };
  }

  async getPicture(uid) {
    const result = await this.ctx.curl(`http://photoserver/uid=${uid}`, {
      dataType: 'json'
    });
    return result.data;
  }
}
module.exports = UserService;

// curl http://127.0.0.1:7001/user/1234
```
