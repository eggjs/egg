title: controller
---

## 什么是 controller

[前面章节](./router.md)写到，我们通过 router 将用户的请求基于 method 和 URL 分发到了对应的 controller 上，那 controller 负责做什么？

简单的说 controller 负责**解析用户的输入，处理后返回相应的结果**，例如

- 在 [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) 接口中，controller 接受用户的参数，从数据库中查找内容返回给用户或者将用户的请求更新到数据库中。
- 在 html 页面请求中，controller 根据用户访问不同的 URL，渲染不同的模板得到 html 返回给用户。
- 在代理服务器中，controller 将用户的请求转发到其他服务器上，并将其他服务器的处理结果返回给用户。

框架推荐 controller 层主要对用户的请求参数进行处理（校验、转换），然后调用对应的 [service](./service.md) 方法处理业务，得到业务结果后封装并返回：

1. 获取用户通过 HTTP 传递过来的请求参数。
1. 校验、组装参数。
1. 调用 service 进行业务处理，必要时处理转换 service 的返回结果，让它适应用户的需求。
1. 通过 HTTP 将结果响应给用户。

## 如何编写 controller

所有的 controller 文件都必须放在 `app/controller` 目录下。controller 支持多种形式进行编写，可以根据不同的项目场景和开发习惯来选择。

### controller 类（推荐）

我们可以通过定义 controller 类的方式来编写代码：

```js
// app/controller/post.js
module.exports = app => {
  class PostController extends app.Controller {
    * create() {
      const { ctx, service } = this;
      const createRule = {
        title: { type: 'string' },
        content: { type: 'string' },
      };
      // 校验参数
      ctx.validate(createRule);
      // 组装参数
      const author = ctx.session.userId;
      const req = Object.assign(ctx.request.body, { author });
      // 调用 service 进行业务处理
      const res = yield service.post.create(req);
      // 设置响应内容和响应状态码
      ctx.body = { id: res.id };
      ctx.status = 201;
    }
  }

  return PostController;
}
```

我们通过上面的代码定义了一个 `PostController` 的类，类里面的每一个方法都可以作为一个 controller 在 router 中引用到。

```js
// app/router.js
module.exports = {
  app.post('createPost', '/api/posts', 'post.create');
}
```

定义的 controller 类，会在每一个请求访问到 server 时实例化一个全新的对象，而项目中的 controller 类继承于 `app.Controller`，会有下面几个属性挂在 `this` 上。

- `this.ctx`: 当前请求的上下文 [Context](./extend.md#context) 对象的实例，通过它我们可以拿到框架封装好的处理当前请求的各种便捷属性和方法。
- `this.app`: 当前应用 [Application](./extend.md#application) 对象的实例，通过它我们可以拿到框架提供的全局对象和方法。
- `this.service`：应用定义的 [service](./service.md)，通过它我们可以访问到抽象出的业务层。
- `this.config`：应用运行时的[配置项](./config.md)。

#### 自定义 Controller 基类

按照类的方式编写 controller，不仅可以让我们更好的对 controller 层代码进行抽象（例如将一些统一的处理抽象成一些私有方法），还可以通过自定义 controller 基类的方式封装应用中常用的方法。

在[启动自定义](./app-start.md)中，应用可自己定义 controller 基类，这样在 `app/controller` 中编写 controller 时就可以使用到定义在基类上的这些方法了。

```js
// app.js
module.exports = app => {
  class CustomController extends app.Controller {
    get user() {
      return this.ctx.session.user;
    }

    success(data) {
      this.ctx.body = {
        success: true,
        data,
      };
    },

    notFound(msg) {
      const msg = msg || 'not found';
      this.ctx.throw(404, msg);
    },
  };
  app.Controller = CustomController;
}
```

此时在编写应用的 controller 时，可以直接使用基类上的方法：

```js
//app/controller/post.js
module.exports = app => {
  return class PostController extends app.Controller {
    * list() {
      const posts = yield this.service.listByUser(this.user);
      this.success(posts);
    },
  };
};
```

### controller 方法

每一个 controller 都是一个 generator function，它的第一个参数是请求的上下文 [Context](./extend.md#context) 对象的实例，通过它我们可以拿到框架封装好的各种便捷属性和方法。

例如我们写一个对应到 `POST /api/posts` 接口的 controller，我们会在 `app/controller` 目录下创建一个 `post.js` 文件

```js
// app/controller/post.js
exports.create = function* (ctx) {
  const createRule = {
    title: { type: 'string' },
    content: { type: 'string' },
  };
  // 校验参数
  ctx.validate(createRule);
  // 组装参数
  const author = ctx.session.userId;
  const req = Object.assign(ctx.request.body, { author });
  // 调用 service 进行业务处理
  const res = yield ctx.service.post.create(req);
  // 设置响应内容和响应状态码
  ctx.body = { id: res.id };
  ctx.status = 201;
};
```

在上面的例子中我们引入了许多新的概念，但还是比较直观，容易理解的，我们会在下面对它们进行更详细的介绍。

## HTTP 基础

由于 controller 基本上是业务开发中唯一和 HTTP 协议打交道的地方，在继续往下了解之前，我们首先简单的看一下 HTTP 协议是怎样的。

如果我们发起一个 HTTP 请求来访问前面例子中提到的 controller：

```
curl -X POST http://localhost:3000/api/posts --data '{"title":"controller", "content": "what is controller"}' --header 'Content-Type:application/json; charset=UTF-8'
```

通过 curl 发出的 HTTP 请求的内容就会是下面这样的：

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
exports.listPosts = function* (ctx) {
  const query = ctx.query;
  // {
  //   category: 'egg',
  //   language: 'node',
  // }
};
```

当 query string 中的 key 重复时，`context.query` 只取 key 第一次出现时的值，后面再出现的都会被忽略。`GET /posts?category=egg&category=koa` 通过 `context.query` 拿到的值是 `{ category: 'egg' }`。

这样处理的原因是为了保持统一性，由于通常情况下我们都不会设计让用户传递 key 相同的 query string，所以我们经常会写类似下面的代码：

```js
const key = ctx.query.key || '';
if (key.startsWith('egg')) {
  // do something
}
```

而如果有人故意发起请求在 query string 中带上重复的 key 来请求时就会引发系统异常。因此框架保证了从 `context.query` 上获取的参数一旦存在，一定是字符串类型。

#### queries

有时候我们的系统会设计成让用户传递相同的 key，例如 `GET /posts?category=egg&id=1&id=2&id=3`。针对此类情况，框架提供了 `context.queries` 对象，这个对象也解析了 query string，但是它不会丢弃任何一个重复的数据，而是将他们都放到一个数组中：

```js
// GET /posts?category=egg&id=1&id=2&id=3

exports.listPosts = function* (ctx) {
  console.log(ctx.queries);
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

exports.listApp = function* (ctx) {
  assert.equal(ctx.params.projectId, '1');
  assert.equal(ctx.params.appId, '2');
};
```

### body

虽然我们可以通过 URL 传递参数，但是还是有诸多限制：

- [浏览器中会对 URL 的长度有所限制](http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers)，如果需要传递的参数过多就会无法传递。
- 服务端经常会将访问的完整 URL 记录到日志文件中，有一些敏感数据通过 URL 传递会不安全。

在前面的 HTTP 请求报文示例中，我们看到在 header 之后还有一个 body 部分，我们通常会在这个部分传递 POST、PUT 和 DELETE 等方法的参数。一般请求中有 body 的时候，客户端（浏览器）会同时发送 `Content-Type` 告诉服务端这次请求的 body 是什么格式的。Web 开发中数据传递最常用的两类格式分别是 json 和 form。

框架内置了 [bodyParser](https://github.com/koajs/bodyparser) 中间件来对这两类格式的请求 body 解析成 object 挂载到 `context.request.body` 上。HTTP 协议中并不建议在通过 GET、HEAD 方法访问时传递 body，所以我们无法在 GET、HEAD 方法中按照此方法获取到内容。

```js
// POST /api/posts HTTP/1.1
// Host: localhost:3000
// Content-Type: application/json; charset=UTF-8
//
// {"title": "controller", "content": "what is controller"}
exports.listPosts = function* (ctx) {
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
const sendToWormhole = require('stream-wormhole');

module.exports = function* (ctx) {
  const stream = yield ctx.getFileStream();
  const name = 'egg-multipart-test/' + path.basename(stream.filename);
  // 文件处理，上传到云存储等等
  let result;
  try {
    result = yield ctx.oss.put(name, stream);
  } catch (err) {
    // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
    yield sendToWormhole(stream);
    throw err;
  }

  ctx.body = {
    url: result.url,
    // 所有表单字段都能通过 `stream.fields` 获取到
    fields: stream.fields,
  };
};
```

要通过 `context.getFileStream` 便捷的获取到用户上传的文件，需要满足两个条件：

- 上传文件必须在其他 field 之前。
- 只支持上传一个文件。

如果要获取同时上传的多个文件，不能通过 `ctx.getFileStream()` 来获取，只能通过下面这种方式：

```js
const sendToWormhole = require('stream-wormhole');

module.exports = function* (ctx) {
  const parts = ctx.multipart();
  let part;
  while ((part = yield parts) != null) {
    if (part.length) {
      // 如果是数组的话是 filed
      console.log('field: ' + part[0]);
      console.log('value: ' + part[1]);
      console.log('valueTruncated: ' + part[2]);
      console.log('fieldnameTruncated: ' + part[3]);
    } else {
      if (!part.filename) {
        // 这时是用户没有选择文件就点击了上传(part 是 file stream，但是 part.filename 为空)
        // 需要做出处理，例如给出错误提示消息
        return;
      }
      // part 是上传的文件流
      console.log('field: ' + part.fieldname);
      console.log('filename: ' + part.filename);
      console.log('encoding: ' + part.encoding);
      console.log('mime: ' + part.mime);
      // 文件处理，上传到云存储等等
      let result;
      try {
        result = yield ctx.oss.put('egg-multipart-test/' + part.filename, part);
      } catch (err) {
        // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
        yield sendToWormhole(stream);
        throw err;
      }
      console.log(result);
    }
  }
  console.log('and we are done parsing the form!');
}
```

为了保证文件上传的安全，框架限制了支持的的文件格式，框架默认支持白名单如下：

```js
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
    whitelist: [ '.png' ], // 覆盖整个白名单，只允许上传 '.png' 格式
  },
};
```

**注意：当传递了 whitelist 属性时，fileExtensions 属性不生效。**

### header

除了从 URL 和请求 body 上获取参数之外，还有许多参数是通过请求 header 传递的。框架提供了一些辅助属性和方法来获取。

- `context.headers`，`context.header`，`context.request.headers`，`context.request.header`：这几个方法是等价的，都是获取整个 header 对象。
- `context.get(name)`，`context.request.get(name)`：获取请求 header 中的一个字段的值，如果这个字段不存在，会返回空字符串。
- 我们建议用 `context.get(name)` 而不是 `context.headers['name']`，因为前者会自动处理大小写。

由于 header 比较特殊，有一些是 `HTTP` 协议规定了具体含义的（例如 `Content-Type`，`Accept`），有些是反向代理设置的，已经约定俗成（X-Forwarded-For），框架也会对他们增加一些便捷的 getter，详细的 getter 可以查看 [API](https://eggjs.org/api/) 文档。

特别是如果我们通过 `config.proxy = true` 设置了应用部署在反向代理（nginx）之后，有一些 getter 的内部处理会发生改变。

#### `context.host`

优先读通过 `config.hostHeaders` 中配置的 header 的值，读不到时再尝试获取 host 这个 header 的值，如果都获取不到，返回空字符串。

`config.hostHeaders` 默认配置为 `x-forwarded-host`。

#### `context.protocol`

通过这个 getter 获取 protocol 时，首先会判断当前连接是否是加密连接，如果是加密连接，返回 https。

如果处于非加密连接时，优先读通过 `config.protocolHeaders` 中配置的 header 的值来判断是 HTTP 还是 https，如果读取不到，我们可以在配置中通过 `config.protocol` 来设置兜底值，默认为 HTTP。

`config.protocolHeaders` 默认配置为 `x-forwarded-proto`。

#### `context.ips`

通过 `context.ips` 获取请求经过所有的中间设备 ip 地址列表，只有在 `config.proxy = true` 时，才会通过读取 `config.ipHeaders` 中配置的 header 的值来获取，获取不到时为空数组。

`config.ipHeaders` 默认配置为 `x-forwarded-for`。

#### `context.ip`

通过 `context.ip` 获取请求发起方的 ip 地址，优先从 `context.ips` 中获取，`context.ips` 为空时使用连接上发起方的 ip 地址。

**注意：ip 和 ips 不同，ip 当 `config.proxy = false` 时会返回当前连接发起者的 ip 地址，ips 此时会为空数组。**

### cookie

HTTP 请求都是无状态的，但是我们的 Web 应用通常都需要知道发起请求的人是谁。为了解决这个问题，HTTP 协议设计了一个特殊的请求头：[cookie](https://en.wikipedia.org/wiki/HTTP_cookie)。服务端可以通过响应头（set-cookie）将少量数据响应给客户端，浏览器会遵循协议将数据保存，并在下次请求同一个服务的时候带上（浏览器也会遵循协议，只在访问符合 cookie 指定规则的网站时带上对应的 cookie 来保证安全性）。

通过 `context.cookies`，我们可以在 controller 中便捷、安全的设置和读取 cookie。

```js
exports.add = function* (ctx) {
  const count = ctx.cookie.get('count');
  count = count ? Number(count) : 0;
  ctx.cookie.set('count', ++count);
  ctx.body = count;
};

exports.remove = function* (ctx) {
  const count = ctx.cookie.set('count', null);
  ctx.status = 204;
};
```

cookie 虽然在 HTTP 中只是一个头，但是通过 `foo=bar;foo1=bar1;` 的格式可以设置多个键值对。

cookie 在 Web 应用中经常承担了传递客户端身份信息的作用，因此有许多安全相关的配置，不可忽视， [cookie](../core/cookie-and-session.md#cookie) 文档中详细介绍了 cookie 的用法和安全相关的配置项，可以深入阅读了解。

### session

通过 cookie，我们可以给每一个用户设置一个 session，用来存储用户身份相关的信息，这份信息会加密后存储在 cookie 中，实现跨请求的用户身份保持。

框架内置了 [session](https://github.com/eggjs/egg-session) 插件，给我们提供了 `context.session` 来访问或者修改当前用户 session 。

```js
exports.fetchPosts = function* (ctx) {
  // 获取 session 上的内容
  const userId = ctx.session.userId;
  const posts = yield ctx.service.post.fetch(userId);
  // 修改 session 的值
  ctx.session.visited = ctx.session.visited ? ctx.session.visited++ : 1;
  ctx.body = {
    success: true,
    posts,
  };
};
```

session 的使用方法非常直观，直接读取它或者修改它就可以了，如果要删除它，直接将它赋值为 null：

```js
exports.deleteSession = function* (ctx) {
  ctx.session = null;
};
```

和 cookie 一样，session 也有许多安全等选项和功能，在使用之前也最好阅读 [session](../core/cookie-and-session.md#session) 文档深入了解。

#### 配置

对于 session 来说，主要有下面几个属性可以在 `config.default.js` 中进行配置:

```js
module.exports = {
  key: 'EGG_SESS', // 承载 session 的 cookie 键值对名字
  maxAge: 86400000, // session 的最大有效时间
};
```

## 参数校验

在获取到用户请求的参数后，不可避免的要对参数进行一些校验。

借助 [validate](https://github.com/eggjs/egg-validate) 插件提供便捷的参数校验机制，帮助我们完成各种复杂的参数校验。

```js
// config/plugin.js
exports.validate = {
  enable: true,
  package: 'egg-validate',
};
```

通过 `context.validate(rule, [body])` 直接对参数进行校验：

```js
const createRule = {
  title: { type: 'string' },
  content: { type: 'string' },
};
exports.create = function* (ctx) {
  // 校验参数
  // 如果不传第二个参数会自动校验 `ctx.request.body`
  ctx.validate(createRule);
};
```

当校验异常时，会直接抛出一个异常，异常的状态码为 422，errors 字段包含了详细的验证不通过信息。如果想要自己处理检查的异常，可以通过 `try catch` 来自行捕获。

```js
exports.create = function* (ctx) {
  try {
    ctx.validate(createRule);
  } catch (err) {
    ctx.logger.warn(err.errors);
    ctx.body = { success: false };
    return;
  }
};
```

### 校验规则

参数校验通过 [parameter](https://github.com/node-modules/parameter#rule) 完成，支持的校验规则可以在该模块的文档中查阅到。

#### 自定义校验规则

除了上一节介绍的内置检验类型外，有时候我们希望自定义一些校验规则，让开发时更便捷，此时可以通过 `app.validator.addRule(type, check)` 的方式新增自定义规则。

```js
// app.js
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
exports.handler = function* (ctx) {
  // query.test 字段必须是 json 字符串
  const rule = { test: 'json' };
  ctx.validate(rule, ctx.query);
};
```

## 调用 service

我们并不想在 controller 中实现太多业务逻辑，所以提供了一个 [service](./service.md) 层进行业务逻辑的封装，这不仅能提高代码的复用性，同时可以让我们的业务逻辑更好测试。

在 controller 中可以调用任何一个 service 上的任何方法，同时 service 是懒加载的，只有当访问到它的时候框架才会去实例化它。

```js
exports.create = function* (ctx) {
  const author = ctx.session.userId;
  const req = Object.assign(ctx.request.body, { author });
  // 调用 service 进行业务处理
  const res = yield ctx.service.post.create(req);
  ctx.body = { id: res.id };
  ctx.status = 201;
};
```

service 的具体写法，请查看 [service](./service.md) 章节。

## 发送 HTTP 响应

当业务逻辑完成之后，controller 的最后一个职责就是将业务逻辑的处理结果通过 HTTP 响应发送给用户。

### 设置 status

HTTP 设计了非常多的[状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，每一个状态码都代表了一个特定的含义，通过设置正确的状态码，可以让响应更符合语义。

框架提供了一个便捷的 setter 来进行状态码的设置

```js
exports.create = function* (ctx) {
  // 设置状态码为 201
  ctx.status = 201;
};
```

具体什么场景设置什么样的状态码，可以参考 [List of HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) 中各个状态码的含义。

### 设置 body

绝大多数的数据都是通过 body 发送给请求方的，和请求中的 body 一样，在响应中发送的 body，也需要有配套的 Content-Type 告知客户端如何对数据进行解析。

- 作为一个 RESTful 的 API 接口 controller，我们通常会返回 Content-Type 为 `application/json` 格式的 body，内容是一个 JSON 字符串。
- 作为一个 html 页面的 controller，我们通常会返回 Content-Type 为 `text/html` 格式的 body，内容是 html 代码段。

```js
exports.show = function* (ctx) {
  ctx.body = {
    name: 'egg',
    category: 'framework',
    language: 'Node.js',
  };
};

exports.page = function* (ctx) {
  ctx.body = '<html><h1>Hello</h1></html>';
};
```

由于 Node.js 的流式特性，我们还有很多场景需要通过 stream 返回响应，例如返回一个大文件，代理服务器直接返回上游的内容，框架也支持直接将 body 设置成一个 stream，并会同时处理好这个 stream 上的错误事件。

```js
exports.proxy = function* (ctx) {
  const result = yield ctx.curl(url, {
    streaming: true,
  });
  ctx.set(result.header);
  // result.res 是一个 stream
  ctx.body = result.res;
};
```

#### 渲染模板

通常来说，我们不会手写 html 页面，而是会通过模板引擎进行生成。
egg 自身没有集成任何一个模板引擎，但是约定了 [view 插件的规范](../advanced/view-plugin.md)，通过接入的模板引擎，可以直接使用 `ctx.render(template)` 来渲染模板生成 html。
具体示例可以查看 [模板渲染](../core/view.md)。

#### JSONP

有时我们需要给非本域的页面提供接口服务，又由于一些历史原因无法通过 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) 实现，可以通过 [JSONP](https://en.wikipedia.org/wiki/JSONP) 来进行响应。

由于 JSONP 如果使用不当会导致非常多的安全问题，所以框架中提供了便捷的响应 JSONP 格式数据的方法，封装了 [JSONP XSS 相关的安全防范](../core/security.md#jsonp-xss)，并支持进行 CSRF 校验和 referrer 校验。

- 通过 `app.jsonp()` 提供的中间件来让一个 controller 支持响应 JSONP 格式的数据。在路由中，我们给需要支持 jsonp 的路由加上这个中间件：

```js
// app/router.js
module.exports = app => {
  const jsonp = app.jsonp();
  app.get('/api/posts/:id', jsonp, 'posts.show');
  app.get('/api/posts', jsonp, 'posts.list');
};
```

- 在 controller 中，只需要正常编写即可：

```js
// app/controller/posts.js
exports.show = function* (ctx) {
  ctx.body = {
    name: 'egg',
    category: 'framework',
    language: 'Node.js',
  };
}
```

用户请求对应的 URL 访问到这个 controller 的时候，如果 query 中有 `_callback=fn` 参数，将会返回 JSONP 格式的数据，否则返回 JSON 格式的数据。

##### JSONP 配置

框架默认通过 query 中的 `_callback` 参数作为识别是否返回 JSONP 格式数据的依据，并且 `_callback` 中设置的方法名长度最多只允许 50 个字符。应用可以在 `config/config.default.js` 全局覆盖默认的配置：

```js
// config/config.default.js
exports.jsonp = {
  callback: 'callback', // 识别 query 中的 `callback` 参数
  limit: 100, // 函数名最长为 100 个字符
}
```

通过上面的方式配置之后，如果用户请求 `/api/posts/1?callback=fn`，响应为 JSONP 格式，如果用户请求 `/api/posts/1`，响应格式为 JSON。

我们同样可以在 `app.jsonp()` 创建中间件时覆盖默认的配置，以达到不同路由使用不同配置的目的：

```js
// app/router.js
module.exports = app => {
  app.get('/api/posts/:id', app.jsonp({ callback: 'callback' }), 'posts.show');
  app.get('/api/posts', app.jsonp({ callback: 'cb' }), 'posts.list');
};
```

##### 跨站防御配置

默认配置下，响应 JSONP 时不会进行任何跨站攻击的防范，在某些情况下，这是很危险的。我们初略将 JSONP 接口分为三种类型：

1. 查询非敏感数据，例如获取一个论坛的公开文章列表。
2. 查询敏感数据，例如获取一个用户的交易记录。
3. 提交数据并修改数据库，例如给某一个用户创建一笔订单。

如果我们的 JSONP 接口提供下面两类服务，在不做任何跨站防御的情况下，可能泄露用户敏感数据甚至导致用户被钓鱼。因此框架给 JSONP 默认提供了 CSRF 校验支持和 referrer 校验支持。

###### CSRF

在 JSONP 配置中，我们只需要打开 `csrf: true`，即可对 JSONP 接口开启 CSRF 校验。

```js
// config/config.default.js
module.exports = {
  jsonp: {
    csrf: true,
  },
};
```

**注意，CSRF 校验依赖于 [security](../core/security.md) 插件提供的基于 cookie 的 CSRF 校验。**

在开启 CSRF 校验时，客户端在发起 JSONP 请求时，也要带上 CSRF token，如果发起 JSONP 的请求方所在的页面和我们的服务在同一个主域名之下的话，可以读取到 cookie 中的 CSRF token（在 CSRF token 缺失时也可以自行设置 CSRF token 到 cookie 中），并在请求时带上该 token。

##### referrer 校验

如果在同一个主域之下，可以通过开启 CSRF 的方式来校验 JSONP 请求的来源，而如果想对其他域名的网页提供 JSONP 服务，我们可以通过配置 referrer 白名单的方式来限制 JSONP 的请求方在可控范围之内。

```js
//config/config.default.js
exports.jsonp = {
  whiteList: /^https?:\/\/test.com\//,
  // whiteList: '.test.com',
  // whiteList: 'sub.test.com',
  // whiteList: [ 'sub.test.com', 'sub2.test.com' ],
}
```

`whiteList` 可以配置为正则表达式、字符串或者数组：

- 正则表达式：此时只有请求的 Referrer 匹配该正则时才允许访问 JSONP 接口。在设置正则表达式的时候，注意开头的 `^` 以及结尾的 `\/`，保证匹配到完整的域名。

```js
exports.jsonp = {
  whiteList: /^https?:\/\/test.com\//,
}
// matchs referrer:
// https://test.com/hello
// http://test.com/
```

- 字符串：设置字符串形式的白名单时分为两种，当字符串以 `.` 开头，例如 `.test.com` 时，代表 referrer 白名单为 `test.com` 的所有子域名，包括 `test.com` 自身。当字符串不以 `.` 开头，例如 `sub.test.com`，代表 referrer 白名单为 `sub.test.com` 这一个域名。（同时支持 HTTP 和 HTTPS）。

```js
exports.jsonp = {
  whiteList: '.test.com',
};
// matchs domain test.com:
// https://test.com/hello
// http://test.com/

// matchs subdomain
// https://sub.test.com/hello
// http://sub.sub.test.com/

exports.jsonp = {
  whiteList: 'sub.test.com',
};
// only matchs domain sub.test.com:
// https://sub.test.com/hello
// http://sub.test.com/
```

- 数组：当设置的白名单为数组时，代表只要满足数组中任意一个元素的条件即可通过 referrer 校验。

```js
exports.jsonp = {
  whiteList: [ 'sub.test.com', 'sub2.test.com' ],
};
// matchs domain sub.test.com and sub2.test.com:
// https://sub.test.com/hello
// http://sub2.test.com/
```

**当 CSRF 和 referrer 校验同时开启时，请求发起方只需要满足任意一个条件即可通过 JSONP 的安全校验。**

### 设置 header

我们通过状态码标识请求成功与否、状态如何，在 body 中设置响应的内容。而通过响应的 header，还可以设置一些扩展信息。

通过 `context.set(key, value)` 方法可以设置一个响应头，`context.set(headers)` 设置多个 header。

```js
// app/controller/api.js
exports.show = function* (ctx) {
  const start = Date.now();
  ctx.body = yield ctx.service.post.get();
  const used = Date.now() - start;
  // 设置一个响应头
  ctx.set('show-response-time', userd.toString());
};
```
