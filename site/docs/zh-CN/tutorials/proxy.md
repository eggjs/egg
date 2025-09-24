---
title: 前置代理模式
---

一般来说，我们的服务都不会直接接受外部的请求，而会将服务部署在接入层之后。这样做可以实现多台机器的负载均衡和服务的平滑发布，保证高可用。

在这个场景下，我们无法直接获取到真实用户请求的连接，从而无法确认用户的真实 IP、请求协议，甚至请求的域名。为了解决这个问题，框架默认提供了一系列配置项，以便开发者基于与接入层的约定（事实标准）来使应用层获取真实的用户请求信息。

## 开启前置代理模式

通过设置 `config.proxy = true` 可以开启前置代理模式：

```js
// config/config.default.js

exports.proxy = true;
```

注意，开启此模式后，应用就默认处于反向代理之后。它会支持通过解析约定的请求头来获取用户真实的 IP、协议和域名。如果你的服务未部署在反向代理之后，请不要开启此配置，以防被恶意用户伪造请求 IP 等信息。

### `config.ipHeaders`

开启 proxy 配置后，应用会解析 [X-Forwarded-For](https://en.wikipedia.org/wiki/X-Forwarded-For) 请求头来获取客户端的真实 IP。如果你的前置代理通过其他请求头传递该信息，可以通过 `config.ipHeaders` 来配置。此配置项支持配置多个头（逗号分开）。

```js
// config/config.default.js

exports.ipHeaders = 'X-Real-Ip, X-Forwarded-For';
```

### `config.maxIpsCount`

`X-Forwarded-For` 等传递 IP 的头，通常格式是：

```
X-Forwarded-For: client, proxy1, proxy2
```

通常我们可以取第一个作为请求的真实 IP。但是，如果有恶意用户在请求中传递了 `X-Forwarded-For` 参数，以伪造其位置在反向代理之后，将会导致获取的 `X-Forwarded-For` 值变得不准确。这可能被用来伪造请求 IP 地址，绕过应用层的某些 IP 限制。

```
X-Forwarded-For: fake, client, proxy1, proxy2
```

为避免此问题，我们可以通过 `config.maxIpsCount` 来限制前置代理的数量。这样在获取请求真实 IP 地址时，会忽略掉用户所传递的伪造 IP 地址。例如，如果我们将应用部署在一个统一的接入层后（如阿里云 SLB），可以将此参数配置为 `1`。这样用户就无法通过 `X-Forwarded-For` 请求头伪造 IP 地址了。

```js
// config/config.default.js

exports.maxIpsCount = 1;
```

此配置项与 [koa](https://github.com/koajs/koa/blob/master/docs/api/request.md#requestips) 提供的 `options.maxIpsCount` 作用一致。

### `config.protocolHeaders`

开启 proxy 配置后，应用会解析 [X-Forwarded-Proto](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto) 请求头来获取客户端的真实访问协议。如果你的前置代理通过其他请求头传递该信息，可以通过 `config.protocolHeaders` 来配置。此配置项支持配置多个头（逗号分开）。

```js
// config/config.default.js

exports.protocolHeaders = 'X-Real-Proto, X-Forwarded-Proto';
```

### `config.hostHeaders`

开启 proxy 配置后，应用通常会直接读取 `host` 来获取请求的域名，因为大多数反向代理不会修改这个值。但有时，一些反向代理会通过 [X-Forwarded-Host](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) 传递客户端的真实访问域名。你可以在 `config.hostHeaders` 中配置此信息，配置项支持多个头（逗号分开）。

```js
// config/config.default.js

exports.hostHeaders = 'X-Forwarded-Host';
```
