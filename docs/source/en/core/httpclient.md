title: HttpClient
---

Countless services rely on the HTTP-based communication nowadays, and it is a very common application scenario that web applications call back-end HTTP services.

The framework built in [HttpClient] based on [urllib], you can quickly complete any HTTP request.

## Using HttpClient by app

[HttpClient] will initialize to `app.httpclient` automatically during the application's initialization.
Also added an method `app.curl(url, options)`, which is equivalent to the `app.httpclient.request(url, options)`.

So you can easily use `app.curl` to complete a HTTP request.

```js
// app.js
module.exports = app => {
  app.beforeStart(async () => {
    // example: read the version info on https://registry.npm.taobao.org/egg/latest when it starts
    const result = await app.curl('https://registry.npm.taobao.org/egg/latest', {
      dataType: 'json',
    });
    app.logger.info('Egg latest version: %s', result.data.version);
  });
};
```

## Using HttpClient by Context

Framework also provides `ctx.curl(url, options)` and `ctx.httpclient` in Context, same as app.
So it's very easy to use `ctx.curl()` to complete a HTTP request in the Context (such as in the controller)

```js
// app/controller/npm.js
class NpmController extends Controller {
  async index() {
    const ctx = this.ctx;

    // example: request a npm module's info
    const result = await ctx.curl('https://registry.npm.taobao.org/egg/latest', {
      // parse JSON response
      dataType: 'json',
      // timeout of 3s
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

## Basic HTTP Request

HTTP has been widely used and have several methods to make request, but the methods are similar. We start with the basic four request methods then move to some more complex scenario.

In the following example, we will complete the request of https://httpbin.org in the controller.

### GET

Reading data almost uses GET request. It is the most common type and widely used in the world of HTTP. And it is also easier to construct a request parameter.

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

- GET request might not need to set `options.method`. HttpClient Defalut method is set to `GET`
- Return `result` will contains 3 attributes: `status`, `headers` and `data`
  - `status`: response status，for example `200`, `302`, `404`, `500` and etc
  - `headers`: response header，similar to `{ 'content-type': 'text/html', ... }`
  - `data`: response body，default HttpClient doesn't do anything and returns as Buffer directly.
    Once the `options.dataType` is set，HttpClient will process the `data` based on the parameters

For the complete request parameter `options` and return value `result`, refer to below section [options Parameters in Detail](#options-parameters-in-detail)

### POST

The scenario of creating data generally uses the POST request with body parameter, one more parameter compared to GET.

Take sending JSON boy as example:

```js
// app/controller/npm.js
class NpmController extends Controller {
  async post() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/post', {
      // method is required
      method: 'POST',
      // telling HttpClient to send data as JSON by contentType
      contentType: 'json',
      data: {
        hello: 'world',
        now: Date.now(),
      },
      // telling HttpClient to process the return body as JSON format explicitly
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}
```

The following will explain POST to achieve Form function of form submission and file upload in detail.

### PUT

Similar to POST, but PUT is better for data updating and replacement. Almost the same parameters as POST except setting method as `PUT`.

```js
// app/controller/npm.js
class NpmController extends Controller {
  async put() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/put', {
      // method is required
      method: 'PUT',
       // telling HttpClient to send data as JSON by contentType
      contentType: 'json',
      data: {
        update: 'foo bar',
      },
      // telling HttpClient to process the return body as JSON format explicitly
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}
```

### DELETE

DELETE request is to delete the data, request body don't need to add request body but HttpClient don't have the limitation.

```js
// app/controller/npm.js
class NpmController extends Controller {
  async del() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/delete', {
      // method is required
      method: 'DELETE',
      // telling HttpClient to process the return body as JSON format explicitly
      dataType: 'json',
    });
    ctx.body = result.data;
  }
}
```

## Advanced HTTP request

In some real application scenarios, still have some more complex HTTP requests.

### Form Submission

Interfaces of Browser-Oriented Form Submission (without files), usually require `content-type: application/x-www-form-urlencoded` for the data requesting.

```js
// app/controller/npm.js
class NpmController extends Controller {
  async submit() {
    const ctx = this.ctx;
    const result = await ctx.curl('https://httpbin.org/post', {
      // method is required, supports POST，PUT and DELETE
      method: 'POST',
      // contentType is not needed, by default HttpClient will send request in application/x-www-form-urlencoded
      data: {
        now: Date.now(),
        foo: 'bar',
      },
      // telling HttpClient to process the return body as JSON format explicitly
      dataType: 'json',
    });
    ctx.body = result.data.form;
    // final response will similar as below:
    // {
    //   "foo": "bar",
    //   "now": "1483864184348"
    // }
  }
}
```

### Uploading Files by Multipart

Once form submission contains files, submission of requesting data must be [multipart/form-data](http://tools.ietf.org/html/rfc2388)
We need to introduce third party module [formstream] to generate `form` objects that can be consumed by HttpClient.

```js
// app/controller/npm.js
const FormStream = require('formstream');
class NpmController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const form = new FormStream();
    // set normal field and value
    form.field('foo', 'bar');
    // uploading the current file for test propose
    form.file('file', __filename);

    const result = await ctx.curl('https://httpbin.org/post', {
     // method is required, supports POST，PUT
      method: 'POST',
      // generate request headers following the requirements of multipart/form-data
      headers: form.headers(),
      // submitted as stream mode
      stream: form,
      // telling HttpClient to process the return body as JSON format explicitly
      dataType: 'json',
    });
    ctx.body = result.data.files;
    // final response will similar as below:
    // {
    //   "file": "'use strict';\n\nconst For...."
    // }
  }
}
```

Of course, you can add more files to achieve the requirements of upload multiple files at one time by `form.file()`

```js
form.file('file1', file1);
form.file('file2', file2);
```

### Uploading files in Stream Mode

In fact, Stream is the leading in the world of Node.js.
If the server supports streaming, the most friendly way is to send the Stream directly. Actually, Stream will be sent in `Transfer-Encoding: chunked` transmission coding format, which is implemented by [HTTP] module automatically.

```js
// app/controller/npm.js
const fs = require('fs');
const FormStream = require('formstream');
class NpmController extends Controller {
  async uploadByStream() {
    const ctx = this.ctx;
    // uploading the current file for test propose
    const fileStream = fs.createReadStream(__filename);
     // httpbin.org not support stream mode, use the local stream interface instead
    const url = `${ctx.protocol}://${ctx.host}/stream`;
    const result = await ctx.curl(url, {
      // method is required, supports POST，PUT
      method: 'POST',
      // submitted by stream mode
      stream: fileStream,
    });
    ctx.status = result.status;
    ctx.set(result.headers);
    ctx.body = result.data;
    // final response will similar as below:
    // {"streamSize":574}
  }
}
```

## options Parameters in Detail

Due to the complexity of HTTP Request, the options parameters of `httpclient.request(url, options)` quite large. The actual usage of each optional parameter will be shown with descriptions and coding as below.

### Default HttpClient Global Configuration

```js
// config/config.default.js
exports.httpclient = {
  // whether to enable local DNS cache, default disable, enable will have two characteristics
  // 1. All DNS lookup will prefer to use the cache by default, even DNS query error does not affects the application
  // 2. For the same hostname, query only once during the interval of dnsCacheLookupInterval (default 10s)
  enableDNSCache: false,
  // minimum interval of DNS query on the same hostname
  dnsCacheLookupInterval: 10000,
  // maximum number of hostname DNS cache simultaneously, default 1000
  dnsCacheMaxLength: 1000,

  request: {
    // default timeout of request
    timeout: 3000,
  },

  httpAgent: {
    // default enable http KeepAlive
    keepAlive: true,
    // idle KeepAlive socket can survive for 4 seconds
    freeSocketKeepAliveTimeout: 4000,
    // when sockets have no activity for more than 30s, it will be processed as timeout
    timeout: 30000,
    // maximum number of sockets allow to be created
    maxSockets: Number.MAX_SAFE_INTEGER,
    // maximum number of idle sockets
    maxFreeSockets: 256,
  },

  httpsAgent: {
    // default enable https KeepAlive
    keepAlive: true,
    // idle KeepAlive socket can survive for 4 seconds
    freeSocketKeepAliveTimeout: 4000,
    // when sockets have no activity for more than 30s, it will be processed as timeout
    timeout: 30000,
    // maximum number of sockets allow to be created
    maxSockets: Number.MAX_SAFE_INTEGER,
    // maximum number of idle sockets
    maxFreeSockets: 256,
  },
};
```

Application can overrides the configuration by `config/config.default.js`

### `data: Object`

The request data will select the correct processing method automatically based on the `method`.

- GET，HEAD: processed by `querystring.stringify(data)` then append to the query parameters of url.
- POST，PUT, DELETE and etc: further judgments and process according to `contentType`.
  - `contentType = json`: processed by `JSON.stringify(data)` and set it as body before sending.
  - others: processed by `querystring.stringify(data)` and set it as body before sending

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

Once `dataAsQueryString=true` is set, even under POST, it will forces `options.data` to be processed by `querystring.stringify` then append to the `url` query parameters

The application scenarios that sending data using `stream` and pass additional request parameters by `url` query can be well resolved.

```js
ctx.curl(url, {
  method: 'POST',
  dataAsQueryString: true,
  data: {
    // generally it would be some validation parameters such as access token, etc.
    accessToken: 'some access token value',
  },
  stream: myFileStream,
});
```

### `content: String|Buffer`

Set request Context, if the parameter is set, it will ignore the `data` parameters

```js
ctx.curl(url, {
  method: 'POST',
  // Sending the raw xml data without HttpClient's to do processing
  content: '<xml><hello>world</hello></xml>',
  headers: {
    'content-type': 'text/html',
  },
});
```

### `stream: ReadStream`

Set request context's readable stream, default `null`.
If the parameter is set , HttpClient will ignore `data` and `content`

```js
ctx.curl(url, {
  method: 'POST',
  stream: fs.createReadStream('/path/to/read'),
});
```

### `writeStream: WriteStream`

Set receive response data's writeable stream, default `null`.
Once the parameter is set, response `result.data` is set to `null` because all data are written to `writeStream`.

```js
ctx.curl(url, {
  writeStream: fs.createWriteStream('/path/to/store'),
});
```

### `consumeWriteStream: Boolean`

Whether to wait for `writeStream` completely finished as the response well received
This parameter is not recommended to modify the default value, unless we know it's side effect are acceptable. Otherwise, the `writeStream` data is likely to be incomplete.

### `method: String`

Set request method, default `GET`. Support all `GET、POST、PUT、DELETE、PATCH` and so on [all HTTP methods](https://nodejs.org/api/http.html#http_http_methods)。

### `contentType: String`

Set request data format ，default `undefined`，HttpClient will sets automatically based on the `data` and `content` parameters.
When `data` is object, the default setting would be `form`. Support `json` format.

If need to send `data` by JSON

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

Set the response data format, default return the raw buffer formatted data without processing. Support `text` and `json`

**Note: If `json` is set，a `JSONResponseFormatError`  error would be thrown if fails to parse the response data.**


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

Whether filter the special control characters in the response data (U+0000 ~ U+001F)，default `false`
Typically, the JSON data returned by some CGI system might contains such special control characters, which can be filter automatically by setting the parameters.

```js
ctx.curl(url, {
  fixJSONCtlChars: true,
  dataType: 'json',
});
```

### `headers: Object`

Custom request headers

```js
ctx.curl(url, {
  headers: {
    'x-foo': 'bar',
  },
});
```

### `timeout: Number|Array`

Timeout of request, default `[ 5000, 5000 ]`, timeout of connection creation is 5s, and the timeout of receive response is 5s.

```js
ctx.curl(url, {
  // 3s timeout of connection creation, and the 3s timeout of receive response
  timeout: 3000,
});

ctx.curl(url, {
  // 1s timeout of connection creation, and the 30s timeout of receive response for the responsing of larger scenarios
  timeout: [ 1000, 30000 ],
});
```

### `agent: HttpAgent`

Allows to override the default HttpAgent through this parameter. If you don't want to enable KeepAlive, set this parameter to `false`.

```js
ctx.curl(url, {
  agent: false,
});
```

### `httpsAgent: HttpsAgent`

Allows to override the default HttpsAgent through this parameter. If you don't want to enable KeepAlive, set this parameter to `false`.

```js
ctx.curl(url, {
  httpsAgent: false,
});
```

### `auth: String`

Parameter of Simple login authorization (Basic Authentication), will send the login information to the `Authorization` request in clear form.

```js
ctx.curl(url, {
  // parameter must follow the format of `user:password`
  auth: 'foo:bar',
});
```

### `digestAuth: String`

Parameter of the Digest Authentication. If the parameter is set, it will attempt to generate the `Authorization` request header for the 401 response automatically then try requesting for authorization once.

```js
ctx.curl(url, {
  // parameter must follow the format of `user:password`
  digestAuth: 'foo:bar',
});
```

### `followRedirect: Boolean`

Whether to follow 3xx redirect response, default `false`

```js
ctx.curl(url, {
  followRedirect: true,
});
```

### `maxRedirects: Number`

Set the maximum number of automatic redirects to prevent the endless redirect loop, default 10 times.
The parameter should not be set too large and only works in the `followRedirect=true`

```js
ctx.curl(url, {
  followRedirect: true,
  // maximum allowed redirect 5 times
  maxRedirects: 5,
});
```

### `formatRedirectUrl: Function(from, to)`

`formatRedirectUrl` allow us to customize the implementation of 302、301 other redirect URL splicing, default `url.resolve (from, to) `.

```js
ctx.curl(url, {
  formatRedirectUrl: (from, to) => {
    // for example you can correct the redirection of wrong url here
    if (to === '//foo/') {
      to = '/foo';
    }
    return url.resolve(from, to);
  },
});
```

### `beforeRequest: Function(options)`

HttpClient will attempt to invoke the `beforeRequest` hook before requesting officially, allowing us to make the last modification of the request parameter here.

```js
ctx.curl(url, {
  beforeRequest: options => {
    // For example, we can set the global request ID to facilitate log tracking
    options.headers['x-request-id'] = uuid.v1();
  },
});
```

### `streaming: Boolean`

Whether to return the response stream directly, default `false`
After enable streaming, HttpClient will return immediately after getting the response object res,
At this moment `result.headers` and `result.status` can be read, but still cannot read the data

```js
const result = await ctx.curl(url, {
  streaming: true,
});

console.log(result.status, result.data);
// result.res is a ReadStream Object
ctx.body = result.res;
```

**if res is not passed to body directly, then we must consume this stream and do well in error handling.**


### `gzip: Boolean`

Whether to support gzip response format, default `false`
After enable gzip, HttpClient will set `Accept-Encoding: gzip` header and extract the data with `Content-Encoding: gzip` response header automatically.

```js
ctx.curl(url, {
  gzip: true,
});
```

### `timing: Boolean`

Whether to enable the time measurement for each phase, default `false`
After enable the timing, you can get the time measurements of HTTP request (in milliseconds) from the `result.res.timing`.
Through these measurements, we can easily locate the slowest environment in the request, similar to the Chrome network timing.

Measurement timing's analysis of each stage:
- queuing: allocating socket time consuming
- dnslookup: DNS queries time consuming
- connected: socket three handshake success time consuming
- requestSent: requesting full data time consuming
- waiting: first byte to received response time consuming
- contentDownload: full response data time consuming

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

These are parameters are passed to the  [HTTPS] modules，details refer to [`https.request(options, callback)`](https://nodejs.org/api/https.html#https_https_request_options_callback)。

## Debugging Aid

Framework provides [egg-development-proxyagent] plugin to help developers to debug.

Install and enable pulgin:

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

Open capture tools, we can use [charles] or [fiddler], here we take to [anyproxy] demonstrate

```bash
$ npm install anyproxy -g
$ anyproxy --port 8888
```

Starting application using environment variables:

```bash
$ http_proxy=http://127.0.0.1:8888 npm run dev
```

Then it works correctly, and all requests that go through HttpClient can be viewed in the consle of http://localhost:8002.

![anyproxy](https://cloud.githubusercontent.com/assets/227713/21976937/06a63694-dc0f-11e6-98b5-e9e279c4867c.png)

**Note: the pulgin only start in local environments by defalut**

## Known issues

### Connection Timeout

- Exception: `ConnectionTimeoutError`
- Scene: usually occurred by the DNS query is slow, or the network is slow between the client and server
- Troubleshooting Suggestion: increase the `timeout` parameter appropriately.

### Service Response Timeout

- Exception: `ResponseTimeoutError`
- Scene: usually occurred by network is slower between the client and server, and happens when the data is relatively large.
- Troubleshooting Suggestion: increase the `timeout` parameter appropriately.

### Service Disconnect

- Exception: `ResponseError, code: ECONNRESET`
- Scene: usually the server actively disconnects the socket connection, causing the HTTP request link exceptions.
- Troubleshooting Suggestion: please check if server has network exception at that time

### Service is unreachable

- Exception: `RequestError, code: ECONNREFUSED, status: -1`
- Scene: usually because the requested URL which attached IP or the port cannot connect successfully.
- Troubleshooting Suggestion: make sure the IP or port is set correctly

### Domain name is not existing

- Exception: `RequestError, code: ENOTFOUND, status: -1`
- Scene: usually the domain name requested by URL cannot be resolved by DNS successfully.
- Troubleshooting Suggestion: make sure the domain name exists, and also check to see if the DNS service is properly configured.

### JSON Response data format error

- Exception: `JSONResponseFormatError`
- scene: the `dataType=json` is set and this exception is thrown in response data that does not match JSON format.
- Troubleshooting Suggestion: make sure that the server no matter what situations are returns the data in JSON format correctly.

## Global `request` and `response` events

In enterprise application scenarios, generally a unified tracer log is needed.
To facilitate monitoring HttpClient requests and responses on the app level, we agreed on global `request` and `response` to expose these two events.

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

### `request` event occurs before the network operation

A `request` event is triggered before the request is sent, allowing blocking of the request.

```js
app.httpclient.on('request', req => {
  req.url //request url
  req.ctx //context of the request

  // you can set some trace headers here for full link tracking propose
});
```

### `response` event occurs after the end of network operation

After the end of request, a `response` event is triggered, so that the external event can be subscribed to the log printing.

```js
app.httpclient.on('response', result => {
  result.res.status
  result.ctx //context of the request
  result.req //the corresponding req object, which the req in the request event

});
```

## Example

Full examples can be found on [eggjs/exmaples/httpclient](https://github.com/eggjs/examples/blob/master/httpclient) .

[urllib]: https://github.com/node-modules/urllib
[HttpClient]: https://github.com/eggjs/egg/blob/master/lib/core/httpclient.js
[formstream]: https://github.com/node-modules/formstream
[HTTP]: https://nodejs.org/api/http.html
[HTTPS]: https://nodejs.org/api/https.html
[egg-development-proxyagent]: https://github.com/eggjs/egg-development-proxyagent
[charles]: https://www.charlesproxy.com/
[fiddler]: http://www.telerik.com/fiddler
[anyproxy]: https://github.com/alibaba/anyproxy
