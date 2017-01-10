title: Controller
---

# controller

## 什么是 controller

前面章节写到，我们通过 router 将用户的请求基于 method 和 url 分发到了对应的 controller 上，那 controller 负责做什么？

简单的说 controller 负责**解析用户的输入，处理后返回相应的结果**，例如

- 在 [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) 接口中，controller 接受用户的参数，从数据库中查找内容返回给用户或者将用户的请求更新到数据库中。
- 在 html 页面请求中，controller 根据用户访问不同的 url，渲染不同的模板得到 html 返回给用户。
- 在代理服务器中，controller 将用户的请求转发到其他服务器上，并将其他服务器的返回响应给用户。

框架推荐 controller 层主要处理用户请求参数（校验、转换），调用对应的 [service](./service.md) 方法处理业务，并封装业务返回结果：

1. 获取用户通过 http 传递过来的请求参数。
1. 校验、组装参数。
1. 调用 service 进行业务处理，必要时处理转换 service 的返回结果，让它适应用户的需求。
1. 通过 http 将结果响应给用户。

## 如何编写 controller

所有的 controller 都必须放在 `app/controller` 目录下，每一个 controller 都是一个 generator function，它的 `this` 都被绑定成了 [Context](./extend.md#context) 对象的实例，通过它我们可以拿到框架封装好的各种便捷属性和方法。

例如我们写一个对应到 `POST /api/posts` 接口的 controller，我们会在 `app/controller` 目录下创建一个 `post.js` 文件

```js
const createRule = {
  title: { type: 'string' },
  content: { type: 'string' },
};
exports.create = function* () {
  // 校验参数
  this.validate(createRule);
  // 组装参数
  const author = this.session.userId;
  const req = Object.assign(this.request.body, { author });
  // 调用 service 进行业务处理
  const res = yield this.service.post.create(req);
  // 设置响应内容和响应状态码
  this.body = { id: res.id };
  this.status = 201;
};
```

在上面的例子中我们引入了许多新的概念，但还是比较直观，容易理解的，我们会在下面对它们进行更详细的介绍。

## HTTP 基础

由于 controller 基本上是业务开发中唯一和 HTTP 协议打交道的地方，在继续往下了解之前，我们首先简单的看一下 HTTP 协议是怎样的。

如果我们发起一个请求请求前面例子中提到的 controller，我们发起的 HTTP 请求的内容就会是下面这样的

```
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json; charset=UTF-8

{"title": "controller", "content": "what is controller"}
```

请求的第一行包含了三个信息，我们比较常用的是前面两个：

- method：这个请求中 method 的值是 `POST`。
- path：值为 `/api/posts`，如果用户的请求中包含 query，也会在这里出现

从第二行开始直到遇到的第一个空行位置，都是请求的 headers 部分，这一部分中有许多常用的属性，包括这里看到的 Host，Content-Type，还有 `Cookie`，`User-Agent` 等等。在这个请求中有两个头：

- `Host`：我们在浏览器发起请求的时候，域名会用来通过 DNS 解析找到服务的 ip 地址，但是浏览器也会将域名和端口号放在 Host 头中一并发送给服务端。
- `Content-Type`：当我们的请求有 body 的时候，都会有 Content-Type 来标明我们的请求体是什么格式的。

之后的内容全部都是请求的 body，当请求是 POST, PUT, DELETE 等方法的时候，可以带上请求体，服务端会根据 Content-Type 来解析请求体。

在服务端处理完这个请求后，会发送一个 HTTP 响应给客户端

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 8
Date: Mon, 09 Jan 2017 08:40:28 GMT
Connection: keep-alive

{"id": 1}
```

第一行中也包含了三段，其中我们常用的主要是[响应状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，这个例子中它的值是 201，它的含义是在服务端成功创建了一条资源。

和请求一样，从第二行开始到下一个空行之间都是响应头，这里的 Content-Type, Content-Length 表示这个响应的格式是 json，长度为 8 个字符。

最后剩下的部分就是这次响应真正的内容。

## 获取 HTTP 请求参数

从上面的 HTTP 请求示例中可以看到，有好多地方可以放用户的请求数据，框架通过在 controller 上绑定的 context 实例，提供了许多便捷方法和属性获取用户通过 HTTP 请求发送过来的参数。

### query

在 URL 中 `?` 后面的部分是一个 query string，这一部分经常用于 GET 类型的请求中传递参数。例如 `GET /posts?category=egg&language=node` 中 `category=egg&language=node` 就是用户传递过来的参数。我们可以通过 `context.query` 拿到解析过后的这个参数体

```js
exports.listPosts = function*() {
  const query = this.query;
  // {
  //   category: 'egg',
  //   language: 'node',
  // }
};
```

当 query string 中的 key 重复时，`context.query` 只取 key 第一次出现时的值，后面再出现的都会被忽略。`GET /posts?category=egg&category=koa` 通过 `context.query` 拿到的值是 `{ category: 'egg' }`。

这样处理的原因是为了保持统一性，由于通常情况下我们都不会设计让用户传递 key 相同的 query string，所以我们经常会写类似下面的代码：

```js
const key = this.query.key || '';
if (key.startsWith('egg')) {
  // do something  
}
```

而如果有人故意发起请求在 query string 中带上重复的 key 来请求时就会引发系统异常。因此框架保证了从 `context.query` 上获取的参数一旦存在，一定是字符串类型。

#### queries

有时候我们的系统会设计成让用户传递相同的 key，例如 `GET /posts?category=egg&id=1&id=2&id=3`。框架提供了 `context.queries` 对象，这个对象也解析了 query string，但是它不会丢弃任何一个重复的数据，而是将他们都放到一个数组中：

```js
// GET /posts?category=egg&id=1&id=2&id=3

exports.listPosts = function*() {
  console.log(this.queries);
  // {
  //   category: [ 'egg' ],
  //   id: [ '1', '2', '3' ],
  // }
};
```

`context.queries` 上所有的 key 如果有值，也一定会是数组类型。

### router params

在 [router](./router.md) 中，我们介绍了 router 上也可以申明参数，这些参数都可以通过 `context.params` 获取到。

```js
// app.get('/projects/:projectId/app/:appId', 'app.listApp');
// GET /projects/1/app/2

exports.listApp = function*() {
  assert.equal(this.params.projectId, '1');
  assert.equal(this.params.appId, '2');
};
```

### body

虽然我们可以通过 url 传递参数，但是还是有诸多限制

- 浏览器中会对 url 的长度有所限制，如果需要传递的参数过多就会无法传递。
- 服务端经常会将访问的完整 url 记录到日志文件中，有一些敏感数据通过 url 传递会不安全。

在前面的 HTTP 请求报文示例中，我们看到在 header 之后还有一个 body 部分，我们通常会在这个部分传递 POST、PUT 和 DELETE 等方法的参数。一般请求中有 body 的时候，客户端（浏览器）会同时发送 `Content-Type` 告诉服务端这次请求的 body 是什么格式的。web 开发中数据传递最常用的两类格式分别是 json 和 form。

框架内置了 [bodyParser](https://github.com/koajs/bodyparser) 中间件来对这两类格式的请求 body 解析成 object 挂载到 `context.request.body` 上。HTTP 协议中并不建议在通过 GET、HEAD 方法访问时传递 body，所以我们无法在 GET、HEAD 方法中按照此方法获取到内容。

```js
// POST /api/posts HTTP/1.1
// Host: localhost:3000
// Content-Type: application/json; charset=UTF-8
//
// {"title": "controller", "content": "what is controller"}
exports.listPosts = function*() {
  assert.equal(this.request.body.title, 'controller');
  assert.equal(this.request.body.content, 'what is controller');
};
```

框架对 bodyParser 设置了一些默认参数，配置好之后拥有以下特性：

- 当请求的 Content-Type 为 `application/json`，`application/json-patch+json`，`application/vnd.api+json` 和 `application/csp-report` 时，会按照 json 格式对请求 body 进行解析，并限制 body 最大长度为 `100kb`。
- 当请求的 Content-Type 为 `application/x-www-form-urlencoded` 时，会按照 form 格式对请求 body 进行解析，并限制 body 最大长度为 `100kb`。
- 如果解析成功，body 一定会是一个 Object（可能是一个数组）。

一般来说我们最经常调整的配置项就是变更解析时允许的最大长度，可以在 `config/config.default.js` 中覆盖框架的默认值

```js
module.exports = {
  bodyParser: {
    jsonLimit: '1m',
    formLimit: '1m',
  },
};
```

如果用户的请求 body 超过了我们配置的解析最大长度，会抛出一个状态码为 `413` 的异常，如果用户请求的 body 解析失败（错误的 JSON），会抛出一个状态码为 `400` 的异常。

**注意：在调整 bodyParser 支持的 body 长度时，如果我们应用前面还有一层反向代理（nginx），可能也需要调整它的配置，确保反向代理也支持同样长度的请求 body。**

### 获取上传的文件

请求 body 除了可以带参数之外，还可以发送文件，一般来说，浏览器上都是通过 `Multipart/form-data` 格式发送文件的，框架通过内置 [multipart](https://github.com/eggjs/egg-multipart) 插件来支持获取用户上传的文件。

在 controller 中，我们可以通过 `context.getFileStream*()` 接口能获取到上传的文件流。

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file: <input name="file" type="file" />
  <button type="submit">上传</button>
</form>
```

```js
const path = require('path');

module.exports = function*() {
  const stream = yield this.getFileStream();
  const name = 'egg-multipart-test/' + path.basename(stream.filename);
  // 文件处理，上传到云存储等等
  const result = yield this.oss.put(name, stream);
  this.body = {
    url: result.url,
    // 所有表单字段都能通过 `stream.fields` 获取到
    fields: stream.fields,
  };
};
```

要通过 `context.getFileStream` 便捷的获取到用户上传的文件，需要满足两个条件：

- 上传文件必须在其他 field 之前。
- 只支持上传一个文件。

如果要获取同时上传的多个文件，不能通过 `this.getFileStream()` 来获取

```js
module.exports = function* () {
  const parts = this.multipart();
  let part;
  while (part = yield parts) {
    if (part.length) {
      // 如果是一个数组，说明是 fields
      console.log('field: ' + part[0]);
      console.log('value: ' + part[1]);
      console.log('valueTruncated: ' + part[2]);
      console.log('fieldnameTruncated: ' + part[3]);
    } else {
      // 其他情况下是一个 file
      if (!part.filename) {
        // 这时是用户没有选择文件就点击了上传(part 是 file stream，但是 part.filename 为空)
        // 需要做出处理，例如给出错误提示消息
        return;
      }
      // otherwise, it's a stream
      console.log('field: ' + part.fieldname);
      console.log('filename: ' + part.filename);
      console.log('encoding: ' + part.encoding);
      console.log('mime: ' + part.mime);
      // 文件处理，上传到云存储等等
      const result = yield this.oss.put('egg-multipart-test/' + part.filename, part);
      console.log(result);
    }
  }
};
```

为了保证文件上传的安全，框架限制了支持的的文件格式，框架默认支持白名单如下：

```
// images
'.jpg', '.jpeg', // image/jpeg
'.png', // image/png, image/x-png
'.gif', // image/gif
'.bmp', // image/bmp
'.wbmp', // image/vnd.wap.wbmp
'.webp',
'.tif',
'.psd',
// text
'.svg',
'.js', '.jsx',
'.json',
'.css', '.less',
'.html', '.htm',
'.xml',
// tar
'.zip',
'.gz', '.tgz', '.gzip',
// video
'.mp3',
'.mp4',
'.avi',
```

用户可以通过在 `config/config.default.js` 中配置来新增支持的文件扩展名，或者重写整个白名单

- 新增支持的文件扩展名

```js
module.exports = {
  multipart: {
    fileExtensions: [ '.apk' ], // 增加对 .apk 扩展名的支持
  },
};
```

- 覆盖整个白名单

```js
module.exports = {
  multipart: {
    whitelist: [ '.png '], // 覆盖整个白名单，只允许上传 '.png' 格式
  },
};
```

**注意：当传递了 whitelist 属性时，fileExtensions 属性不生效。**

### header

除了从 URL 和请求 body 上获取参数之外，还有许多参数是通过请求 header 传递的。框架提供了一些辅助属性和方法来获取。

- `context.headers`，`context.header`，`context.request.headers`，`context.request.header`：这几个方法是等价的，都是获取整个 header 对象。
- `context.get(name)`，`context.request.get(name)`：获取请求 header 中的一个字段的值，如果这个字段不存在，会返回空字符串。

由于 header 比较特殊，有一些是 `HTTP` 协议规定了具体含义的（例如 `Content-Type`，`Accept`），有些是反向代理设置的，已经约定俗成（X-Forwarded-For），框架也会对他们增加一些便捷的 getter，详细的 getter 可以查看 [API]() 文档。

特别是如果我们通过 `config.proxy` 设置了应用部署在反向代理（nginx）之后，有一些 getter 的内部处理会发生改变。

#### `context.host`

优先读通过 `config.hostHeaders` 中配置的 header 的值，读不到时再尝试获取 host 这个 header 的值，如果都获取不到，返回空字符串。

`config.hostHeaders` 默认配置为 `x-forwarded-host`。

#### `context.protocol`

通过这个 getter 获取 protocol 时，首先会判断当前连接是否是加密连接，如果是加密连接，返回 https。

如果处于非加密连接时，优先读通过 `config.protocolHeaders` 中配置的 header 的值来判断是 http 还是 https，如果读取不到，我们可以在配置中通过 `config.protocol` 来设置兜底值，默认为 http。

`config.protocolHeaders` 默认配置为 `x-forwarded-proto`。

#### `context.ips`

通过 `context.ips` 获取请求经过设备的所有 ip 地址列表，通过读取 `config.ipHeaders` 中配置的 header 的值，获取不到时为空数组。

#### `context.ip`

通过 `context.ip` 获取请求发起方的 ip 地址，优先从 `context.ips` 中获取，`context.ips` 为空时使用连接上发起方的 ip 地址。

### cookie

HTTP 的请求头中有一个特殊的字段叫 [cookie](https://en.wikipedia.org/wiki/HTTP_cookie)。服务端可以通过 cookie 将少量数据存到客户端中（浏览器会遵循协议将数据保存）。HTTP 请求都是无状态的，但是我们的 web 应用通常都需要知道发起请求的人是谁，一个常用的解决方案就是通过 cookie 来确认用户身份。

通过 `context.cookies`，我们可以在 controller 中便捷、安全的设置和读取 cookie。

```js
exports.add = function*() {
  const count = this.cookie.get('count');
  count = count ? Number(count) : 0;
  this.cookie.set('count', ++count);
  this.body = count;
};

exports.remove = function*() {
  const count = this.cookie.set('count', null);
  this.status = 204;
};
```

cookie 虽然在 HTTP 中只是一个头，但是通过 `foo=bar;foo1=bar1;` 的格式可以设置多个键值对。

#### `context.cookies.set(key, value, options)`

设置 cookie 其实是通过在 HTTP 响应中设置 set-cookie 头完成的，每一个 set-cookie 都会让浏览器在 cookie 中存一个键值对。在设置 cookie 值的同时，协议还支持许多参数来配置这个 cookie 的传输、存储和权限。

- maxAge (Number): 设置这个键值对在浏览器的最长保存时间。是一个从服务器当前时刻开始的毫秒数。
- expires (Date): 设置这个键值对的失效时间，如果设置了 maxAge，将会被覆盖。如果 maxAge 和 expires 都没设置，cookie 将会在浏览器的会话失效（一般是关闭浏览器时）的时候失效。
- path (String): 设置键值对生效的路径，默认设置在根路径上（`/`）。
- domain (String): 设置键值对生效的域名，默认没有配置。
- httpOnly (Boolean): 设置键值对是否不能被 js 访问，默认为 true，不允许被 js 访问。
- secure (Boolean): 设置键值对只有在 HTTPS 连接上传输，框架会帮我们判断当前是否在 HTTPS 连接上自动设置 secure 的值。

除了这些属性之外，框架另外扩展了 3 个参数的支持：

- overwrite(Boolean)：设置 key 相同的键值对如何处理，如果设置为 true，则后设置的值会覆盖前面设置的，否则将会发送两个 set-cookie 响应头。
- sign（Boolean）：设置是否对 cookie 进行签名，如果设置为 true，则设置键值对的时候会同时对这个键值对的值进行签名，后面取的时候做校验，可以防止前端对这个值进行篡改。默认为 true。
- encrypt（Boolean）：设置是否对 cookie 进行加密，如果设置为 true，则在发送 cookie 前会对这个键值对的值进行加密，客户端无法读取到 cookie 的值。默认为 false。

在设置 cookie 时我们需要思考清楚这个 cookie 的作用，它需要被浏览器保存多久？是否可以被 js 获取到？是否可以被前端修改？默认的配置下设置的 cookie 前端可以看到，js 不能访问，不能被客户端（手工）篡改。

- 如果想要 cookie 在浏览器端可以被 js 访问并修改:

```js
this.cookies.set(key, value, {
  httpOnly: false,
  sign: false,
});
```

- 如果想要 cookie 在浏览器端不能被修改，不能看到明文：

```js
this.cookies.set(key, value, {
  httpOnly: true, // 默认就是 true
  encrypt: true, // 加密传输
});
```

注意：

1. 由于 HTTP 对 header 中的字符集有限制，为了保证 cookie 可以写入成功，建议 value 通过 base64 编码或者其他形式 encode 之后再写入。
2. 由于部分浏览器对 cookie 有长度限制限制，所以尽量不要设置太长的 cookie。

#### `context.cookies.get(key, options)`

由于 HTTP 请求中的 cookie 是在一个 header 中传输过来的，通过框架提供的这个方法可以快速的从整段 cookie 中获取对应的键值对的值。上面在设置 cookie 的时候，我们可以设置 `options.signed` 和 `options.encrypt` 来对 cookie 进行签名或加密，因此对应的在获取 cookie 的时候也要传相匹配的选项。

- 如果设置的时候指定为 signed，获取时未指定，则不会在获取时对取到的值做验签，导致可能被客户端篡改。
- 如果设置的时候指定为 encrypt，获取时未指定，则无法获取到真实的值，而是加密过后的密文。

### cookie 秘钥

由于我们在 cookie 中需要用到加解密和验签，所以需要配置一个秘钥供加密使用。在 `config/config.default.js` 中

```
module.exports = {
  keys: 'key1,key2',
};
```

keys 配置成一个字符串，可以按照逗号分隔配置多个 key。cookie 在使用这个配置进行加解密时：

- 加密时只会使用第一个秘钥。
- 解密或验签时会遍历 keys 进行解密。

如果我们想要更新 cookie 的秘钥，但是又不希望之前设置到用户浏览器上的 cookie 失效，可以将新的秘钥配置到 keys 最前面，等过一段时间之后再删去不需要的秘钥即可。

### session

通过 cookie，我们可以给每一个用户设置一个 session，用来存储用户身份相关的信息，这份信息会加密后存储在 cookie 中，实现跨请求的用户身份保持。

框架基于 [koa-session](https://github.com/koajs/session) 中间件，通过 `context.session` 给我们提供访问或者修改当前用户 session 的能力。

```js
exports.fetchPosts = function*() {
  // 获取 session 上的内容
  const userId = this.session.userId;
  const posts = yield this.service.post.fetch(userId);
  // 修改 session 的值
  this.session.visited = this.session.visited ? this.session.visited++ : 1;
  this.body = {
    success: true,
    posts,
  };
};
```

session 的使用方法非常直观，直接读取它或者修改它就可以了，如果要删除它，直接将它赋值为 null：

```js
exports.deleteSession = function*() {
  this.session = null;
};
```

#### 配置

对于 session 来说，主要有下面几个属性可以在 `config.default.js` 中进行配置:

```js
module.exports = {
  key: 'koa:sess', // 承载 session 的 cookie 键值对名字
  maxAge: 86400000, // session 的最大有效时间
};
```

## 参数校验

在获取到用户请求的参数后，不可避免的要对参数进行一些校验，框架集成了 [validate](https://github.com/eggjs/egg-validate) 插件提供便捷的参数校验机制。

通过 `context.validate(rule, [body])` 直接对参数进行校验

```js
const createRule = {
  title: { type: 'string' },
  content: { type: 'string' },
};
exports.create = function* () {
  // 校验参数
  // 如果不传第二个参数会自动校验 `this.request.body`
  this.validate(createRule);
};
```

当校验异常时，会直接抛出一个异常，异常的状态码为 422，errors 字段包含了详细的验证不通过信息。如果想要自己处理检查的异常，可以使用 app 实例上的 validator 对象。

```js
exports.create = function*() {
  const errors = this.app.validator.validate(createRule, this.request.body);
  if (errors) {
    this.logger.warn(errors);
    this.body = { success: false };
    return;
  }
};
```

### 校验规则

参数校验通过 [parameter](https://github.com/node-modules/parameter#rule) 完成，支持的校验规则可以在文档中查阅到。

#### 自定义校验规则

有时候我们希望自定义一些校验规则，让开发时更便捷，我们可以通过 `app.validator.addRule` 的方式新增自定义规则

```js
app.validator.addRule('json', (rule, value) => {
  try {
    JSON.parse(value);
  } catch (err) {
    return 'must be json string';
  }
});
```

添加完自定义规则之后，就可以在 controller 中直接使用这条规则来进行参数校验了

```js
exports.handler = function*() {
  const rule = { body: 'json' };
  this.validate(rule);
};
```

## 调用 service

我们并不想在 controller 中实现太多业务逻辑，所以提供了一个 [service](./service.md) 层进行业务逻辑的封装，这不仅能提高代码的复用性，同时可以让我们的业务逻辑更好测试。

在 controller 中可以调用任何一个 service 上的任何方法，同时 service 是懒加载的，只有当访问到它的时候我们才会去实例化它。

```js
exports.create = function* () {
  const author = this.session.userId;
  const req = Object.assign(this.request.body, { author });
  // 调用 service 进行业务处理
  const res = yield this.service.post.create(req);
  this.body = { id: res.id };
  this.status = 201;
};
```

service 的具体写法，请查看 [service](./service.md) 章节。

## 发送 http 响应

当业务逻辑完成之后，controller 的最后一个职责就是将业务逻辑的处理结果通过 HTTP 响应发送给用户。

### 设置 status

HTTP 设计了非常多的[状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，每一个状态码都代表了一个特定的含义，通过设置正确的状态码，可以让响应更符合语义。

框架提供了一个便捷的 setter 来进行状态码的设置

```js
exports.create = function*() {
  // 设置状态码为 201
  this.status = 201;
};
```

具体什么场景设置什么样的状态码，可以参考 [List of HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) 中各个状态码的含义。

### 设置 body

绝大多数的数据都是通过 body 发送给请求方的，和请求中的 body 一样，在响应中发送的 body，也需要有配套的 Content-Type 告知客户端如何对数据进行解析。

- 作为一个 RESTful 的 API 接口 controller，我们通常会返回 Content-Type 为 `application/json` 格式的 body，内容是一个 JSON 字符串。
- 作为一个 html 页面的 controller，我们通常会返回 Content-Type 为 `text/html` 格式的 body，内容是 html 代码段。

```js
exports.show = function*() {
  this.body = {
    name: 'egg',
    category: 'framework',
    language: 'Node.js',
  };
};

exports.page = function*() {
  this.body = '<html><h1>Hello</h1></html>';
};
```

由于 node 的流式特性，我们还有很多场景需要通过 stream 返回响应，例如返回一个大文件，代理服务器直接返回上游的内容，框架也支持直接将 body 设置成一个 stream，并会同时处理好这个 stream 上的错误事件。

```js
exports.proxy = function* () {
  const result = yield this.curl(url, {
    streaming: true,
  });
  this.set(result.header);
  // result.res 是一个 stream
  this.body = result.res;
};
```

#### 渲染模板

通常来说，我们不会手写 html 页面，而是会通过模板引擎进行生成。egg 自身没有集成任何一个模板引擎，但是约定了[view 插件的规范](../practice/view.md)，通过接入的模板引擎，可以直接使用 `this.render(template)` 来渲染模板生成 html。具体示例可以查看 quick start 中的 [模板渲染](../guide/quickstart.md#模板渲染) 部分。

#### jsonp

有时我们需要给非本域的页面提供接口服务，又由于一些历史原因无法通过 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) 实现，可以通过 [jsonp](https://en.wikipedia.org/wiki/JSONP) 来进行响应。

由于 JSONP 如果使用不当会导致非常多的安全问题，所以框架中提供了一个便捷设置 JSONP body 的方式，并封装了 [JSONP 相关的安全防范](../core/security.md#jsonp-xss)。

- 通过 `context.jsonp=` 来设置支持 JSONP 格式的响应。

```js
exports.show = function*() {
  this.jsonp = {
    name: 'egg',
    category: 'framework',
    language: 'Node.js',
  };
}
```

用户请求对应的 URL 访问到这个 controller 的时候，如果 query 中有 `_callback=fn` 参数，将会返回 JSONP 格式的数据，否则返回 JSON 格式的数据。

##### JSONP 配置

框架默认通过 query 中的 `_callback` 参数作为识别是否返回 JSONP 格式数据的依据，并且 `_callback` 中设置的方法名长度最多只允许 50 个字符。应用可以在 `config/config.default.js` 覆盖默认的配置

```js
module.exports = {
  callback: 'callback', // 识别 query 中的 `callback` 参数
  limit: 100, // 函数名最长为 100 个字符
}
```

### 设置 header

我们通过状态码标识请求成功与否、状态如何，在 body 中设置响应的内容。而通过响应的 header，还可以设置一些扩展信息。

通过 `context.set(key, value)` 方法可以设置一个响应头，`context.set(headers)` 设置多个 header。

```js
exports.show = function*() {
  const start = Date.now();
  this.body = yield this.service.post.get();
  const used = Date.now() - start;
  // 设置一个响应头
  this.set('show-response-time', userd.toString());
};
```
