title: HttpClient
---

互联网时代，无数服务是基于 HTTP 协议进行通信的，Web 应用调用后端 HTTP 服务是一种非常常见的应用场景。

为此框架基于 [urllib] 内置实现了一个 [HttpClient]，应用可以非常便捷地完成任何 HTTP 请求。

## 通过 app 使用 HttpClient

框架在应用初始化的时候，会自动将 [HttpClient] 初始化到 `app.httpclient`。
同时增加了一个 `app.curl(url, options)` 方法，它等价于 `app.httpclient.request(url, options)`。

这样就可以非常方便地使用 `app.curl` 方法完成一次 HTTP 请求。

```js
// app.js
module.exports = app => {
  app.beforeStart(async () => {
    // 示例：启动的时候去读取 https://registry.npm.taobao.org/egg/latest 的版本信息
    const result = await app.curl('https://registry.npm.taobao.org/egg/latest', {
      dataType: 'json',
    });
    app.logger.info('Egg latest version: %s', result.data.version);
  });
};
```

## 通过 Context 使用 HttpClient

框架在 Context 中同样提供了 `ctx.curl(url, options)` 和 `ctx.httpclient`，保持跟 app 下的使用体验一致。
这样就可以在有 Context 的地方（如在 controller 中）非常方便地使用 `ctx.curl()` 方法完成一次 HTTP 请求。

```js
// app/controller/npm.js
class NpmController extends Controller {
  async index() {
    const ctx = this.ctx;

    // 示例：请求一个 npm 模块信息
    const result = await ctx.curl('https://registry.npm.taobao.org/egg/latest', {
      // 自动解析 JSON response
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

HTTP 已经被广泛大量使用，尽管 HTTP 有多种请求方式，但是万变不离其宗，我们先以基本的4个请求方法为例子，
逐步讲解一下更多的复杂应用场景。

以下例子都会在 controller 代码中对 https://httpbin.org 发起请求来完成。

### GET

读取数据几乎都是使用 GET 请求，它是 HTTP 世界最常见的一种，也是最广泛的一种，它的请求参数也是最容易构造的。

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

- GET 请求可以不用设置 `options.method` 参数，HttpClient 的默认 method 会设置为 `GET`。
- 返回值 `result` 会包含 3 个属性：`status`, `headers` 和 `data`
  - `status`: 响应状态码，如 `200`, `302`, `404`, `500` 等等
  - `headers`: 响应头，类似 `{ 'content-type': 'text/html', ... }`
  - `data`: 响应 body，默认 HttpClient 不会做任何处理，会直接返回 Buffer 类型数据。
    一旦设置了 `options.dataType`，HttpClient 将会根据此参数对 `data` 进行相应的处理。

完整的请求参数 `options` 和返回值 `result` 的说明请看下文的 [options 参数详解](#options-参数详解) 章节。

### POST

创建数据的场景一般来说都会使用 POST 请求，它相对于 GET 来说多了请求 body 这个参数。

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

下文还会详细讲解以 POST 实现 Form 表单提交和文件上传的功能。

### PUT

PUT 与 POST 类似，它更加适合更新数据和替换数据的语义。
除了 method 参数需要设置为 `PUT`，其他参数几乎跟 POST 一模一样。

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

删除数据会选择 DELETE 请求，它通常可以不需要加请求 body，但是 HttpClient 不会限制。

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

在真实的应用场景下，还是会包含一些较为复杂的 HTTP 请求。

### Form 表单提交

面向浏览器设计的 Form 表单（不包含文件）提交接口，通常都要求以 `content-type: application/x-www-form-urlencoded`
的格式提交请求数据。

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

当一个 Form 表单提交包含文件的时候，请求数据格式就必须以 [multipart/form-data](http://tools.ietf.org/html/rfc2388)
进行提交了。
这个时候需要引入 [formstream] 这个第三方模块来帮助我们生成可以被 HttpClient 消费的 `form` 对象。

```js
// app/controller/npm.js
const FormStream = require('formstream');
class NpmController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const form = new FormStream();
    // 设置普通的 key value
    form.field('foo', 'bar');
    // 上传当前文件本身用于测试
    form.file('file', __filename);

    const result = await ctx.curl('https://httpbin.org/post', {
      // 必须指定 method，支持 POST，PUT
      method: 'POST',
      // 生成符合 multipart/form-data 要求的请求 headers
      headers: form.headers(),
      // 以 stream 模式提交
      stream: form,
      // 明确告诉 HttpClient 以 JSON 格式处理响应 body
      dataType: 'json',
    });
    ctx.body = result.data.files;
    // 响应最终会是类似以下的结果：
    // {
    //   "file": "'use strict';\n\nconst For...."
    // }
  }
}
```

当然，你还可以继续通过 `form.file()` 添加更多文件以实现一次性上传多个文件的需求。

```js
form.file('file1', file1);
form.file('file2', file2);
```

### 以 Stream 方式上传文件

其实，在 Node.js 的世界里面，Stream 才是主流。
如果服务端支持流式上传，最友好的方式还是直接发送 Stream。
Stream 实际会以 `Transfer-Encoding: chunked` 传输编码格式发送，这个转换是 [HTTP] 模块自动实现的。

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
接下来将会以参数说明和代码配合一起讲解每个可选参数的实际用途。

### HttpClient 默认全局配置

```js
// config/config.default.js
exports.httpclient = {
  // 是否开启本地 DNS 缓存，默认关闭，开启后有两个特性
  // 1. 所有的 DNS 查询都会默认优先使用缓存的，即使 DNS 查询错误也不影响应用
  // 2. 对同一个域名，在 dnsCacheLookupInterval 的间隔内（默认 10s）只会查询一次
  enableDNSCache: false,
  // 对同一个域名进行 DNS 查询的最小间隔时间
  dnsCacheLookupInterval: 10000,
  // DNS 同时缓存的最大域名数量，默认 1000
  dnsCacheMaxLength: 1000,

  request: {
    // 默认 request 超时时间
    timeout: 3000,
  },

  httpAgent: {
    // 默认开启 http KeepAlive 功能
    keepAlive: true,
    // 空闲的 KeepAlive socket 最长可以存活 4 秒
    freeSocketKeepAliveTimeout: 4000,
    // 当 socket 超过 30 秒都没有任何活动，就会被当作超时处理掉
    timeout: 30000,
    // 允许创建的最大 socket 数
    maxSockets: Number.MAX_SAFE_INTEGER,
    // 最大空闲 socket 数
    maxFreeSockets: 256,
  },

  httpsAgent: {
    // 默认开启 https KeepAlive 功能
    keepAlive: true,
    // 空闲的 KeepAlive socket 最长可以存活 4 秒
    freeSocketKeepAliveTimeout: 4000,
    // 当 socket 超过 30 秒都没有任何活动，就会被当作超时处理掉
    timeout: 30000,
    // 允许创建的最大 socket 数
    maxSockets: Number.MAX_SAFE_INTEGER,
    // 最大空闲 socket 数
    maxFreeSockets: 256,
  },
};
```

应用可以通过 `config/config.default.js` 覆盖此配置。

### `data: Object`

需要发送的请求数据，根据 `method` 自动选择正确的数据处理方式。

- GET，HEAD：通过 `querystring.stringify(data)` 处理后拼接到 url 的 query 参数上。
- POST，PUT 和 DELETE 等：需要根据 `contentType` 做进一步判断处理。
  - `contentType = json`：通过 `JSON.stringify(data)` 处理，并设置为 body 发送。
  - 其他：通过 `querystring.stringify(data)` 处理，并设置为 body 发送。

```js
// GET + data
ctx.curl(url, {
  data: { foo: 'bar' },
});

// POST + data
ctx.curl(url, {
  method: 'POST',
  data: { foo: 'bar' },
});

// POST + JSON + data
ctx.curl(url, {
  method: 'POST',
  contentType: 'json',
  data: { foo: 'bar' },
});
```

### `dataAsQueryString: Boolean`

如果设置了 `dataAsQueryString=true`，那么即使在 POST 情况下，
也会强制将 `options.data` 以 `querystring.stringify` 处理之后拼接到 `url` 的 query 参数上。

可以很好地解决以 `stream` 发送数据，且额外的请求参数以 `url` query 形式传递的应用场景：

```js
ctx.curl(url, {
  method: 'POST',
  dataAsQueryString: true,
  data: {
    // 一般来说都是 access token 之类的权限验证参数
    accessToken: 'some access token value',
  },
  stream: myFileStream,
});
```

### `content: String|Buffer`

发送请求正文，如果设置了此参数，那么会直接忽略 `data` 参数。

```js
ctx.curl(url, {
  method: 'POST',
  // 直接发送原始 xml 数据，不需要 HttpClient 做特殊处理
  content: '<xml><hello>world</hello></xml>',
  headers: {
    'content-type': 'text/html',
  },
});
```

### `stream: ReadStream`

设置发送请求正文的可读数据流，默认是 `null`。
一旦设置了此参数，HttpClient 将会忽略 `data` 和 `content`。

```js
ctx.curl(url, {
  method: 'POST',
  stream: fs.createReadStream('/path/to/read'),
});
```

### `writeStream: WriteStream`

设置接受响应数据的可写数据流，默认是 `null`。
一旦设置此参数，那么返回值 `result.data` 将会被设置为 `null`，
因为数据已经全部写入到 `writeStream` 中了。

```js
ctx.curl(url, {
  writeStream: fs.createWriteStream('/path/to/store'),
});
```

### `consumeWriteStream: Boolean`

是否等待 `writeStream` 完全写完才算响应全部接收完毕，默认是 `true`。
此参数不建议修改默认值，除非我们明确知道它的副作用是可接受的，
否则很可能会导致 `writeStream` 数据不完整。

### `method: String`

设置请求方法，默认是 `GET`。
支持 `GET、POST、PUT、DELETE、PATCH` 等[所有 HTTP 方法](https://nodejs.org/api/http.html#http_http_methods)。

### `contentType: String`

设置请求数据格式，默认是 `undefined`，HttpClient 会自动根据 `data` 和 `content` 参数自动设置。
`data` 是 object 的时候默认设置的是 `form`。支持 `json` 格式。

如需要以 JSON 格式发送 `data`：

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

设置响应数据格式，默认不对响应数据做任何处理，直接返回原始的 buffer 格式数据。
支持 `text` 和 `json` 两种格式。

**注意：设置成 `json` 时，如果响应数据解析失败会抛 `JSONResponseFormatError` 异常。**

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

是否自动过滤响应数据中的特殊控制字符 (U+0000 ~ U+001F)，默认是 `false`。
通常一些 CGI 系统返回的 JSON 数据会包含这些特殊控制字符，通过此参数可以自动过滤掉它们。

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

请求超时时间，默认是 `[ 5000, 5000 ]`，即创建连接超时是 5 秒，接收响应超时是 5 秒。

```js
ctx.curl(url, {
  // 创建连接超时 3 秒，接收响应超时 3 秒
  timeout: 3000,
});

ctx.curl(url, {
  // 创建连接超时 1 秒，接收响应超时 30 秒，用于响应比较大的场景
  timeout: [ 1000, 30000 ],
});
```

### `agent: HttpAgent`

允许通过此参数覆盖默认的 HttpAgent，如果你不想开启 KeepAlive，可以设置此参数为 `false`。

```js
ctx.curl(url, {
  agent: false,
});
```

### `httpsAgent: HttpsAgent`

允许通过此参数覆盖默认的 HttpsAgent，如果你不想开启 KeepAlive，可以设置此参数为 `false`。

```js
ctx.curl(url, {
  httpsAgent: false,
});
```

### `auth: String`

简单登录授权（Basic Authentication）参数，将以明文方式将登录信息以 `Authorization` 请求头发送出去。

```js
ctx.curl(url, {
  // 参数必须按照 `user:password` 格式设置
  auth: 'foo:bar',
});
```

### `digestAuth: String`

摘要登录授权（Digest Authentication）参数，设置此参数会自动对 401 响应尝试生成 `Authorization` 请求头，
尝试以授权方式请求一次。

```js
ctx.curl(url, {
  // 参数必须按照 `user:password` 格式设置
  digestAuth: 'foo:bar',
});
```

### `followRedirect: Boolean`

是否自动跟进 3xx 的跳转响应，默认是 `false`。

```js
ctx.curl(url, {
  followRedirect: true,
});
```

### `maxRedirects: Number`

设置最大自动跳转次数，避免循环跳转无法终止，默认是 10 次。
此参数不宜设置过大，它只在 `followRedirect=true` 情况下才会生效。

```js
ctx.curl(url, {
  followRedirect: true,
  // 最大只允许自动跳转 5 次。
  maxRedirects: 5,
});
```

### `formatRedirectUrl: Function(from, to)`

允许我们通过 `formatRedirectUrl` 自定义实现 302、301 等跳转 url 拼接， 默认是 `url.resolve(from, to)`。

```js
ctx.curl(url, {
  formatRedirectUrl: (from, to) => {
    // 例如可在这里修正跳转不正确的 url
    if (to === '//foo/') {
      to = '/foo';
    }
    return url.resolve(from, to);
  },
});
```

### `beforeRequest: Function(options)`

HttpClient 在请求正式发送之前，会尝试调用 `beforeRequest` 钩子，允许我们在这里对请求参数做最后一次修改。

```js
ctx.curl(url, {
  beforeRequest: options => {
    // 例如我们可以设置全局请求 id，方便日志跟踪
    options.headers['x-request-id'] = uuid.v1();
  },
});
```

### `streaming: Boolean`

是否直接返回响应流，默认为 `false`。
开启 streaming 之后，HttpClient 会在拿到响应对象 res 之后马上返回，
此时 `result.headers` 和 `result.status` 已经可以读取到，只是没有读取 data 数据而已。

```js
const result = await ctx.curl(url, {
  streaming: true,
});

console.log(result.status, result.data);
// result.res 是一个 ReadStream 对象
ctx.body = result.res;
```

**注意：如果 res 不是直接传递给 body，那么我们必须消费这个 stream，并且要做好 error 事件处理。**

### `gzip: Boolean`

是否支持 gzip 响应格式，默认为 `false`。
开启 gzip 之后，HttpClient 将自动设置 `Accept-Encoding: gzip` 请求头，
并且会自动解压带 `Content-Encoding: gzip` 响应头的数据。

```js
ctx.curl(url, {
  gzip: true,
});
```

### `timing: Boolean`

是否开启请求各阶段的时间测量，默认为 `false`。
开启 timing 之后，可以通过 `result.res.timing` 拿到这次 HTTP 请求各阶段的时间测量值（单位是毫秒），
通过这些测量值，我们可以非常方便地定位到这次请求最慢的环境发生在那个阶段，效果如同 Chrome network timing 的作用。

timing 各阶段测量值解析：
- queuing：分配 socket 耗时
- dnslookup：DNS 查询耗时
- connected：socket 三次握手连接成功耗时
- requestSent：请求数据完整发送完毕耗时
- waiting：收到第一个字节的响应数据耗时
- contentDownload：全部响应数据接收完毕耗时

```js
const result = await ctx.curl(url, {
  timing: true,
});
console.log(result.res.timing);
// {
//   "queuing":29,
//   "dnslookup":37,
//   "connected":370,
//   "requestSent":1001,
//   "waiting":1833,
//   "contentDownload":3416
// }
```

### `ca，rejectUnauthorized，pfx，key，cert，passphrase，ciphers，secureProtocol`

这几个都是透传给 [HTTPS] 模块的参数，具体请查看 [`https.request(options, callback)`](https://nodejs.org/api/https.html#https_https_request_options_callback)。

## 调试辅助

框架还提供了 [egg-development-proxyagent] 插件来方便开发者调试。

先安装和开启插件：

```bash
$ npm i egg-development-proxyagent --save
```

```js
// config/plugin.js
exports.proxyagent = {
  enable: true,
  package: 'egg-development-proxyagent',
}
```

开启抓包工具，可以用 [charles] 或 [fiddler]，此处我们用 [anyproxy] 来演示下。

```bash
$ npm install anyproxy -g
$ anyproxy --port 8888
```

使用环境变量启动应用：

```bash
$ http_proxy=http://127.0.0.1:8888 npm run dev
```

然后就可以正常操作了，所有经过 HttpClient 的请求，都可以在 http://localhost:8002 这个控制台中查看到。

![anyproxy](https://cloud.githubusercontent.com/assets/227713/21976937/06a63694-dc0f-11e6-98b5-e9e279c4867c.png)

**注意：该插件默认只在 local 环境下启动。**

## 常见错误

### 创建连接超时

- 异常名称：`ConnectionTimeoutError`
- 出现场景：通常是 DNS 查询比较慢，或者客户端与服务端之间的网络速度比较慢导致的。
- 排查建议：请适当增大 `timeout` 参数。

### 服务响应超时

- 异常名称：`ResponseTimeoutError`
- 出现场景：通常是客户端与服务端之间网络速度比较慢，并且响应数据比较大的情况下会发生。
- 排查建议：请适当增大 `timeout` 参数。

### 服务主动断开连接

- 异常名称：`ResponseError, code: ECONNRESET`
- 出现场景：通常是服务端主动断开 socket 连接，导致 HTTP 请求链路异常。
- 排查建议：请检查当时服务端是否发生网络异常。

### 服务不可达

- 异常名称：`RequestError, code: ECONNREFUSED, status: -1`
- 出现场景：通常是因为请求的 url 所属 IP 或者端口无法连接成功。
- 排查建议：请确保 IP 或者端口设置正确。

### 域名不存在

- 异常名称：`RequestError, code: ENOTFOUND, status: -1`
- 出现场景：通常是因为请求的 url 所在的域名无法通过 DNS 解析成功。
- 排查建议：请确保域名存在，也需要排查一下 DNS 服务是否配置正确。

### JSON 响应数据格式错误

- 异常名称：`JSONResponseFormatError`
- 出现场景：设置了 `dataType=json` 并且响应数据不符合 JSON 格式，就会抛出此异常。
- 排查建议：确保服务端无论在什么情况下都要正确返回 JSON 格式的数据。

## 全局 `request` 和 `response` 事件

在企业应用场景，常常会有统一 tracer 日志的需求。
为了方便在 app 层面统一监听 HttpClient 的请求和响应，我们约定了全局 `request` 和 `response` 事件来暴露这两个时机。

```bash
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
app.httpclient.on('request', req => {
  req.url //请求 url
  req.ctx //是发起这次请求的当前上下文

  // 可以在这里设置一些 trace headers，方便全链路跟踪
});
```

### `response` 事件：发生在网络操作结束之后

请求结束之后会触发一个 `response` 事件，这样外部就可以订阅这个事件打印日志。

```js
app.httpclient.on('response', result => {
  result.res.status
  result.ctx //是发起这次请求的当前上下文
  result.req //对应的 req 对象，即 request 事件里面那个 req
});
```

## 示例代码

完整示例代码可以在 [eggjs/exmaples/httpclient](https://github.com/eggjs/examples/blob/master/httpclient) 找到。

[urllib]: https://github.com/node-modules/urllib
[HttpClient]: https://github.com/eggjs/egg/blob/master/lib/core/httpclient.js
[formstream]: https://github.com/node-modules/formstream
[HTTP]: https://nodejs.org/api/http.html
[HTTPS]: https://nodejs.org/api/https.html
[egg-development-proxyagent]: https://github.com/eggjs/egg-development-proxyagent
[charles]: https://www.charlesproxy.com/
[fiddler]: http://www.telerik.com/fiddler
[anyproxy]: https://github.com/alibaba/anyproxy
