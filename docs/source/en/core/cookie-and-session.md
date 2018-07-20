title: Cookie and Session
---

## Cookie

HTTP is a stateless protocol.
But web applications often need to identify the sender of requests.
To solve this problem, HTTP protocol defines a header [Cookie](https://en.wikipedia.org/wiki/HTTP_cookie).
Web servers can use response header `Set-Cookie` to send small data to clients.
Clients (e.g. web browsers) store the data according to protocol,
and attach the cookie data in future requests.
For security reason, browsers only attach cookies in the requests that are sent to the same domain.
Web servers can use `Domain` and `Path` attributes to define the scope of the cookie.

By using `ctx.cookies`, we can easily and safely read/set cookies in controller.

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

Modifying Cookie is done by setting `Set-Cookie` header in HTTP responses.
Each `Set-Cookie` creates a key-value pair in client.
Besides of setting the value of Cookie,
HTTP protocol supports more attributes to control the transfer, storage and permission of Cookie.

- `{Number} maxAge`: set the lifetime of the cookie in milliseconds. It's the milliseconds since server's "Now". Client discards a cookie after specified lifetime.
- `{Date} expires`: set the expiration time of the cookie. If `maxAge` is defined, `expires` will be ignored. If neither is defined, Cookie will expire when client session expires, usually it's the time client closed.
- `{String} path`: set the path of the cookie. By default it's on root path (`/`), which means all URL under the current domain have access to the cookie.
- `{String} domain`: set the domain of the cookie. By default, it's not defined. If defined, only specified domain have access to the cookie.
- `{Boolean} httpOnly`: set whether the cookie can be accessed by Javascript. By default it's `true`, which means Javascript cannot access the cookie.
- `{Boolean} secure`: set whether the cookie can only be accessed under HTTPS. See [explanation](http://stackoverflow.com/questions/13729749/how-does-cookie-secure-flag-work) for details. Egg.js auto sets this value to true if the current request is sent over HTTPS.

In addition to these standard Cookie attributes, egg.js supports 3 more parameters:

- `{Boolean} overwrite`: set the way of handling same Cookie key. If true, earlier called values will be overwritten by the last call; otherwise HTTP response will contain multiple `Set-Cookie` headers with the same key.
- `{Boolean} signed`: set whether the cookie should be signed. If true, the value of the cookie will be signed. So that when the value is being read, server verifies the signature to prevent cookie values modified by client. By default it's true.
- `{Boolean} encrypt`: set whether the cookie should be encrypted. It true, the cookie value will be encrypted before sending to clients so user clients cannot get raw text of the cookie. By default it's false.

When using Cookie, we need to have a clear idea of the purpose of the cookie,
how long it needs to be stored in client, can it be accessed by JS, can it be modified by client.

**By default, Cookie is signed but not encrypted,
client can see raw content but cannot modify it (manually).**

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
  httpOnly: true, // by default it's true
  encrypt: true, // cookies are encrypted during network transmission
});
```

Note:

1. Due to [the uncertainty of client's implementation](http://stackoverflow.com/questions/7567154/can-i-use-unicode-characters-in-http-headers), to ensure Cookie can be stored successfully, it's recommended to encode cookie value in base64 or other codec.
2. Due to [the limitation of Cookie length on client side](http://stackoverflow.com/questions/640938/what-is-the-maximum-size-of-a-web-browsers-cookies-key), do avoid using long Cookie. Generally speaking, no more than 4093 bytes. When Cookie value's length is greater than this value, egg.js prints a warning in log.

#### `ctx.cookies.get(key, options)`

As HTTP Cookie is sent over header,
we can use this method to easily retrieve the value of given key from Cookie.
If `options.signed` and `options.encrypt` has been configured to sign and encrypt Cookie,
the corresponding options also need to be used in `get` method.

- If `signed` is true when `set` Cookie but false when `get` Cookie, egg.js doesn't verify Cookie value, so the value could have been modified by client.
- If `encrypt` is true when `set` Cookie but false when `get` Cookie, what you get is encrypted text rather than the raw plain text.

If you want to get the cookie set by frontend or other system, you need to specify the parameter `signed` as `false`, avoid varify the cookie and not getting the vlaue.

```js
ctx.cookies.get('frontend-cookie', {
  signed: false,
});
```

### Cookie Secret Key

Since we need to sign and encrypt Cookie, a secret key is required.
In `config/config.default.js`:

```js
module.exports = {
  keys: 'key1,key2',
};
```

`keys` is defined as a string, several keys separated by commas.
When egg.js processes Cookie:

- the first key is used in encryption and signature generation.
- to decrypt or verify signature, egg.js iterates through all keys.

If you need to update Cookie secret key and don't want to invalidate existing clients' Cookie,
you can add new secret key at the front of `keys`.
After some time, when existing Cookie has expired, delete the old secret keys.

## Session

In web applications, Cookie is usually used to identify users.
So the concept of Session, which is built on top of Cookie,
was created to specifically handle user identification.

Egg.js built-in supports Session through [egg-session](https://github.com/eggjs/egg-session) plugin.
We can use `ctx.session` to read or modify current user session.

```js
class HomeController extends Controller {
  async fetchPosts() {
    const ctx = this.ctx;
    // get content from session
    const userId = ctx.session.userId;
    const posts = await ctx.service.post.fetch(userId);
    // modify session value
    ctx.session.visited = ctx.session.visited ? (ctx.session.visited + 1) : 1;
    ctx.body = {
      success: true,
      posts,
    };
  }
}
```

It is very intuitive to use Session, simply get or set.
To delete a session, set its value to null:

```js
exports.deleteSession = function* (ctx) {
  ctx.session = null;
};
```

Session is built on top of Cookie.
By default, the content of Session is stored in a Cookie field as encrypted string.
Every time a client sends requests to server, the cookie is attached in requests.
Egg.js passes decrypted cookie to server code.
The default configuration of Session is:

```js
exports.session = {
  key: 'EGG_SESS',
  maxAge: 24 * 3600 * 1000, // 1 day
  httpOnly: true,
  encrypt: true,
};
```

The attributes except of `key` are all standard Cookie attributes.
`key` is the key of the cookie that stores session content.
With default config, the session cookie is encrypted, not accessible to JS,
which ensures user cannot access or modify it.

### Store session in other storage

Session is stored in Cookie by default.
If a session is too big, there are some troubles.

- as mentioned above, clients usually have limitation on Cookie length. When session is too big, a client may refuse to store it.
- Cookie is attached in every request. If session is too big, the additional cost of sending session may be significant.

Egg.js supports to store Session in other places.
To config it, you can simply set `app.sessionStore`.

```js
// app.js
module.exports = app => {
  app.sessionStore = {
    // support promise / async
    async get (key) {
      // return value;
    },
    async set (key, value, maxAge) {
      // set key to store
    },
    async destroy (key) {
      // destroy key
    },
  };
};
```

The implementation of `sessionStore` can also be encapsulated into a plugin.
For example, [egg-session-redis] stores Session in Redis.
To apply it, import [egg-redis] and [egg-session-redis] plugin in your application.

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

**Note: once you choose to store Session in external storage,
it means your system heavily depends on the external storage.
Once it's down, Session feature won't work.
So it's recommended to put only necessary information in Session,
keep Session minimum and use the default Cookie storage if possible.
Do not put per-user's data cache in Session.**

### Session Practice

#### Set session's expiration time

Session config has a attribute `maxAge`, which controls global expiration time of all sessions of the application.

We often can see a **Remember Me** option on a lot of websites' login page.
If it's selected, Session of this logged in user can live longer.
This kind of per-user session expiration time can be set through `ctx.session.maxAge`:

```js
const ms = require('ms');
class UserController extends Controller {
  async login() {
    const ctx = this.ctx;
    const { username, password, rememberMe } = ctx.request.body;
    const user = await ctx.loginAndGetUser(username, password);

    // set Session
    ctx.session.user = user;
    // if user selected `Remember Me`, set expiration time to 30 days
    if (rememberMe) ctx.session.maxAge = ms('30d');
  }
}
```

#### Extend session's expiration time

By default, if user requests don't result in modification of Session,
egg.js doesn't extend expiration time of the session.
But in some scenarios, we hope that if users visit our site for a long time, then extend their session validity and not let the user exit the login state. The framework provides a `renew` configuration item to implement this feature. It will reset the session's validity period when it finds that the user's session is half the maximum validity period.

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
