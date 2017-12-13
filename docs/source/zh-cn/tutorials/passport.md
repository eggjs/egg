title: Passport
---

**『登录鉴权』**是一个常见的业务场景，包括『账号密码登录方式』和『第三方统一登录』。

其中，后者我们经常使用到，如 Google， GitHub，QQ 统一登录，它们都是基于 [OAuth](https://oauth.net/2/) 规范。

[Passport] 是一个扩展性很强的认证中间件，支持 `Github`，`Twitter`，`Facebook` 等知名服务厂商的 `strategy`，同时也支持通过账号密码的方式进行登录授权校验。

Egg 在它之上提供了 [egg-passport] 插件，把初始化、鉴权成功后的回调处理等通用逻辑封装掉，使得开发者仅需调用几个 API 即可方便的使用 Passport 。

[Passport] 的时序如下：
- 用户访问页面
- 检查 Session
- 拦截跳鉴权登录页面
- Strategy 鉴权
- 校验和存储用户信息
- 序列化用户信息到 Session
- 跳转到指定页面

## 使用 egg-passport

下面，我们将以 GitHub 登录为例，来演示下如何使用。

### 安装

```bash
$ npm i --save egg-passport
$ npm i --save egg-passport-github
```

### 配置

**开启插件：**

```js
// config/plugin.js
exports.passport = {
  enable: true,
  package: 'egg-passport',
};

exports.passportGithub = {
  enable: true,
  package: 'egg-passport-github',
};
```

**配置:**

注意：[egg-passport] 对配置字段进行的标准化，故这里配置的字段名是 `key` 和 `secret` 。

```js
// config/default.js
config.passportGithub = {
  key: 'your_clientID',
  secret: 'your_clientSecret'
};
```

**注意：**
- 需要创建一个 [GitHub OAuth Apps](https://github.com/settings/applications/new)，得到 `clientID` 和 `clientSecret` 信息。
- 还需要填写 `callbackURL`，如 `http://127.0.0.1:7001/auth/github/callback` (线上部署时需要更新对应的域名)。

### 挂载路由

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;

  router.get('/authCallback', controller.home.githubCallback);

  // 挂载鉴权路由
  app.passport.mount('github', {
    callbackURL: '/auth/github/callback',
    successRedirect: '/authCallback'
  });

  // 上面的 mount 是语法糖，等价于
  // const github = app.passport.authenticate('github', { successRedirect: '/authCallback' });
  // router.get('/passport/github', github);
  // router.get('/auth/github/callback', github);
}
```

### 用户信息处理

接着，我们还需要：
- 首次登录时，一般需要把用户信息进行入库，并记录 Session 。
- 二次登录时，从 OAuth 或 Session 拿到的用户信息，读取数据库拿到完整的用户信息。

```js
// app.js
module.exports = app => {
  app.passport.verify(async (ctx, user) => {
    // 检查用户
    assert(user.provider, 'user.provider should exists');
    assert(user.id, 'user.id should exists');

    // 从数据库中查找用户信息
    //
    // Authorization Table
    // column   | desc
    // ---      | --
    // provider | provider name, like github, twitter, facebook, weibo and so on
    // uid      | provider unique id
    // user_id  | current application user id
    const auth = await ctx.model.Authorization.findOne({
      uid: user.id,
      provider: user.provider,
    });
    const existsUser = await ctx.model.User.findOne({ id: auth.user_id });
    if (existsUser) {
      return existsUser;
    }
    // 调用 service 注册新用户
    const newUser = await ctx.service.user.register(user);
    return newUser;
  });

  // 将用户信息序列化后存进 session 里面，一般需要精简，只保存个别字段
  app.passport.serializeUser(async (ctx, user) => {
  // 处理 user
  // ...
  // return user;
  });

  // 反序列化后把用户信息从 session 中取出来，反查数据库拿到完整信息
  app.passport.deserializeUser(async (ctx, user) => {
  // 处理 user
  // ...
  // return user;
  });
};
```

至此，我们就完成了所有的配置，完整的示例可以参见：[eggjs/examples/passport]

### API

[egg-passport] 提供了以下扩展：

- `ctx.user`：获取当前已登录的用户信息
- `ctx.isAuthenticated()`：检查该请求是否已授权
- `ctx.login(user, [options])`：为用户启动一个登录的 session
- `ctx.logout()`：退出，将用户信息从 session 中清除

还提供了 API：

- `app.passport.verify(async (ctx, user) => {})`：校验用户
- `app.passport.serializeUser(async (ctx, user) => {})`： 序列化用户信息后存储进 session
- `app.passport.deserializeUser(async (ctx, user) => {})`：反序列化后取出用户信息
- `app.passport.authenticate(strategy, options)`：生成指定的鉴权中间件
- `app.passport.mount(strategy, options)`： 语法糖，方便开发者配置路由

## 使用 Passport 生态

[Passport] 的中间件很多，不可能都进行二次封装。
接下来，我们来看看如何在框架中直接使用 Passport 中间件。
以『账号密码登录方式』的 [passport-local] 为例：

### 安装

```bash
$ npm i --save passport-local
```

### 配置

```js
// app.js
const LocalStrategy = require('passport-local').Strategy;

module.exports = app => {
  // 挂载 strategy
  app.passport.use(new LocalStrategy({
    passReqToCallback: true,
  }, (req, username, password, done) => {
    const user = {
      username,
      password,
    };
    app.passport.doVerify(req, user, done);
  }));

  // 处理用户信息
  app.passport.verify(async (ctx, user) => {});
  app.passport.serializeUser(async (ctx, user) => {});
  app.passport.deserializeUser(async (ctx, user) => {});
};
```

### 挂载路由

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);

  // 鉴权成功后的回调页面
  router.get('/authCallback', controller.home.authCallback);

  // 渲染登录页面，用户输入账号密码
  router.get('/login', controller.home.login);
  // 登录校验
  router.post('/login', app.passport.authenticate('local', { successReturnToOrRedirect: '/authCallback' }));
};
```


## 如何开发一个 egg-passport 插件

在上一节中，我们学会了如何在框架中使用 Passport 中间件，我们可以进一步把它封装成插件，回馈社区。

**初始化：**

```bash
$ egg-init --type=plugin egg-passsport-local
```

在 `package.json` 中**配置依赖：**

```json
{
  "name": "egg-passport-local",
  "version": "1.0.0",
  "eggPlugin": {
    "name": "passportLocal",
    "dependencies": [
      "passport"
    ]
  },
  "dependencies": {
    "passport-local": "^1.0.0"
  }
}
```

**配置：**

```js
// {plugin_root}/config/config.default.js
// https://github.com/jaredhanson/passport-local
exports.passportLocal = {
};
```

**注册 passport 中间件：**

```js
// {plugin_root}/app.js
const LocalStrategy = require('passport-local').Strategy;
module.exports = app => {
  const config = app.config.passportLocal;
  config.passReqToCallback = true;
  app.passport.use(new LocalStrategy(config, (req, username, password, done) => {
    const user = {
      username,
      password,
    };
    // 这里不处理应用层逻辑，传给 app.passport.verify 统一处理
    app.passport.doVerify(req, user, done);
  }));
};
```

[Passport]: http://www.passportjs.org/
[egg-passport]: https://github.com/eggjs/egg-passport
[passport-local]: https://github.com/jaredhanson/passport-local
[eggjs/examples/passport]: https://github.com/eggjs/examples/tree/master/passport