---
title: Cookie 与 Session
order: 6
---

## Cookie

HTTP 请求都是无状态的，但是我们的 Web 应用通常都需要知道发起请求的人是谁。为了解决这个问题，HTTP 协议设计了一个特殊的请求头：[Cookie](https://en.wikipedia.org/wiki/HTTP_cookie)。服务端可以通过响应头（set-cookie）将少量数据响应给客户端，浏览器会遵循协议将数据保存，并在下次请求同一个服务的时候带上（浏览器也会遵循协议，只在访问符合 Cookie 指定规则的网站时带上对应的 Cookie 来保证安全性）。

通过 `ctx.cookies`，我们可以在 controller 中便捷、安全的设置和读取 Cookie。

```js
class HomeController extends Controller {
  async add() {
    const ctx = this.ctx;
    let count = ctx.cookies.get('count');
    count = count ? Number(count) : 0;
    ctx.cookies.set('count', ++count);
    ctx.body = count;
  }
  async remove() {
    const ctx = this.ctx;
    ctx.cookies.set('count', null);
    ctx.status = 204;
  }
}
```

#### `ctx.cookies.set(key, value, options)`

设置 Cookie 其实是通过在 HTTP 响应中设置 set-cookie 头完成的，每一个 set-cookie 都会让浏览器在 Cookie 中存一个键值对。在设置 Cookie 值的同时，协议还支持许多参数来配置这个 Cookie 的传输、存储和权限。

- `{Number} maxAge`: 设置这个键值对在浏览器的最长保存时间。是一个从服务器当前时刻开始的毫秒数。
- `{Date} expires`: 设置这个键值对的失效时间，如果设置了 maxAge，expires 将会被覆盖。如果 maxAge 和 expires 都没设置，Cookie 将会在浏览器的会话失效（一般是关闭浏览器时）的时候失效。
- `{String} path`: 设置键值对生效的 URL 路径，默认设置在根路径上（`/`），也就是当前域名下的所有 URL 都可以访问这个 Cookie。
- `{String} domain`: 设置键值对生效的域名，默认没有配置，可以配置成只在指定域名才能访问。
- `{Boolean} httpOnly`: 设置键值对是否可以被 js 访问，默认为 true，不允许被 js 访问。
- `{Boolean} secure`: 设置键值对[只在 HTTPS 连接上传输](http://stackoverflow.com/questions/13729749/how-does-cookie-secure-flag-work)，框架会帮我们判断当前是否在 HTTPS 连接上自动设置 secure 的值。

除了这些属性之外，框架另外扩展了 3 个参数的支持：

- `{Boolean} overwrite`：设置 key 相同的键值对如何处理，如果设置为 true，则后设置的值会覆盖前面设置的，否则将会发送两个 set-cookie 响应头。
- `{Boolean} signed`：设置是否对 Cookie 进行签名，如果设置为 true，则设置键值对的时候会同时对这个键值对的值进行签名，后面取的时候做校验，可以防止前端对这个值进行篡改。默认为 true。
- `{Boolean} encrypt`：设置是否对 Cookie 进行加密，如果设置为 true，则在发送 Cookie 前会对这个键值对的值进行加密，客户端无法读取到 Cookie 的明文值。默认为 false。

在设置 Cookie 时我们需要思考清楚这个 Cookie 的作用，它需要被浏览器保存多久？是否可以被 js 获取到？是否可以被前端修改？

**默认的配置下，Cookie 是加签不加密的，浏览器可以看到明文，js 不能访问，不能被客户端（手工）篡改。**

- 如果想要 Cookie 在浏览器端可以被 js 访问并修改:

```js
ctx.cookies.set(key, value, {
  httpOnly: false,
  signed: false,
});
```

- 如果想要 Cookie 在浏览器端不能被修改，不能看到明文：

```js
ctx.cookies.set(key, value, {
  httpOnly: true, // 默认就是 true
  encrypt: true, // 加密传输
});
```

注意：

1. 由于[浏览器和其他客户端实现的不确定性](http://stackoverflow.com/questions/7567154/can-i-use-unicode-characters-in-http-headers)，为了保证 Cookie 可以写入成功，建议 value 通过 base64 编码或者其他形式 encode 之后再写入。
2. 由于[浏览器对 Cookie 有长度限制限制](http://stackoverflow.com/questions/640938/what-is-the-maximum-size-of-a-web-browsers-cookies-key)，所以尽量不要设置太长的 Cookie。一般来说不要超过 4093 bytes。当设置的 Cookie value 大于这个值时，框架会打印一条警告日志。

#### `ctx.cookies.get(key, options)`

由于 HTTP 请求中的 Cookie 是在一个 header 中传输过来的，通过框架提供的这个方法可以快速的从整段 Cookie 中获取对应的键值对的值。上面在设置 Cookie 的时候，我们可以设置 `options.signed` 和 `options.encrypt` 来对 Cookie 进行签名或加密，因此对应的在获取 Cookie 的时候也要传相匹配的选项。

- 如果设置的时候指定为 signed，获取时未指定，则不会在获取时对取到的值做验签，导致可能被客户端篡改。
- 如果设置的时候指定为 encrypt，获取时未指定，则无法获取到真实的值，而是加密过后的密文。

如果要获取前端或者其他系统设置的 cookie，需要指定参数 `signed` 为 `false`，避免对它做验签导致获取不到 cookie 的值。

```js
ctx.cookies.get('frontend-cookie', {
  signed: false,
});
```

### Cookie 秘钥

由于我们在 Cookie 中需要用到加解密和验签，所以需要配置一个秘钥供加密使用。在 `config/config.default.js` 中

```js
module.exports = {
  keys: 'key1,key2',
};
```

keys 配置成一个字符串，可以按照逗号分隔配置多个 key。Cookie 在使用这个配置进行加解密时：

- 加密和加签时只会使用第一个秘钥。
- 解密和验签时会遍历 keys 进行解密。

如果我们想要更新 Cookie 的秘钥，但是又不希望之前设置到用户浏览器上的 Cookie 失效，可以将新的秘钥配置到 keys 最前面，等过一段时间之后再删去不需要的秘钥即可。

## Session

Cookie 在 Web 应用中经常承担标识请求方身份的功能，所以 Web 应用在 Cookie 的基础上封装了 Session 的概念，专门用做用户身份识别。

框架内置了 [Session](https://github.com/eggjs/egg-session) 插件，给我们提供了 `ctx.session` 来访问或者修改当前用户 Session 。

```js
class HomeController extends Controller {
  async fetchPosts() {
    const ctx = this.ctx;
    // 获取 Session 上的内容
    const userId = ctx.session.userId;
    const posts = await ctx.service.post.fetch(userId);
    // 修改 Session 的值
    ctx.session.visited = ctx.session.visited ? ctx.session.visited + 1 : 1;
    ctx.body = {
      success: true,
      posts,
    };
  }
}
```

Session 的使用方法非常直观，直接读取它或者修改它就可以了，如果要删除它，直接将它赋值为 null：

```js
ctx.session = null;
```

需要 **特别注意** 的是：设置 session 属性时需要避免以下几种情况（会造成字段丢失，详见 [koa-session](https://github.com/koajs/session/blob/master/lib/session.js#L37-L47) 源码）

- 不要以 `_` 开头
- 不能为 `isNew`

```js
// ❌ 错误的用法
ctx.session._visited = 1; //    --> 该字段会在下一次请求时丢失
ctx.session.isNew = 'HeHe'; //    --> 为内部关键字, 不应该去更改

// ✔️ 正确的用法
ctx.session.visited = 1; //   -->  此处没有问题
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
module.exports = (app) => {
  app.sessionStore = {
    // support promise / async
    async get(key) {
      // return value;
    },
    async set(key, value, maxAge) {
      // set key to store
    },
    async destroy(key) {
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

虽然在 Session 的配置中有一项是 maxAge，但是它只能全局设置 Session 的有效期，我们经常可以在一些网站的登录页上看到有 **记住我** 的选项框，勾选之后可以让登录用户的 Session 有效期更长。这种针对特定用户的 Session 有效时间设置我们可以通过 `ctx.session.maxAge=` 来实现。

```js
const ms = require('ms');
class UserController extends Controller {
  async login() {
    const ctx = this.ctx;
    const { username, password, rememberMe } = ctx.request.body;
    const user = await ctx.loginAndGetUser(username, password);

    // 设置 Session
    ctx.session.user = user;
    // 如果用户勾选了 `记住我`，设置 30 天的过期时间
    if (rememberMe) ctx.session.maxAge = ms('30d');
  }
}
```

#### 延长用户 Session 有效期

默认情况下，当用户请求没有导致 Session 被修改时，框架都不会延长 Session 的有效期，但是在有些场景下，我们希望用户如果长时间都在访问我们的站点，则延长他们的 Session 有效期，不让用户退出登录态。框架提供了一个 `renew` 配置项用于实现此功能，它会在发现当用户 Session 的有效期仅剩下最大有效期一半的时候，重置 Session 的有效期。

```js
// config/config.default.js
module.exports = {
  session: {
    renew: true,
  },
};
```

[egg-redis]: https://github.com/eggjs/egg-redis
[egg-session-redis]: https://github.com/eggjs/egg-session-redis
