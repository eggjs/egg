---
title: HttpClient
order: 5
---

互联网时代，无数服务是基于 HTTP 协议进行通信的，Web 应用调用后端 HTTP 服务是一种非常常见的应用场景。

为此，框架基于 [urllib] 内置实现了一个 [HttpClient]，应用可以非常便捷地完成任何 HTTP 请求。

## 通过 `app` 使用 HttpClient

框架在应用初始化的时候，会自动将 [HttpClient] 初始化到 `app.httpclient`。同时增加了一个 `app.curl(url, options)` 方法，它等价于 `app.httpclient.request(url, options)`。

这样就可以非常方便地使用 `app.curl` 方法完成一次 HTTP 请求。

```js
// app.js
module.exports = app => {
  app.beforeStart(async () => {
    // 示例：启动时去读取 https://registry.npmmirror.com/egg/latest 的版本信息
    const result = await app.curl('https://registry.npmmirror.com/egg/latest', {
      dataType: 'json',
    });
    app.logger.info('Egg 最新版本：%s', result.data.version);
  });
};
```

## 通过 `ctx` 使用 HttpClient

框架在 Context 中同样提供了 `ctx.curl(url, options)` 和 `ctx.httpclient`，以保持与 app 下的使用体验一致。这样，在有 Context 的地方（如在 controller 中）非常方便地使用 `ctx.curl()` 方法完成一次 HTTP 请求。

```js
// app/controller/npm.js
class NpmController extends Controller {
  async index() {
    const ctx = this.ctx;

    // 示例：请求一个 npm 模块信息
    const result = await ctx.curl('https://registry.npmmirror.com/egg/latest', {
      // 自动解析 JSON 响应
      dataType: 'json',
      // 3 秒超时
      timeout: 3000,
    });

    ctx.body = {
      status: result.status,
      headers: result.headers,
      package: result.data,
    };
  }
}
```
## 基本 HTTP 请求

HTTP 已经被广泛大量使用。尽管 HTTP 有多种请求方式，但是万变不离其宗。我们先以基本的四个请求方法为例子，逐步讲解一下更多的复杂应用场景。

以下例子都会在 controller 代码中对 `https://httpbin.org` 发起请求来完成。

### GET

读取数据几乎都是使用 GET 请求。它是 HTTP 世界最常见的一种，也是最广泛的一种。它的请求参数也是最容易构造的。

```js
// app/controller/npm.js
class NpmController extends Controller {
  async get() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/get?foo=bar');
    ctx.status = result.status;
    ctx.set(result.headers);
    ctx.body = result.data;
  }
}

```

- GET 请求可以不用设置 `options.method` 参数，`HttpClient` 的默认 `method` 会设置为 `GET`。
- 返回值 `result` 会包含三个属性：`status`，`headers` 和 `data`。
  - `status`：响应状态码，如 `200`，`302`，`404`，`500` 等等。
  - `headers`：响应头，类似 `{ 'content-type': 'text/html', ... }`。
  - `data`：响应 body，默认 `HttpClient` 不会进行任何处理，会直接返回 `Buffer` 类型数据。
    一旦设置了 `options.dataType`，`HttpClient` 将会根据此参数对 `data` 进行相应的处理。

完整的请求参数 `options` 和返回值 `result` 的说明请看下文的 [options 参数详解](#options-参数详解) 章节。

### POST

创建数据的场景一般来说都会使用 POST 请求，它相对于 GET 来说，多了请求 body 这个参数。

以发送 JSON body 的场景举例：

```js
// app/controller/npm.js
class NpmController extends Controller {
  async post() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/post', {
      // 必须指定 method
      method: 'POST',
      // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
      contentType: 'json',
      data: {
        hello: 'world',
        now: Date.now(),
      },
      // 明确告诉 HttpClient 以 JSON 格式处理返回的响应 body
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}

```

下文还会详细讲解以 POST 实现表单提交和文件上传的功能。

### PUT

PUT 与 POST 类似，它更加适合更新数据和替换数据的语义。
除了 method 参数需要设置为 `PUT`，其他参数几乎与 POST 完全一样。

```js
// app/controller/npm.js
class NpmController extends Controller {
  async put() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/put', {
      // 必须指定 method
      method: 'PUT',
      // 通过 contentType 告诉 HttpClient 以 JSON 格式发送
      contentType: 'json',
      data: {
        update: 'foo bar',
      },
      // 明确告诉 HttpClient 以 JSON 格式处理响应 body
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}

```

### DELETE

删除数据会选择 DELETE 请求。它通常可以不需要增加请求 body，但是 `HttpClient` 不会对此进行限制。

```js
// app/controller/npm.js
class NpmController extends Controller {
  async del() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/delete', {
      // 必须指定 method
      method: 'DELETE',
      // 明确告诉 HttpClient 以 JSON 格式处理响应 body
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}

```
## 高级 HTTP 请求

在真实的应用场景下，还会包含一些较为复杂的 HTTP 请求。

### Form 表单提交

面向浏览器设计的 Form 表单（不包含文件）提交接口，通常都要求以 `content-type: application/x-www-form-urlencoded` 的格式提交请求数据。

```js
// app/controller/npm.js
class NpmController extends Controller {
  async submit() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/post', {
      // 必须指定 method，支持 POST，PUT 和 DELETE
      method: 'POST',
      // 不需要设置 contentType，HttpClient 会默认以 application/x-www-form-urlencoded 格式发送请求
      data: {
        now: Date.now(),
        foo: 'bar',
      },
      // 明确告诉 HttpClient 以 JSON 格式处理响应 body
      dataType: 'json',
    });
    ctx.body = result.data.form;
    // 响应最终会是类似以下的结果：
    // {
    //   "foo": "bar",
    //   "now": "1483864184348"
    // }
  }
}
```

### 以 Multipart 方式上传文件

当一个 Form 表单提交包含文件时，请求数据格式就必须以 [multipart/form-data](http://tools.ietf.org/html/rfc2388) 进行提交了。

[urllib] 内置了 [formstream] 模块来帮助我们生成可以被消费的 `form` 对象。

```js
// app/controller/http.js
class HttpController extends Controller {
  async upload() {
    const { ctx } = this;

    const result = await ctx.curl('https://httpbin.org/post', {
      method: 'POST',
      dataType: 'json',
      data: {
        foo: 'bar',
      },
      
      // 单文件上传
      files: __filename,
      
      // 多文件上传
      // files: {
      //   file1: __filename,
      //   file2: fs.createReadStream(__filename),
      //   file3: Buffer.from('mock file content'),
      // },
    });

    ctx.body = result.data.files;
    // 响应最终会是类似以下的结果：
    // {
    //   "file": "use strict; const For...."
    // }
  }
}
```

### 以 Stream 方式上传文件

其实，在 Node.js 的世界里面，Stream 才是主流。如果服务端支持流式上传，最友好的方式还是直接发送 Stream。Stream 实际会以 `Transfer-Encoding: chunked` 传输编码格式发送，这个转换是 [HTTP] 模块自动实现的。

```js
// app/controller/npm.js
const fs = require('fs');
const FormStream = require('formstream');
class NpmController extends Controller {
  async uploadByStream() {
    const ctx = this.ctx;
    // 上传当前文件本身用于测试
    const fileStream = fs.createReadStream(__filename);
    // httpbin.org 不支持 stream 模式，使用本地 stream 接口代替
    const url = `${ctx.protocol}://${ctx.host}/stream`;
    const result = await ctx.curl(url, {
      // 必须指定 method，支持 POST，PUT
      method: 'POST',
      // 以 stream 模式提交
      stream: fileStream,
    });
    ctx.status = result.status;
    ctx.set(result.headers);
    ctx.body = result.data;
    // 响应最终会是类似以下的结果：
    // {"streamSize":574}
  }
}
```
## options 参数详解

由于 HTTP 请求的复杂性，导致 `httpclient.request(url, options)` 的 options 参数会非常多。
接下来将以参数说明和代码配合一起讲解每个可选参数的实际用途。

### HttpClient 默认全局配置

```javascript
// config/config.default.js
exports.httpclient = {
  // 是否开启本地 DNS 缓存，默认关闭，开启后有两个特性
  // 1. 所有 DNS 查询都会默认优先使用缓存的，即使 DNS 查询错误也不影响应用
  // 2. 对同一个域名，在 dnsCacheLookupInterval 的间隔内（默认 10s）只会查询一次
  enableDNSCache: false,
  // 对同一个域名进行 DNS 查询的最小间隔时间
  dnsCacheLookupInterval: 10000,
  // DNS 同时缓存的最大域名数量，默认 1000
  dnsCacheMaxLength: 1000,

  request: {
    // 默认 request 超时时间
    timeout: 3000
  },

  httpAgent: {
    // 默认开启 http KeepAlive 功能
    keepAlive: true,
    // 空闲的 KeepAlive socket 最长可以存活 4 秒
    freeSocketTimeout: 4000,
    // 当 socket 超过 30 秒都没有任何活动，就会被当作超时处理掉
    timeout: 30000,
    // 允许创建的最大 socket 数
    maxSockets: Number.MAX_SAFE_INTEGER,
    // 最大空闲 socket 数
    maxFreeSockets: 256
  },

  httpsAgent: {
    // 默认开启 https KeepAlive 功能
    keepAlive: true,
    // 空闲的 KeepAlive socket 最长可以存活 4 秒
    freeSocketTimeout: 4000,
    // 当 socket 超过 30 秒都没有任何活动，就会被当作超时处理掉
    timeout: 30000,
    // 允许创建的最大 socket 数
    maxSockets: Number.MAX_SAFE_INTEGER,
    // 最大空闲 socket 数
    maxFreeSockets: 256
  }
};
```

应用可以通过 `config/config.default.js` 覆盖此配置。

### `data: Object`

需要发送的请求数据，根据 `method` 自动选择正确的数据处理方式。

- GET、HEAD：通过 `querystring.stringify(data)` 处理后拼接到 url 的 query 参数上。
- POST、PUT 和 DELETE 等：需要根据 `contentType` 做进一步判断处理。
  - `contentType = json`：通过 `JSON.stringify(data)` 处理，并设置为 body 发送。
  - 其他：通过 `querystring.stringify(data)` 处理，并设置为 body 发送。

```javascript
// GET + data
ctx.curl(url, {
  data: { foo: 'bar' }
});

// POST + data
ctx.curl(url, {
  method: 'POST',
  data: { foo: 'bar' }
});

// POST + JSON + data
ctx.curl(url, {
  method: 'POST',
  contentType: 'json',
  data: { foo: 'bar' }
});
```

### `dataAsQueryString: Boolean`

如果设置了 `dataAsQueryString=true`，即使在 POST 请求下，
也会将 `options.data` 经 `querystring.stringify` 处理后拼接到 `url` 的 query 参数上。

此设置适用于需要以 `stream` 发送数据，并且附带额外的请求参数以 `url` query 形式传递的场景：

```javascript
ctx.curl(url, {
  method: 'POST',
  dataAsQueryString: true,
  data: {
    // 通常是权限验证参数，如 access token
    accessToken: 'some access token value'
  },
  stream: myFileStream
});
```

### `content: String|Buffer`

发送请求正文。若设置此参数，将直接忽略 `data` 参数。

```javascript
ctx.curl(url, {
  method: 'POST',
  // 直接发送原始 XML 数据，不需 HttpClient 经行特殊处理
  content: '<xml><hello>world</hello></xml>',
  headers: {
    'content-type': 'text/html'
  }
});
```
### `files: Mixed`

文件上传，支持以下格式：`String | ReadStream | Buffer | Array | Object`。

```js
ctx.curl(url, {
  method: 'POST',
  files: '/path/to/read',
  data: {
    foo: 'other fields',
  },
});
```

多文件上传：

```js
ctx.curl(url, {
  method: 'POST',
  files: {
    file1: '/path/to/read',
    file2: fs.createReadStream(__filename),
    file3: Buffer.from('mock file content'),
  },
  data: {
    foo: 'other fields',
  },
});
```

### `stream: ReadStream`

设置发送请求正文的可读数据流，默认值为 `null`。一旦设置了此参数，`HttpClient` 将忽略 `data` 和 `content`。

```js
ctx.curl(url, {
  method: 'POST',
  stream: fs.createReadStream('/path/to/read'),
});
```

### `writeStream: WriteStream`

设置接收响应数据的可写数据流，默认值为 `null`。一旦设置此参数，返回值 `result.data` 将被设置为 `null`，因数据已写入 `writeStream`。

```js
ctx.curl(url, {
  writeStream: fs.createWriteStream('/path/to/store'),
});
```

### `consumeWriteStream: Boolean`

是否等待 `writeStream` 完全写完才算响应接收完毕，默认为 `true`。此参数建议保留默认值，除非你明确知道其可能的副作用。

### `method: String`

设置请求方法，默认为 `GET`。支持 `GET`、`POST`、`PUT`、`DELETE`、`PATCH` 等 [所有 HTTP 方法](https://nodejs.org/api/http.html#http_http_methods)。

### `contentType: String`

设置请求数据格式，默认为 `undefined`。`HttpClient` 会根据 `data` 和 `content` 自动设置。`data` 为 object 时，默认设为 `form`。支持 `json` 格式。

例如，以 JSON 格式发送 `data`：

```js
ctx.curl(url, {
  method: 'POST',
  data: {
    foo: 'bar',
    now: Date.now(),
  },
  contentType: 'json',
});
```

### `dataType: String`

设置响应数据格式，默认不处理，直接返回 buffer。支持 `text` 和 `json`。

**注意：若设为 `json`，解析失败则抛出 `JSONResponseFormatError` 异常。**

```js
const jsonResult = await ctx.curl(url, {
  dataType: 'json',
});
console.log(jsonResult.data);

const htmlResult = await ctx.curl(url, {
  dataType: 'text',
});
console.log(htmlResult.data);
```

### `fixJSONCtlChars: Boolean`

是否自动过滤特殊控制字符（U+0000～U+001F），默认为 `false`。某些 CGI 系统返回的 JSON 可能含有这些字符。

```js
ctx.curl(url, {
  fixJSONCtlChars: true,
  dataType: 'json',
});
```

### `headers: Object`

自定义请求头。

```js
ctx.curl(url, {
  headers: {
    'x-foo': 'bar',
  },
});
```
### `timeout: Number|Array`

请求超时时间，默认是 `[5000, 5000]`，即创建连接超时是 5 秒，接收响应超时是 5 秒。

```js
ctx.curl(url, {
  // 创建连接超时 3 秒，接收响应超时 3 秒
  timeout: 3000
});

ctx.curl(url, {
  // 创建连接超时 1 秒，接收响应超时 30 秒，用于响应比较大的场景
  timeout: [1000, 30000]
});
```

### `agent: HttpAgent`

允许通过此参数覆盖默认的 HttpAgent，如果你不想开启 KeepAlive，可以设置此参数为 `false`。

```js
ctx.curl(url, {
  agent: false
});
```

### `httpsAgent: HttpsAgent`

允许通过此参数覆盖默认的 HttpsAgent，如果你不想开启 KeepAlive，可以设置此参数为 `false`。

```js
ctx.curl(url, {
  httpsAgent: false
});
```

### `auth: String`

简单登录授权（Basic Authentication）参数，将以明文方式将登录信息以 `Authorization` 请求头发送出去。

```js
ctx.curl(url, {
  // 参数必须按照 `user:password` 格式设置
  auth: 'foo:bar'
});
```

### `digestAuth: String`

摘要登录授权（Digest Authentication）参数，设置此参数会自动对 401 响应尝试生成 `Authorization` 请求头，尝试以授权方式请求一次。

```js
ctx.curl(url, {
  // 参数必须按照 `user:password` 格式设置
  digestAuth: 'foo:bar'
});
```

### `followRedirect: Boolean`

是否自动跟进 3xx 的跳转响应，默认是 `false`。

```js
ctx.curl(url, {
  followRedirect: true
});
```

### `maxRedirects: Number`

设置最大自动跳转次数，避免循环跳转无法终止，默认是 10 次。此参数不宜设置过大，它只在 `followRedirect=True` 情况下才会生效。

```js
ctx.curl(url, {
  followRedirect: true,
  // 最多自动跳转 5 次
  maxRedirects: 5
});
```

### `formatRedirectUrl: Function(from, to)`

允许通过 `formatRedirectUrl` 自定义实现 302、301 等跳转 URL 的拼接，默认是 `url.resolve(from, to)`。

```js
ctx.curl(url, {
  formatRedirectUrl: (from, to) => {
    // 比如可以在这里修正跳转不正确的 URL
    if (to === '//foo/') {
      to = '/foo';
    }
    return url.resolve(from, to);
  }
});
```

### `beforeRequest: Function(options)`

HttpClient 在请求正式发送之前，会尝试调用 `beforeRequest` 钩子，允许我们在这里对请求参数做最后一次修改。

```js
ctx.curl(url, {
  beforeRequest: (options) => {
    // 比如可以在这里设置全局请求 ID，便于日志跟踪
    options.headers['x-request-id'] = uuid.v1();
  }
});
```

### `streaming: Boolean`

是否直接返回响应流，默认为 `false`。一旦启用 `streaming`，HttpClient 会在拿到响应对象 res 之后立即返回，此时 `result.headers` 和 `result.status` 已可读取，只是没有读取数据 `data`。

```js
const result = await ctx.curl(url, {
  streaming: true
});

console.log(result.status, result.data);
// result.res 是一个 ReadStream 对象
ctx.body = result.res;
```

**注意**：如果 res 不是直接传递给 body，那么我们必须消费这个 stream 并且做好 `error` 事件的处理。
### `gzip: Boolean`

是否支持 gzip 响应格式，默认为 `false`。开启 gzip 之后，HttpClient 将自动设置 `Accept-Encoding: gzip` 请求头，并且会自动解压带有 `Content-Encoding: gzip` 响应头的数据。

```js
ctx.curl(url, {
  gzip: true,
});
```

### `timing: Boolean`

是否开启请求各阶段的时间测量，默认为 `false`。开启 timing 之后，可以通过 `result.res.timing` 拿到这次 HTTP 请求各阶段的时间测量值（单位是毫秒）。通过这些测量值，我们可以非常方便地定位到这次请求最慢的环节发生在哪个阶段。效果类似于Chrome network timing。

timing 各阶段测量值解析：
- queuing：分配 socket 的耗时
- dnslookup：DNS 查询耗时
- connected：socket 三次握手连接成功耗时
- requestSent：请求数据完整发送结束耗时
- waiting：收到第一个字节响应数据耗时
- contentDownload：全部响应数据接收完毕耗时

```js
const result = await ctx.curl(url, {
  timing: true,
});
console.log(result.res.timing);
// {
//   "queuing": 29,
//   "dnslookup": 37,
//   "connected": 370,
//   "requestSent": 1001,
//   "waiting": 1833,
//   "contentDownload": 3416
// }
```

### `ca`、`rejectUnauthorized`、`pfx`、`key`、`cert`、`passphrase`、`ciphers` 和 `secureProtocol`

这几个参数都是透传给 [HTTPS] 模块的参数，具体可查看 [`https.request(options, callback)`](https://nodejs.org/api/https.html#https_https_request_options_callback)。

## 调试辅助

如果你需要对 HttpClient 的请求进行抓包调试，可以添加以下配置到 `config.local.js`：

```js
// config.local.js
module.exports = () => {
  const config = {};

  // add http_proxy to httpclient
  if (process.env.http_proxy) {
    config.httpclient = {
      request: {
        enableProxy: true,
        rejectUnauthorized: false,
        proxy: process.env.http_proxy,
      },
    };
  }

  return config;
};
```

然后启动抓包工具，如 [Charles] 或 [Fiddler]。通过以下指令启动应用：

```bash
$ http_proxy=http://127.0.0.1:8888 npm run dev
```

操作完成后，所有通过 HttpClient 发出的请求都可以在抓包工具中查看。

## 常见错误

### 创建连接超时
- 异常名称：`ConnectionTimeoutError`
- 出现场景：通常是 DNS 查询较慢或者客户端与服务端网络较慢导致。
- 排查建议：适当增大 `timeout` 参数。

### 服务响应超时
- 异常名称：`ResponseTimeoutError`
- 出现场景：客户端与服务端网络较慢，响应数据较大时发生。
- 排查建议：适当增大 `timeout` 参数。

### 服务主动断开连接
- 异常名称：`ResponseError, code: ECONNRESET`
- 出现场景：服务端主动断开 socket 连接，导致 HTTP 请求链路异常。
- 排查建议：检查服务端是否发生网络异常。

### 服务不可达
- 异常名称：`RequestError, code: ECONNREFUSED, status: -1`
- 出现场景：请求的 URL 所属 IP 或端口无法连接。
- 排查建议：确保 IP 或端口设置正确。

### 域名不存在
- 异常名称：`RequestError, code: ENOTFOUND, status: -1`
- 出现场景：请求的 URL 域名无法通过 DNS 解析。
- 排查建议：确保域名存在，检查 DNS 服务配置。

### JSON 响应数据格式错误
- 异常名称：`JSONResponseFormatError`
- 出现场景：设置 `dataType=json` 但响应数据不是 JSON 格式时抛出。
- 排查建议：确保服务端返回正确的 JSON 格式数据。
## 全局 `request` 和 `response` 事件

在企业应用场景中，常常会有统一 tracer 日志的需求。
为了方便在 app 层面统一监听 HttpClient 的请求和响应，我们约定了全局 `request` 和 `response` 事件来暴露这两个事件。

```
    init options
        |
        V
    emit `request` event
        |
        V
    send request and receive response
        |
        V
    emit `response` event
        |
        V
       end
```

### `request` 事件：发生在网络操作发生之前

请求发送之前，会触发一个 `request` 事件，允许对请求做拦截。

```js
app.httpclient.on('request', (req) => {
  req.url; // 请求 URL
  req.ctx; // 发起这次请求的当前上下文

  // 可以在这里设置一些 trace headers，方便全链路跟踪
});
```

### `response` 事件：发生在网络操作结束之后

请求结束之后会触发一个 `response` 事件，这样外部就可以订阅这个事件来打印日志。

```js
app.httpclient.on('response', (result) => {
  result.res.status; // 响应状态码
  result.ctx; // 发起这次请求的当前上下文
  result.req; // 对应的 req 对象，即 request 事件里的那个 req
});
```

## 示例代码

完整示例代码可以在 [eggjs/examples/httpclient](https://github.com/eggjs/examples/blob/master/httpclient) 找到。

其他参考链接：
- [urllib]: https://github.com/node-modules/urllib
- [httpclient]: https://github.com/eggjs/egg/blob/master/lib/core/httpclient.js
- [formstream]: https://github.com/node-modules/formstream
- [http]: https://nodejs.org/api/http.html
- [https]: https://nodejs.org/api/https.html
- [charles]: https://www.charlesproxy.com/
- [fiddler]: http://www.telerik.com/fiddler
