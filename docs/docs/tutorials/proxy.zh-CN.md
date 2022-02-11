---
title: 前置代理模式
---

一般来说我们的服务都不会直接接受外部的请求，而会将服务部署在接入层之后，从而实现多台机器的负载均衡和服务的平滑发布，保证高可用。

在这个场景下，我们无法直接获取到真实用户请求的连接，从而无法确认用户的真实 IP，请求协议，甚至请求的域名。为了解决这个问题，框架默认提供了一系列配置项来让开发者配置，以便基于和接入层的约定（事实标准）来让应用层获取到真实的用户请求信息。

## 开启前置代理模式

通过 `config.proxy = true`，可以打开前置代理模式：

```js
// config/config.default.js

exports.proxy = true;
```

注意，开启此模式后，应用就默认自己处于反向代理之后，会支持通过解析约定的请求头来获取用户真实的 IP，协议和域名。如果你的服务未部署在反向代理之后，请不要开启此配置，以防被恶意用户伪造请求 IP 等信息。

### `config.ipHeaders`

开启 proxy 配置后，应用会解析 [X-Forwarded-For](https://en.wikipedia.org/wiki/X-Forwarded-For) 请求头来获取客户端的真实 IP。如果你的前置代理通过其他的请求头来传递该信息，可以通过 `config.ipHeaders` 来配置，这个配置项支持配置多个头（逗号分开）。

```js
// config/config.default.js

exports.ipHeaders = 'X-Real-Ip, X-Forwarded-For';
```

### `config.maxIpsCount`

`X-Forwarded-For` 等传递 IP 的头，通用的格式是：

```
X-Forwarded-For: client, proxy1, proxy2
```

我们可以拿第一个作为请求的真实 IP，但是如果有恶意用户在请求中传递了 `X-Forwarded-For` 参数来伪造其在反向代理之后，就会导致 `X-Forwarded-For` 拿到的值不准确了，可以被用来伪造请求 IP 地址，突破应用层的一些 IP 限制。

```
X-Forwarded-For: fake, client, proxy1, proxy2
```

为了避免此问题，我们可以通过 `config.maxIpsCount` 来配置前置的反向代理数量，这样在获取请求真实 IP 地址时，就会忽略掉用户多传递的伪造 IP 地址了。例如我们将应用部署在一个统一的接入层之后（例如阿里云 SLB），我们可以将此参数配置为 `1`，这样用户就无法通过 `X-Forwarded-For` 请求头来伪造 IP 地址了。

```js
// config/config.default.js

exports.maxIpsCount = 1;
```

此配置项与 [koa](https://github.com/koajs/koa/blob/master/docs/api/request.md#requestips) 提供的 `options.maxIpsCount` 作用一致。

### `config.protocolHeaders`

开启 proxy 配置后，应用会解析 [X-Forwarded-Proto](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto) 请求头来获取客户端的真实访问协议。如果你的前置代理通过其他的请求头来传递该信息，可以通过 `config.protocolHeaders` 来配置，这个配置项支持配置多个头（逗号分开）。

```js
// config/config.default.js

exports.protocolHeaders = 'X-Real-Proto, X-Forwarded-Proto';
```

### `config.hostHeaders`

开启 proxy 配置后，应用仍然还是直接读取 `host` 来获取请求的域名，绝大部分反向代理并不会修改这个值。但是也许有些反向代理会通过 [X-Forwarded-Host](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) 来传递客户端的真实访问域名，可以通过在 `config.hostHeaders` 中配置，这个配置项支持配置多个头（逗号分开）。

```js
// config/config.default.js

exports.hostHeaders = 'X-Forwarded-Host';
```
