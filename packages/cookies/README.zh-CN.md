# @eggjs/cookies

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@eggjs/cookies.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/cookies
[download-image]: https://img.shields.io/npm/dm/@eggjs/cookies.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/cookies

为 egg 提供 cookie 操作的封装。

```ts
ctx.cookies = new Cookies(ctx, keys[, defaultCookieOptions]);

ctx.cookies.get('key', 'value', options);
ctx.cookies.set('key', 'value', options);
```

## 初始化

初始化时需要传递 Array 类型 的keys 参数，否则无法使用 cookies 的 `signed` 和 `encrypt` 功能。

每次设置或读取 signed cookie 或者 encrypt cookie 的时候，会用 keys 进行加密。每次加密都通过 keys 数组的第一个 key 进行加密，解密会从先到后逐个 key 尝试解密。读取 signed cookie 时，如果发现不是用第一个 key 进行加密时，会更新签名为第一个 key 加密的值。读取 encrypt cookie 时不会进行更新操作。

### `defaultCookieOptions`

全局默认配置：

- autoChips - `Boolean` 是否开启 [CHIPS](https://developers.google.com/privacy-sandbox/3pcd/chips#security_design) 的自动适配方案，
  会自动给 Cookie 新增一个 `_CHIPS-` 为前缀的分区 Cookie，优先读取非分区 Cookie，读取失败则尝试读取 `_CHIPS-` 前缀的同名 Cookie 适配三方 Cookie 禁止逻辑。
  一旦 `cookies.set` 设置 `partitioned=true`，那么会强制忽略 `autoChips` 参数。

## 设置 cookie

通过 `cookies.set(key, value, options)` 的方式来设置一个 cookie。其中 options 支持的参数有：

- path - `String` cookie 的有效路径，默认为 `/`。
- domain - `String` cookie 的有效域名范围，默认为 `undefined`。
- expires - `Date` cookie 的失效时间。
- maxAge - `Number` cookie 的最大有效时间，如果设置了 maxAge，将会覆盖 expires 的值。
- secure - `Boolean` 是否只在加密信道中传输，注意，如果请求为 http 时，不允许设置为 `true`，https 时自动设置为 `true`。
- partitioned - `Boolean` 是否设置独立分区状态（[CHIPS](https://developers.google.com/privacy-sandbox/3pcd/chips)）的 Cookie。注意，只有 `secure` 为 `true` 的时候此配置才会生效。
- removeUnpartitioned - `Boolean` 是否删除非独立分区状态的同名 cookie。注意，只有 `partitioned` 为 `true` 的时候此配置才会生效。
- httpOnly - `Boolean` 如果设置为 `true`，则浏览器中不允许读取这个 cookie 的值。
- overwrite - `Boolean` 如果设置为 `true`，在一个请求上重复写入同一个 key 将覆盖前一次写入的值，默认为 `false`。
- signed - `Boolean` 是否需要对 cookie 进行签名，需要配合 get 时传递 signed 参数，此时前端无法篡改这个 cookie，默认为 `true`。
- encrypt - `Boolean` 是否需要对 cookie 进行加密，需要配合 get 时传递 encrypt 参数，此时前端无法读到真实的 cookie 值，默认为 `false`。
- priority - `String` 表示 cookie 优先级的字符串，可以设置为 `'low'`, `'medium'`, `'high'`，默认为 `undefined`。[A Retention Priority Attribute for HTTP Cookies](https://datatracker.ietf.org/doc/html/draft-west-cookie-priority)

## 读取 cookie

通过 `cookies.get(key, value, options)` 的方式来读取一个 cookie。其中 options 支持的参数有：

- signed - `Boolean` 是否需要对 cookie 进行验签，需要配合 set 时传递 signed 参数，此时前端无法篡改这个 cookie，默认为 true。
- encrypt - `Boolean` 是否需要对 cookie 进行解密，需要配合 set 时传递 encrypt 参数，此时前端无法读到真实的 cookie 值，默认为 false。

## 删除 cookie

通过 `cookie.set(key, null)` 来删除一个 cookie。如果传递了 `signed` 参数，签名也会被删除。

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
