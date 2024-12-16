---
title: Cookie 与 Session
order: 6
---

## Cookie

HTTP 请求都是无状态的，但是我们的 Web 应用通常都需要知道发起请求的人是谁。为了解决这个问题，HTTP 协议设计了一个特殊的请求头：[Cookie](https://en.wikipedia.org/wiki/HTTP_cookie)。服务端可以通过响应头（set-cookie）将少量数据响应给客户端，浏览器会遵循协议将数据保存，并在下次请求同一个服务的时候带上（浏览器也会遵循协议，只在访问符合 Cookie 指定规则的网站时带上对应的 Cookie 来保证安全性）。

通过 `ctx.cookies`，我们可以在 controller 中便捷、安全地设置和读取 Cookie。

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

设置 Cookie 其实是通过在 HTTP 响应中设置 `set-cookie` 头完成的，每一个 `set-cookie` 都会让浏览器在 Cookie 中存一个键值对。在设置 Cookie 值的同时，协议还支持许多参数来配置这个 Cookie 的传输、存储和权限。

- `{Number} maxAge`：设置这个键值对在浏览器的最长保存时间。是一个从服务器当前时刻开始的毫秒数。
- `{Date} expires`：设置这个键值对的失效时间。如果设置了 `maxAge`，`expires` 将会被覆盖。如果 `maxAge` 和 `expires` 都没设置，Cookie 将会在浏览器的会话失效（一般是关闭浏览器时）的时候失效。
- `{String} path`：设置键值对生效的 URL 路径，默认设置在根路径上（`/`），也就是当前域名下的所有 URL 都可以访问这个 Cookie。
- `{String} domain`：设置键值对生效的域名，默认没有配置，可以配置成只在指定域名才能访问。
- `{Boolean} httpOnly`：设置键值对是否可以被 JS 访问，默认为 true，不允许被 JS 访问。
- `{Boolean} secure`：设置键值对只在 HTTPS 连接上传输，框架会帮我们判断当前是否在 HTTPS 连接上自动设置 `secure` 的值。
- `{Boolean} partitioned`：设置独立分区状态（简称 [CHIPS](https://developers.google.com/privacy-sandbox/3pcd/chips)）的 Cookie。注意，只有 `secure` 为 `true` 时此配置才会生效，并且目前仅 Chrome >=114 和 Firefox >= 131 [支持](https://developer.mozilla.org/en-US/docs/Web/Privacy/Privacy_sandbox/Partitioned_cookies#browser_compatibility)。
- `{Boolean} removeUnpartitioned`：是否删除非独立分区状态的同名 cookie。注意，只有 `partitioned` 为 `true` 时此配置才会生效。
- `{Boolean} priority`：设置 Cookie 的优先级，可选值为 `Low`、`Medium`、`High`，目前只有 [Chrome >= 81](https://bugs.chromium.org/p/chromium/issues/detail?id=232693) 实现，可以在 [DevTools 中查看](https://developer.chrome.com/blog/new-in-devtools-81?hl=zh-cn#cookiepriority)。请注意不要和 HTTP 的 [`Priority` header](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Priority) 混淆。

除了这些属性之外，框架另外扩展了三个参数的支持：

- `{Boolean} overwrite`：设置 key 相同的键值对如何处理。如果设置为 true，则后设置的值会覆盖前面设置的；否则将会发送两个 set-cookie 响应头。
- `{Boolean} signed`：设置是否对 Cookie 进行签名。如果设置为 true，则设置键值对的时候会同时对这个键值对的值进行签名，后面取的时候做校验，可以防止前端对这个值进行篡改。默认为 true。
- `{Boolean} encrypt`：设置是否对 Cookie 进行加密。如果设置为 true，则在发送 Cookie 前会对这个键值对的值进行加密，客户端无法读取到 Cookie 的明文值。默认为 false。

在设置 Cookie 时我们需要思考清楚这个 Cookie 的作用，它需要被浏览器保存多久？是否可以被 js 获取到？是否可以被前端修改？

默认的配置下，Cookie 是加签不加密的，浏览器可以看到明文，js 不能访问，不能被客户端（手工）篡改。

- 如果想要 Cookie 在浏览器端可以被 js 访问并修改：

```js
ctx.cookies.set(key, value, {
  httpOnly: false,
  signed: false
});
```

- 如果想要 Cookie 在浏览器端不能被修改，不能看到明文：

```js
ctx.cookies.set(key, value, {
  httpOnly: true, // 默认就是 true
  encrypt: true  // 加密传输
});
```

注意：

1. 由于[浏览器和其他客户端实现的不确定性](http://stackoverflow.com/questions/7567154/can-i-use-unicode-characters-in-http-headers)，为了保证 Cookie 可以写入成功，建议 value 通过 base64 编码或者其他形式 encode 之后再写入。
2. 由于[浏览器对 Cookie 有长度限制](http://stackoverflow.com/questions/640938/what-is-the-maximum-size-of-a-web-browsers-cookies-key)，所以尽量不要设置太长的 Cookie。一般来说不要超过 4093 bytes。当设置的 Cookie value 大于这个值时，框架会打印一条警告日志。

#### `ctx.cookies.get(key, options)`

由于 HTTP 请求中的 Cookie 是在一个 header 中传输过来的，通过框架提供的这个方法可以快速地从整段 Cookie 中获取对应的键值对的值。上面在设置 Cookie 的时候，我们可以设置 `options.signed` 和 `options.encrypt` 来对 Cookie 进行签名或加密，因此对应的在获取 Cookie 的时候也要传递相匹配的选项。

- 如果设置的时候指定为 signed，获取时未指定，则不会在获取时对取到的值做验签，可能导致被客户端篡改。
- 如果设置的时候指定为 encrypt，获取时未指定，则无法获取到真实的值，而是加密过后的密文。

如果要获取前端或者其他系统设置的 cookie，需要指定参数 `signed` 为 `false`，避免验签导致获取不到 cookie 的值。

```js
ctx.cookies.get('frontend-cookie', {
  signed: false
});
```

### Cookie 秘钥

由于我们在 Cookie 中需要用到加解密和验签，所以需要配置一个秘钥供加密使用。在 `config/config.default.js` 中：

```js
module.exports = {
  keys: 'key1,key2'
};
```

keys 配置成一个字符串，可以按照逗号分隔配置多个 key。Cookie 在使用这个配置进行加解密时：

- 加密和加签时只会使用第一个秘钥。
- 解密和验签时会遍历 keys 进行解密。

如果我们想要更新 Cookie 的秘钥，但是又不希望之前设置到用户浏览器上的 Cookie 失效，可以将新的秘钥配置到 keys 最前面，等过一段时间之后再删除不需要的秘钥即可。
## Session

Cookie 通常用作 Web 应用中标识请求方身份的功能，基于此，Web 应用封装了 Session 概念，专用于用户身份识别。

框架内置了 [Session](https://github.com/eggjs/egg-session) 插件，提供了 `ctx.session` 用于访问或修改当前用户的 Session。

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

Session 的使用方法非常直观，直接读取或修改即可。若需删除 Session，将其赋值为 null：

```js
ctx.session = null;
```

需要 **特别注意** 的是，设置 session 属性时要避免以下情况，否则可能导致字段丢失（详见 [koa-session](https://github.com/koajs/session/blob/master/lib/session.js#L37-L47) 源码）：

- 不以 `_` 开头
- 不使用 `isNew`

```js
// ❌ 错误的用法
ctx.session._visited = 1; // 该字段会在下一次请求时丢失
ctx.session.isNew = 'HeHe'; // 为内部关键字，不应更改

// ✔️ 正确的用法
ctx.session.visited = 1; // 无问题
```

Session 默认基于 Cookie 实现，内容加密后直接存储在 Cookie 的字段中。每次请求带上这个 Cookie，服务端解密后使用。默认配置如下：

```js
exports.session = {
  key: 'EGG_SESS',
  maxAge: 24 * 3600 * 1000, // 1 天
  httpOnly: true,
  encrypt: true,
};
```

上述参数除 `key` 外均为 Cookie 的参数，`key` 代表存储 Session 的 Cookie 键值对的 key。默认配置下，存放 Session 的 Cookie 将加密存储、前端 js 不可访问，保障用户 Session 安全。

### 扩展存储

Session 默认存放在 Cookie 中可能出现问题：浏览器有最大 Cookie 长度限制，过大的 Session 可能被拒绝保存，且每次请求Session 会增加额外传输负担。

框架允许将 Session 存储到 Cookie 之外的存储，只需设置 `app.sessionStore` 即可：

```js
// app.js
module.exports = app => {
  app.sessionStore = {
    async get(key) {
      // 返回值
    },
    async set(key, value, maxAge) {
      // 设置 key 到存储
    },
    async destroy(key) {
      // 销毁 key
    },
  };
};
```

例如，通过引入 [egg-redis](https://github.com/eggjs/egg-redis) 和 [egg-session-redis](https://github.com/eggjs/egg-session-redis) 插件，可以将 Session 存储到 redis 中。

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

**注意**：将 Session 存入外部存储意味着系统强依赖该存储。建议仅将必要信息存于 Session，并保持其精简使用默认的 Cookie 存储，不将用户级别的缓存存于 Session。

### Session 实践

#### 修改用户 Session 失效时间

Session 配置中的 `maxAge` 可全局设置有效期。**记住我** 功能中，可针对特定用户的 Session 设置不同有效时间，通过 `ctx.session.maxAge=` 实现：

```js
const ms = require('ms');
class UserController extends Controller {
  async login() {
    const ctx = this.ctx;
    const { username, password, rememberMe } = ctx.request.body;
    const user = await ctx.loginAndGetUser(username, password);

    // 设置 Session
    ctx.session.user = user;
    // 勾选 `记住我` 时，设置 30 天过期时间
    if (rememberMe) ctx.session.maxAge = ms('30d');
  }
}
```

#### 延长用户 Session 有效期

默认情况下，未修改 Session 的请求不延长有效期。某些场景下希望用户长期访问站点时延长 Session 有效期，`renew` 配置项可实现此功能，如 Session 剩余有效期少于半时，重置有效期：

```js
// config/config.default.js
exports.session = {
  renew: true,
};
```

[egg-redis]: https://github.com/eggjs/egg-redis
[egg-session-redis]: https://github.com/eggjs/egg-session-redis
