---
title: Behind a Proxy
---

Generally, our services will not directly accept external requests, but will deploy the services behind the access layer, thus achieving load balancing of multiple machines and smooth distribution of services to ensure high availability.

In this scenario, we can't directly get the connection to the real user request, so we can't confirm the user's real IP, request protocol, or even the requested host. To solve this problem, the framework provides a set of configuration items by default for developers to configure to enable the application layer to obtain real user request information based on the agreement(de facto) with the access layer.

## Enable Proxy Mode

The proxy mode can be enabled by `config.proxy = true`:

```js
// config/config.default.js

exports.proxy = true;
```

Note that after this mode is enabled, the application defaults to being behind the reverse proxy. It will support the request header of the resolved protocol to obtain the real IP, protocol and host of the client. If your service is not deployed behind a reverse proxy, do not enable this configuration in case a malicious user falsifies information such as requesting IP.

### `config.ipHeaders`

When the proxy configuration is enabled, the app parses the [X-Forwarded-For](https://en.wikipedia.org/wiki/X-Forwarded-For) request header to get the real IP of the client. If your reverse proxy passes this information through other request headers, it can be configured via `config.ipHeaders`, which supports multiple headers (comma separated).

```js
// config/config.default.js

exports.ipHeaders = 'X-Real-Ip, X-Forwarded-For';
```

### `config.maxIpsCount`

The general format of the `X-Forwarded-For` field is:

```
X-Forwarded-For: client, proxy1, proxy2
```

We can use the first IP address as the real IP adderess of the request, but if a malicious user passes the `X-Forwarded-For` header in the request to spoof it after some reverse proxy, it will cause `X-Forwarded-For` to take The value obtained is inaccurate and can be used to spoof the request IP address, breaking some IP restrictions of the application layer.

```
X-Forwarded-For: fake, client, proxy1, proxy2
```

In order to avoid this problem, we can configure the number of reverse proxies through `config.maxIpsCount`, so the fake IP address passed by the user will be ignored. For example, if we deploy the application behind a unified access layer (such as Alibaba Cloud SLB, Amazon ELB), we can configure this configuration to `1` so that users cannot forge IP addresses through the `X-Forwarded-For` request header.

```js
// config/config.default.js

exports.maxIpsCount = 1;
```

This configuration item has the same effect as `options.maxIpsCount` provided by [koa](https://github.com/koajs/koa/blob/master/docs/api/request.md#requestips).

### `config.protocolHeaders`

When the proxy configuration is enabled, the application will parse the [X-Forwarded-Proto] (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Proto) request header to get the client's Real access protocol. If your reverse proxy passes this information through other request headers, it can be configured via `config.protocolHeaders`, which supports multiple headers (comma separated).

```js
// config/config.default.js

exports.protocolHeaders = 'X-Real-Proto, X-Forwarded-Proto';
```

### `config.hostHeaders`

When the proxy configuration is enabled, the application still reads `host` directly to get the requested domain name. Most of the reverse proxy does not modify this value. But maybe some reverse proxy will pass the client's real access via [X-Forwarded-Host] (https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Forwarded-Host) The domain name can be configured via `config.hostHeaders`, which supports multiple headers (comma separated).

```js
// config/config.default.js

exports.hostHeaders = 'X-Forwarded-Host';
```
