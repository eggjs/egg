title: Cookie and Session
---

## Cookie

HTTP is a stateless protocol.
But web applications often need to identify the send of requests.
To solve this problem, HTTP protocol defines a header [Cookie](https://en.wikipedia.org/wiki/HTTP_cookie).
Web servers can use response header `Set-Cookie` to send small data to clients.
Browsers store the data according to protocol,
and attach the cookie data in future requests.
For security reason, browsers only attach cookies in requests that are sent to the same domain.
Web servers can set `Domain` and `Path` attributes to define the scope of the cookie.

Using `context.cookies`, we can easily and safely read/set cookie in controllers.

```js
exports.add = function* (ctx) {
  let count = ctx.cookies.get('count');
  count = count ? Number(count) : 0;
  ctx.cookies.set('count', ++count);
  ctx.body = count;
};

exports.remove = function* (ctx) {
  ctx.cookies.set('count', null);
  ctx.status = 204;
};
```

#### `context.cookies.set(key, value, options)`

Modifying Cookie is actually done by setting `Set-Cookie` header in HTTP responses.
Each `Set-Cookie` creates a key-value pair in browser.
Besides of setting the value of Cookie,
HTTP protocol supports more attributes to control the transfer, storage and permission of cookies.

- maxAge (Number): set the lifetime of the cookie in milliseconds. It's the milliseconds since server's "Now". Clients discard a cookie after specified lifetime.
- expires (Date): set the expire time of the cookie. If `maxAge` is defined, `expires` will be ignored. If neither is defined, Cookie will expires when browser session expires, usually the time browser is closed.
- path (String): set the path of the cookie. By default it's' `/`, which means all URL under current domain have access to the cookie.
- domain (String): set the domain of the cookie. It not defined, only current domain have access to the cookie.
- httpOnly (Boolean): set whether the cookie can be accessed by Javascript. By default it's `true`, which means Javascript cannot access the cookie.
- secure (Boolean): set whether the cookie can only be accessed via HTTPS channel. See [explanation](http://stackoverflow.com/questions/13729749/how-does-cookie-secure-flag-work) for details. Egg.js auto sets this value if it's under HTTPS.

In addition to these standard Cookie attributes, egg.js supports 3 more parameters:

- overwrite(Boolean)：set how to deal with it when `cookies.set` is called multiple times with the same key. If true, former values will be overwritten by last call; otherwise HTTP response will contain multiple `Set-Cookie` headers with the same key.
- signed（Boolean）：set whether the cookie should be signed. If true, when the value of the cookie will be signed. When read the value, server verifies the signiture to prevent cookie value modified on client side. By default it's true.
- encrypt（Boolean）：set whether the cookie should be encrypted. It true, the cookie value will be encrypted before sending to clients. User clients cannot get raw text of the cookie. By default it's false.

When using Cookie, we need to have a clear idea of the purpose of the cookie,
how long it needs to be stored in client, can it be accessed by JS, can it be modified by client.

**By default, Cookie is signed but not encrypted,
client can see raw content, cannot be modified by client (manually).**

- If you need to allow JS to access and modify Cookie:

```js
ctx.cookies.set(key, value, {
  httpOnly: false,
  signed: false,
});
```

- If you don't want to allow JS to access and modify Cookie:

```js
ctx.cookies.set(key, value, {
  httpOnly: true, // 默认就是 true
  encrypt: true, // 加密传输
});
```

Note:

1. Due to [the uncertainty in clients' implementation](http://stackoverflow.com/questions/7567154/can-i-use-unicode-characters-in-http-headers), to ensure Cookie can be stored successfully, it's recommended to encode cookie value in base64 or other codec.
2. Due to [the limitation of Cookie on browser side](http://stackoverflow.com/questions/640938/what-is-the-maximum-size-of-a-web-browsers-cookies-key), avoid using long Cookie. Generally speaking, no more than 4093 bytes. When Cookie value's length is greater than this value, egg.js prints a warning log.

#### `context.cookies.get(key, options)`

As HTTP Cookie is sent over header,
we can use this method to easily retrieve the value of given key from Cookie.
If `options.signed` and `options.encrypt` has been set to sign and encrypt Cookie,
the corresponding options also need to be used in `get` method.

- If `signed` is true in `set` Cookie but false in `get` Cookie, egg.js doesn't verify Cookie value, so the value could have been modified by client.
- If `encrypt` is true in `set` Cookie but false in `get` Cookie, what you get is encrypted text rather than the raw plain text.

### Cookie Secret Key

Since we need to sign and encrypt Cookie, a secret key is required.
In `config/config.default.js`:

```js
module.exports = {
  keys: 'key1,key2',
};
```

keys is defined as a string, several keys separated by commas.
When processing Cookie:

- encryption and generating signature uses the first key.
- decryption and verifying signature iterates through all keys.

If you need to update Cookie secret key and don't want to invalidate old secret keys,
you can add new secret key at the front of keys.
After some time, when old keys are not in use any more, delete the old secret keys.

To be continued...

## Session

Cookie 在 Web 应用中经常承担标识请求方身份的功能，所以 Web 应用在 Cookie 的基础上封装了 Session 的概念，专门用做用户身份识别。

框架内置了 [Session](https://github.com/eggjs/egg-session) 插件，给我们提供了 `context.session` 来访问或者修改当前用户 Session 。

```js
exports.fetchPosts = function* (ctx) {
  // 获取 Session 上的内容
  const userId = ctx.session.userId;
  const posts = yield ctx.service.post.fetch(userId);
  // 修改 Session 的值
  ctx.session.visited = ctx.session.visited ? ctx.session.visited++ : 1;
  ctx.body = {
    success: true,
    posts,
  };
};
```

Session 的使用方法非常直观，直接读取它或者修改它就可以了，如果要删除它，直接将它赋值为 null：

```js
exports.deleteSession = function* (ctx) {
  ctx.session = null;
};
```

Session 的实现是基于 Cookie 的，默认配置下，用户 Session 的内容加密后直接存储在 Cookie 中的一个字段中，用户每次请求我们网站的时候都会带上这个 Cookie，我们在服务端解密后使用。Session 的默认配置如下：

```js
exports.session = {
  key: 'EGG_SESS',
  maxAge: 24 * 3600 * 1000, // 1 天
  httpOnly: true,
  encrypt: true,
};
```

可以看到这些参数除了 `key` 都是 Cookie 的参数，`key` 代表了存储 Session 的 Cookie 键值对的 key 是什么。在默认的配置下，存放 Session 的 Cookie 将会加密存储、不可被前端 js 访问，这样可以保证用户的 Session 是安全的。

### 扩展存储

Session 默认存放在 Cookie 中，但是如果我们的 Session 对象过于庞大，就会带来一些额外的问题：

- 前面提到，浏览器通常都有限制最大的 Cookie 长度，当设置的 Session 过大时，浏览器可能拒绝保存。
- Cookie 在每次请求时都会带上，当 Session 过大时，每次请求都要额外带上庞大的 Cookie 信息。

框架提供了将 Session 存储到除了 Cookie 之外的其他存储的扩展方案，我们只需要设置 `app.sessionStore` 即可将 Session 存储到指定的存储中。

```js
// app.js
module.exports = app => {
  app.sessionStore = {
    * get (key) {
      // return value;
    },
    * set (key, value, maxAge) {
      // set key to store
    },
    * destroy (key) {
      // destroy key
    },
  };
};
```

sessionStore 的实现我们也可以封装到插件中，例如 [egg-session-redis] 就提供了将 Session 存储到 redis 中的能力，在应用层，我们只需要引入 [egg-redis] 和 [egg-session-redis] 插件即可。

```js
// plugin.js
exports.redis = {
  enable: true,
  package: 'egg-redis',
};
exports.sessionRedis = {
  enable: true,
  package: 'egg-session-redis',
};
```

**注意：一旦选择了将 Session 存入到外部存储中，就意味着系统将强依赖于这个外部存储，当它挂了的时候，我们就完全无法使用 Session 相关的功能了。因此我们更推荐大家只将必要的信息存储在 Session 中，保持 Session 的精简并使用默认的 Cookie 存储，用户级别的缓存不要存储在 Session 中。**

### Session 实践

#### 修改用户 Session 失效时间

虽然在 Session 的配置中有一项是 maxAge，但是它只能全局设置 Session 的有效期，我们经常可以在一些网站的登陆页上看到有 **记住我** 的选项框，勾选之后可以让登陆用户的 Session 有效期更长。这种针对特定用户的 Session 有效时间设置我们可以通过 `context.session.maxAge=` 来实现。

```js
const ms = require('ms');
// login 的 controller
exports.login = function* (ctx) {
  const { username, password, rememberMe } = ctx.request.body;
  const user = yield ctx.loginAndGetUser(username, password);

  // 设置 Session
  this.session.user = user;
  // 如果用户勾选了 `记住我`，设置 30 天的过期时间
  if (rememberMe) this.session.maxAge = ms('30d');
};
```

#### 延长用户 Session 有效期

默认情况下，当用户请求没有导致 Session 被修改时，框架都不会延长 Session 的有效期，但是在有些场景下，我们希望用户每次访问都刷新 Session 的有效时间，这样用户只有在长期未访问我们的网站的时候才会被登出。这个功能我们可以通过 `context.session.save()` 来实现。

例如，我们在项目中增加一个中间件，让它在 Session 有值的时候强制保存一次，以达到延长 Session 有效期的目的。

```js
// app/middleware/save_session.js
module.exports = () => {
  return function* (next) {
    yield next;
    // 如果 Session 是空的，则不保存
    if (!this.session.populated) return;
    this.session.save();
  };
};

// config/config.default.js
// 在配置文件中引入中间件
exports.middleware = [ 'saveSession' ];
```

[egg-redis]: https://github.com/eggjs/egg-redis
[egg-session-redis]: https://github.com/eggjs/egg-session-redis
