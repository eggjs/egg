---
title: 控制器（Controller）
order: 7
---

## 什么是 Controller

[前面章节](./router.md) 提到，我们通过 Router 将用户的请求基于 method 和 URL 分发到了对应的 Controller，那么 Controller 主要有什么职责呢？

简单地说，Controller 负责**解析用户的输入，处理后返回相应的结果**。例如：

- 在 [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) 接口中，Controller 接受用户的参数，从数据库中查找内容返回给用户，或将用户的请求更新到数据库中。
- 在 HTML 页面请求中，Controller 根据用户访问不同的 URL，渲染不同的模板得到 HTML，后返回给用户。
- 在代理服务器中，Controller 将用户的请求转发到其他服务器，之后将那些服务器的处理结果返回给用户。

框架推荐的 Controller 层主要流程是：首先对用户通过 HTTP 传递过来的请求参数进行处理（校验、转换），然后调用对应的 [service](./service.md) 方法处理业务，在必要时把 Service 的返回结果处理转换，使之满足用户需求，最后通过 HTTP 将结果响应给用户。具体步骤如下：

1. 获取用户通过 HTTP 传递过来的请求参数。
2. 校验、组装参数。
3. 调用 Service 进行业务处理，必要时处理转换 Service 的返回结果，让它适应用户的需求。
4. 通过 HTTP 将结果响应给用户。
## 如何编写 Controller

所有的 Controller 文件都必须放在 `app/controller` 目录下，可以支持多级目录，访问的时候可以通过目录名级联访问。Controller 支持多种形式进行编写，可以根据不同的项目场景和开发习惯来选择。

### Controller 类（推荐）

我们可以通过定义 Controller 类的方式来编写代码：

```javascript
// app/controller/post.js
const Controller = require('egg').Controller;
class PostController extends Controller {
  async create() {
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
    // 调用 Service 进行业务处理
    const res = await service.post.create(req);
    // 设置响应内容和响应状态码
    ctx.body = { id: res.id };
    ctx.status = 201;
  }
}
module.exports = PostController;
```

我们通过上述代码定义了一个 `PostController` 的类，类里面的每一个方法都可以作为一个 Controller 在 Router 中引用。下面是如何在 `app.router` 中根据文件名和方法名定位到它的示例：

```javascript
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.post('createPost', '/api/posts', controller.post.create);
};
```

Controller 支持多级目录。例如，如果我们将上面的 Controller 代码放到 `app/controller/sub/post.js` 中，那么可以在 router 中这样使用：

```javascript
// app/router.js
module.exports = app => {
  app.router.post('createPost', '/api/posts', app.controller.sub.post.create);
};
```

定义的 Controller 类在每一个请求访问到服务器时实例化一个全新的对象，而项目中的 Controller 类继承于 `egg.Controller`，会有以下几个属性挂在 `this` 上：

- `this.ctx`：当前请求的上下文 [Context](./extend.md#context) 对象的实例，通过它我们可以拿到框架封装好的处理当前请求的各种便捷属性和方法。
- `this.app`：当前应用 [Application](./extend.md#application) 对象的实例，通过它我们可以拿到框架提供的全局对象和方法。
- `this.service`：应用定义的 [Service](./service.md)，通过它我们可以访问抽象出的业务层，等价于 `this.ctx.service`。
- `this.config`：应用运行时的[配置项](./config.md)。
- `this.logger`：logger 对象，上面有四个方法（`debug`、`info`、`warn`、`error`），分别代表打印四个不同级别的日志。使用方法和效果与 [context logger](../core/logger.md#context-logger) 中介绍的相同，但是通过这个 logger 对象记录的日志，在日志前面会加上打印该日志的文件路径，以便快速定位日志打印位置。

#### 自定义 Controller 基类

按照类的方式编写 Controller，不仅可以让我们更好地对 Controller 层代码进行抽象（例如，将一些统一的处理抽象为一些私有方法），还可以通过自定义 Controller 基类的方式封装应用中常用的方法。

```javascript
// app/core/base_controller.js
const { Controller } = require('egg');
class BaseController extends Controller {
  get user() {
    return this.ctx.session.user;
  }

  success(data) {
    this.ctx.body = {
      success: true,
      data,
    };
  }

  notFound(msg) {
    msg = msg || 'not found';
    this.ctx.throw(404, msg);
  }
}
module.exports = BaseController;
```

在编写应用的 Controller 时，可以继承 BaseController，直接使用基类上的方法：

```javascript
// app/controller/post.js
const Controller = require('../core/base_controller');
class PostController extends Controller {
  async list() {
    const posts = await this.service.listByUser(this.user);
    this.success(posts);
  }
}
```

### Controller 方法（不推荐使用，只是为了兼容）

每一个 Controller 都是一个 `async function`，其入参为请求的上下文 [Context](./extend.md#context) 对象的实例。通过它，我们可以拿到框架封装好的各种便捷属性和方法。

例如，我们编写一个对应到 `POST /api/posts` 接口的 Controller，我们需要在 `app/controller` 目录下创建一个 `post.js` 文件：

```javascript
// app/controller/post.js
exports.create = async ctx => {
  const createRule = {
    title: { type: 'string' },
    content: { type: 'string' },
  };
  // 校验参数
  ctx.validate(createRule);
  // 组装参数
  const author = ctx.session.userId;
  const req = Object.assign(ctx.request.body, { author });
  // 调用 Service 进行业务处理
  const res = await ctx.service.post.create(req);
  // 设置响应内容和响应状态码
  ctx.body = { id: res.id };
  ctx.status = 201;
};
```

以上是一个简单直观的例子，我们引入了一些新的概念，但它们都是易于理解的。我们将在后面对它们进行更详细的介绍。
## HTTP 基础

由于控制器（Controller）基本上是业务开发中唯一与 HTTP 协议打交道的地方，在继续深入了解之前，我们首先要简单了解一下 HTTP 协议本身。

假设我们发起一个 HTTP 请求来访问前面例子中提及的 Controller：

```
curl -X POST http://localhost:3000/api/posts --data '{"title":"controller", "content": "what is controller"}' --header 'Content-Type:application/json; charset=UTF-8'
```

通过 curl 发出的 HTTP 请求内容就如下：

```
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json; charset=UTF-8

{"title": "controller", "content": "what is controller"}
```

请求的第一行包含三个信息，我们较为常用的是前两个：

- 方法（method）：这个请求中 method 的值是 `POST`。
- 路径（path）：值为 `/api/posts`，如果用户请求中含 query，则也会在此出现。

从第二行开始至第一个空行之前，都是请求的头部（Headers）部分。这里有众多常用属性，如 Host、Content-Type，以及 `Cookie`、`User-Agent` 等。在本次请求中有两个头信息：

- `Host`：浏览器发起请求时，会使用域名通过 DNS 解析找到服务器的 IP 地址，浏览器还会将域名和端口号放进 Host 头内发送给服务器。
- `Content-Type`：请求中如有请求体（body），通常伴随 Content-Type，标明请求体格式。

之后内容为请求体，POST、PUT、DELETE 等方法可附带请求体，服务端根据 Content-Type 解析请求体。

服务器处理请求后，会发送一个 HTTP 响应给客户端：

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 8
Date: Mon, 09 Jan 2017 08:40:28 GMT
Connection: keep-alive

{"id": 1}
```

响应的首行也包括三部分，其中常用的主要是[响应状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)。本例中为 201，意味服务端成功创建了资源。

响应头从第二行至下一个空行，这里的 Content-Type 和 Content-Length 表明响应格式为 JSON，长度 8 字节。

最后部分即响应实际内容。
## 获取 HTTP 请求参数

从上述 HTTP 请求示例中, 我们可以看到, 多个位置可以放置用户的请求数据。框架通过在 Controller 上绑定的 Context 实例, 提供了多种便捷方法和属性, 以获取用户通过 HTTP 请求发送过来的参数。

### Query

在 URL 中 `?` 后的部分是 Query String。这部分经常用于 GET 类型请求中传递参数。例如，`GET /posts?category=egg&language=node` 中的 `category=egg&language=node` 就是用户传递的参数。我们可以通过 `ctx.query` 获取解析后的这个参数对象。

```js
class PostController extends Controller {
  async listPosts() {
    const query = this.ctx.query;
    // 输出:
    // {
    //   category: 'egg',
    //   language: 'node'
    // }
  }
}
```

当 Query String 中的 key 重复时，`ctx.query` 只取第一次出现的值，后续的都会被忽略。例如 `GET /posts?category=egg&category=koa`，通过 `ctx.query` 获取的值将是 `{ category: 'egg' }`。

之所以这样处理是为了保持一致性。一般我们不会设计让用户传递相同 key 的 Query String，所以经常编写如下代码：

```js
const key = ctx.query.key || '';
if (key.startsWith('egg')) {
  // 执行相应操作
}
```

如果有人故意在 Query String 中带上重复的 key 请求，就会引发系统异常。因此框架确保从 `ctx.query` 获取的参数一旦存在，一定是字符串类型。

#### Queries

有些系统会设计为让用户传递相同的 key，例如 `GET /posts?category=egg&id=1&id=2&id=3`。框架提供了 `ctx.queries` 对象，它同样解析了 Query String，但不会丢弃任何重复数据，而是将它们放进一个数组。

```js
// GET /posts?category=egg&id=1&id=2&id=3
class PostController extends Controller {
  async listPosts() {
    console.log(this.ctx.queries);
    // 输出:
    // {
    //   category: [ 'egg' ],
    //   id: [ '1', '2', '3' ]
    // }
  }
}
```

`ctx.queries` 中所有 key 的值，如果存在, 必然是数组类型。

### Router Params

在 [Router](./router.md) 文档中，我们介绍了可以在 Router 上声明参数，所有参数可通过 `ctx.params` 获取。

```js
// app.get('/projects/:projectId/app/:appId', 'app.listApp');
// GET /projects/1/app/2
class AppController extends Controller {
  async listApp() {
    assert.equal(this.ctx.params.projectId, '1');
    assert.equal(this.ctx.params.appId, '2');
  }
}
```

### Body

我们也可以通过 URL 传参，但存在一些限制：

- [浏览器对 URL 长度有限制](http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers)；若参数过多可能无法传递。
- 服务端通常会将完整 URL 记录到日志中；敏感数据如果通过 URL 传递可能不安全。

在 HTTP 请求报文中，Header 之后有一个 Body 部分。POST、PUT 和 DELETE 等方法常在此传递参数。请求中若有 Body，则客户端（浏览器）会发送 `Content-Type` 告知服务端该请求 body 的格式。WEB 应用数据传输中最常见的格式有 JSON 和 Form。

框架内置了 [bodyParser](https://github.com/koajs/bodyparser) 中间件，可解析这两种格式请求的 body 并挂载到 `ctx.request.body` 上。`GET`、`HEAD` 方法不建议传递 body，因此无法按此方法获取内容。

```js
// POST /api/posts HTTP/1.1
// Host: localhost:3000
// Content-Type: application/json; charset=UTF-8
//
// {"title": "controller", "content": "what is controller"}
class PostController extends Controller {
  async listPosts() {
    assert.equal(this.ctx.request.body.title, 'controller');
    assert.equal(this.ctx.request.body.content, 'what is controller');
  }
}
```

框架为 bodyParser 中间件配置了默认参数。配置后具备以下特性：

- Content-Type 为 `application/json`，`application/json-patch+json`，`application/vnd.api+json` 和 `application/csp-report` 时，按 json 格式解析请求 body，限制最大长度 `100kb`。
- Content-Type 为 `application/x-www-form-urlencoded` 时，按 form 格式解析请求 body，限制最大长度 `100kb`。
- 若解析成功，body 必然是 Object（Array）。

通常我们会调整配置项以变更解析时允许的最大长度，可在 `config/config.default.js` 中修改默认值。

```js
module.exports = {
  bodyParser: {
    jsonLimit: '1mb',
    formLimit: '1mb',
  },
};
```

如果请求 body 超过配置的最大长度，会抛出状态码 `413` 的异常；body 解析失败（如错误 JSON）会抛出状态码 `400` 的异常。

**注意：调整 bodyParser 支持的 body 长度时，如果应用之前有一层反向代理（如 Nginx），同样需要调整配置确保支持相等长度的请求 body。**

**常见错误：将 `ctx.request.body` 与 `ctx.body` 混淆，后者实际上是 `ctx.response.body` 的简写。**
### 获取上传的文件

请求体除了可以带参数之外，还可以发送文件。通常情况下，浏览器会通过 `Multipart/form-data` 格式发送文件。通过内置的 [Multipart](https://github.com/eggjs/egg-multipart) 插件，框架支持获取用户上传的文件。我们为你提供了两种方式：

#### File 模式

如果你不熟悉 Node.js 中的 Stream 用法，那么 File 模式非常适合你：

1）在 config 文件中启用 `file` 模式：

```javascript
// config/config.default.js
exports.multipart = {
  mode: 'file',
};
```

2）上传/接收文件：

1. 上传/接收单个文件：

你的前端静态页面代码可能如下所示：

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file: <input name="file" type="file" />
  <button type="submit">上传</button>
</form>
```

对应的后端代码如下：

```javascript
// app/controller/upload.js
const Controller = require('egg').Controller;
const fs = require('fs/promises');
const path = require('path'); // 补上缺失的 path 模块

class UploadController extends Controller {
  async upload() {
    const { ctx } = this;
    const file = ctx.request.files[0];
    const name = 'egg-multipart-test/' + path.basename(file.filename);
    let result;
    try {
      // 处理文件，例如上传到云采存储
      result = await ctx.oss.put(name, file.filepath);
    } finally {
      // 注意删除临时文件
      await fs.unlink(file.filepath);
    }

    ctx.body = {
      url: result.url,
      // 获取全部字段值
      requestBody: ctx.request.body,
    };
  }
}

module.exports = UploadController;
```

2. 上传/接收多个文件：

对于多个文件，可以使用 `ctx.request.files` 数组进行遍历，然后分别处理每个文件。以下是你的前端静态页面的代码：

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title: <input name="title" />
  file1: <input name="file1" type="file" />
  file2: <input name="file2" type="file" />
  <button type="submit">上传</button>
</form>
```

对应的后端代码如下：

```javascript
// app/controller/upload.js
const Controller = require('egg').Controller;
const fs = require('fs/promises');
const path = require('path'); // 补上缺失的 path 模块

class UploadController extends Controller {
  async upload() {
    const { ctx } = this;
    console.log(ctx.request.body);
    console.log(`共收到 ${ctx.request.files.length} 个文件`);
    for (const file of ctx.request.files) {
      console.log(`字段名: ${file.fieldname}`);
      console.log(`文件名: ${file.filename}`);
      console.log(`编码: ${file.encoding}`);
      console.log(`MIME 类型: ${file.mime}`);
      console.log(`临时文件路径: ${file.filepath}`);
      let result;
      try {
        // 处理文件，例如上传到云采存储
        result = await ctx.oss.put(
          'egg-multipart-test/' + file.filename,
          file.filepath,
        );
      } finally {
        // 注意删除临时文件
        await fs.unlink(file.filepath);
      }
      console.log(result);
    }
  }
}

module.exports = UploadController;
```

以上代码包涵了前端的表单代码以及后端处理上传文件的代码。在服务器端，我们首先获取上传文件的信息，然后将文件上传到指定的储存系统，例如云储存。随后，我们确保了临时文件被删除，防止占用服务器空间。
#### Stream 模式

如果你对 Node 中的 Stream 模式非常熟悉，那么你可以选择此模式。在 Controller 中，我们可以通过 `ctx.getFileStream()` 接口获取到上传的文件流。

1. 上传/接受单个文件：

```html
<form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
  title：<input name="title"/> file：<input name="file" type="file"/>
  <button type="submit">Upload</button>
</form>
```

```js
const path = require('path');
const sendToWormhole = require('stream-wormhole');
const Controller = require('egg').Controller;

class UploaderController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + path.basename(stream.filename);
    // 文件处理，上传到云存储等等
    let result;
    try {
      result = await ctx.oss.put(name, stream);
    } catch (err) {
      // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
      await sendToWormhole(stream);
      throw err;
    }

    ctx.body = {
      url：result.url,
      // 所有表单字段都能通过 `stream.fields` 获取到
      fields：stream.fields
    };
  }
}

module.exports = UploaderController;
```

要通过 `ctx.getFileStream` 便捷地获取到用户上传的文件，需要满足两个条件：

- 只支持上传一个文件。
- 上传文件必须在所有其他的 fields 后面，否则在拿到文件流时可能还获取不到 fields。

2. 上传/接受多个文件：

如果要获取同时上传的多个文件，不能通过 `ctx.getFileStream()` 来获取，只能通过下面这种方式：

```js
const sendToWormhole = require('stream-wormhole');
const Controller = require('egg').Controller;

class UploaderController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const parts = ctx.multipart();
    let part;
    // parts() 返回 promise 对象
    while ((part = await parts()) != null) {
      if (part.length) {
        // 这是 busboy 的字段
        console.log('field：' + part[0]);
        console.log('value：' + part[1]);
        console.log('valueTruncated：' + part[2]);
        console.log('fieldnameTruncated：' + part[3]);
      } else {
        if (!part.filename) {
          // 这时是用户没有选择文件就点击了上传（part 是 file stream，但是 part.filename 为空）
          // 需要做出处理，例如给出错误提示消息
          return;
        }
        // part 是上传的文件流
        console.log('field：' + part.fieldname);
        console.log('filename：' + part.filename);
        console.log('encoding：' + part.encoding);
        console.log('mime：' + part.mime);
        // 文件处理，上传到云存储等等
        let result;
        try {
          result = await ctx.oss.put('egg-multipart-test/' + part.filename, part);
        } catch (err) {
          // 必须将上传的文件流消费掉，要不然浏览器响应会卡死
          await sendToWormhole(part);
          throw err;
        }
        console.log(result);
      }
    }
    console.log('and we are done parsing the form!');
  }
}

module.exports = UploaderController;
```

为了保证文件上传的安全，框架限制了支持的文件格式。框架默认支持的白名单如下：

```js
// images
'.jpg', '.jpeg', // image/jpeg
'.png', // image/png，image/x-png
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
'.avi'
```

用户可以通过在 `config/config.default.js` 中的配置来新增支持的文件扩展名，或者重写整个白名单。

- 新增支持的文件扩展名：

```js
module.exports = {
  multipart: {
    fileExtensions: ['.apk'] // 增加对 '.apk' 扩展名的文件支持
  }
};
```

- 覆盖整个白名单：

```js
module.exports = {
  multipart: {
    whitelist: ['.png'] // 覆盖整个白名单，只允许上传 '.png' 格式
  }
};
```

**注意：当重写了 whitelist 时，fileExtensions 不生效。**

欲了解更多有关的技术细节和信息，请参阅 [Egg-Multipart](https://github.com/eggjs/egg-multipart)。
### Header

除了从 URL 和请求 body 上获取参数之外，还有许多参数是通过请求 header 传递的。框架提供了一些辅助属性和方法来获取：

- `ctx.headers`、`ctx.header`、`ctx.request.headers`、`ctx.request.header`：这几个方法是等价的，都用于获取整个 header 对象。
- `ctx.get(name)`、`ctx.request.get(name)`：用于获取请求 header 中的一个字段的值。如果这个字段不存在，会返回空字符串。
- 我们建议使用 `ctx.get(name)` 而不是 `ctx.headers['name']`，因为前者会自动处理字段名大小写。

由于 header 的特殊性，某些字段如 `Content-Type`、`Accept` 等有明确的 HTTP 协议含义，有些如 `X-Forwarded-For` 则由反向代理设定。框架对这些字段提供了便捷的 getter，详细信息参见 [API](https://eggjs.org/api/) 文档。

特别地，若通过 `config.proxy = true` 设定了应用部署在反向代理（如 Nginx）之后，某些 Getter 的内部处理将发生改变。

#### `ctx.host`

此 Getter 优先读取 `config.hostHeaders` 中配置的 header 值。若无法获取，则尝试读取 `host` 这个 header 的值。若仍旧获取不到，则返回空字符串。

`config.hostHeaders` 的默认配置为 `x-forwarded-host`。

#### `ctx.protocol`

通过此 Getter 获取协议类型时，首先判断当前连接是否为加密连接（即使用 HTTPS）。若是加密连接，返回 `https`。

对于非加密连接，首先尝试从 `config.protocolHeaders` 中读取 header 值以判断是 HTTP 还是 HTTPS。若读不到值，则可通过 `config.protocol` 设置默认值，默认为 `http`。

`config.protocolHeaders` 的默认配置为 `x-forwarded-proto`。

#### `ctx.ips`

通过 `ctx.ips` 获取请求经过的所有中间设备的 IP 地址列表。只在 `config.proxy = true` 时，才会从 `config.ipHeaders` 中读取 header 值。若获取不到，则为空数组。

`config.ipHeaders` 的默认配置为 `x-forwarded-for`。

#### `ctx.ip`

`ctx.ip` 用于获取请求发起方的 IP 地址。优先从 `ctx.ips` 中获取，若 `ctx.ips` 为空，则使用连接上的 IP 地址。

**注：`ip` 与 `ips` 存在区别。当 `config.proxy = false` 时，`ip` 会返回当前连接发起者的 IP 地址，而 `ips` 会为空数组。**

### Cookie

HTTP 请求本质上是无状态的，但 Web 应用通常需要知道请求者的身份。为此，HTTP 协议设计了 Cookie（[Cookie](https://en.wikipedia.org/wiki/HTTP_cookie)），允许服务端通过响应头（set-cookie）向客户端发送数据。浏览器则会将数据保存，并在下次请求同一服务时发送，以确保安全性。

通过 `ctx.cookies`，可在 Controller 中安全地设置和读取 Cookie。

```js
class CookieController extends Controller {
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

Cookie 通常用于传递客户端身份信息，因此包含众多安全设置。详细用法和安全选项详见 [Cookie 文档](../core/cookie-and-session.md#cookie)。

#### 配置

Cookie 相关配置位于 `config.default.js`：

```js
module.exports = {
  cookies: {
    // httpOnly: true | false,
    // sameSite: 'none|lax|strict',
  },
};
```

例如，配置 Cookie [SameSite](https://www.ruanyifeng.com/blog/2019/09/cookie-samesite.html) 属性为 `lax`：

```js
module.exports = {
  cookies: {
    sameSite: 'lax',
  },
};
```

### Session

Cookie 可以存储每个用户的 Session 来保持跨请求的用户身份。这些信息加密后存储在 Cookie 中。

框架内置了 [Session](https://github.com/eggjs/session) 插件，通过 `ctx.session` 访问或修改用户 Session：

```js
class PostController extends Controller {
  async fetchPosts() {
    const ctx = this.ctx;
    // 读取 Session
    const userId = ctx.session.userId;
    const posts = await ctx.service.post.fetch(userId);
    // 修改 Session
    ctx.session.visited = ctx.session.visited ? ++ctx.session.visited : 1;
    ctx.body = {
      success: true,
      posts,
    };
  }
}
```

Session 的操作直观：直接读取、修改或将其赋值为 `null` 删除：

```js
class SessionController extends Controller {
  async deleteSession() {
    this.ctx.session = null;
  }
}
```

Session 的安全选项和用法详见 [Session 文档](../core/cookie-and-session.md#session)。

#### 配置

Session 相关配置也位于 `config.default.js`：

```js
module.exports = {
  key: 'EGG_SESS', // Session Cookie 名称
  maxAge: 86400000, // Session 最长有效期
};
```
## 参数校验

在获取用户请求的参数后，不可避免要进行一些校验。

借助 [Validate](https://github.com/eggjs/egg-validate) 插件，提供便捷的参数校验机制，帮助我们完成各种复杂的参数校验。

```js
// config/plugin.js
exports.validate = {
  enable: true,
  package: 'egg-validate',
};
```

通过 `ctx.validate(rule, [body])` 直接对参数校验：

```js
class PostController extends Controller {
  async create() {
    // 校验参数
    // 如果不传第二个参数，会自动校验 `ctx.request.body`
    this.ctx.validate({
      title: { type: 'string' },
      content: { type: 'string' }
    });
  }
}
```

校验异常时，会直接抛出异常，异常状态码为 422，`errors` 字段包含了详细的验证不通过信息。想要自行处理检查异常，可以通过 `try catch` 捕获。

```js
class PostController extends Controller {
  async create() {
    const ctx = this.ctx;
    try {
      ctx.validate(createRule);
    } catch (err) {
      ctx.logger.warn(err.errors);
      ctx.body = { success: false };
      return;
    }
  }
}
```

### 校验规则

参数校验通过 [Parameter](https://github.com/node-modules/parameter#rule) 完成，支持的校验规则在模块文档中查询。

#### 自定义校验规则

除了上一节介绍的内置校验类型，有时需自定义校验规则，可以通过 `app.validator.addRule(type, check)` 新增自定义规则。

```js
// app.js
app.validator.addRule('json', (rule, value) => {
  try {
    JSON.parse(value);
  } catch (err) {
    return '必须是 JSON 字符串';
  }
});
```

添加完自定义规则后，可在 Controller 中用这条规则进行参数校验。

```js
class PostController extends Controller {
  async handler() {
    const ctx = this.ctx;
    // query.test 字段必须是 JSON 字符串
    const rule = { test: 'json' };
    ctx.validate(rule, ctx.query);
  }
}
```

## 调用 Service

我们希望 Controller 中业务逻辑不太复杂，提供了 [Service](./service.md) 层，封装业务逻辑，提高代码复用性，便于测试。

Controller 可调用任何 Service 上的任何方法，Service 是懒加载的，只有使用时框架才实例化。

```js
class PostController extends Controller {
  async create() {
    const ctx = this.ctx;
    const author = ctx.session.userId;
    const req = Object.assign(ctx.request.body, { author });
    // 调用 service 处理业务
    const res = await ctx.service.post.create(req);
    ctx.body = { id: res.id };
    ctx.status = 201;
  }
}
```

Service 具体写法，查看 [Service](./service.md) 章节。
## 发送 HTTP 响应

当业务逻辑完成之后，Controller 的最后一个职责就是将业务逻辑的处理结果通过 HTTP 响应发送给用户。

### 设置 status

HTTP 设计了非常多的[状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，每一个状态码都代表了一个特定的含义，通过设置正确的状态码，可以让响应更符合语义。

框架提供了一个便捷的 Setter 来进行状态码的设置。

```js
class PostController extends Controller {
  async create() {
    // 设置状态码为 201
    this.ctx.status = 201;
  }
}
```

具体什么场景设置什么样的状态码，可以参考 [List of HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) 中各个状态码的含义。

### 设置 body

绝大部分的数据都是通过 body 发送给请求方的，同请求中的 body 一样，响应中发送的 body 也需要有配套的 Content-Type 告知客户端如何对数据进行解析。

- 作为一个 RESTful 的 API 接口 controller 我们通常会返回 Content-Type 为 `application/json` 格式的 body，内容是一个 JSON 字符串。
- 作为一个 html 页面的 controller 我们通常会返回 Content-Type 为 `text/html` 格式的 body，内容是 html 代码段。

**注意：`ctx.body` 是 `ctx.response.body` 的简写，不要与 `ctx.request.body` 混淆。**

```js
class ViewController extends Controller {
  async show() {
    this.ctx.body = {
      name: 'egg',
      category: 'framework',
      language: 'Node.js'
    };
  }

  async page() {
    this.ctx.body = '<html><h1>Hello</h1></html>';
  }
}
```

由于 Node.js 的流式特性，我们还有很多场景需要通过 Stream 返回响应，例如返回一个大文件，代理服务器直接返回上游的内容。框架也支持直接将 body 设置成一个 Stream，并会同时处理好这个 Stream 上的错误事件。

```js
class ProxyController extends Controller {
  async proxy() {
    const ctx = this.ctx;
    const result = await ctx.curl(url, {
      streaming: true
    });
    ctx.set(result.header);
    // result.res 是一个 stream
    ctx.body = result.res;
  }
}
```

#### 渲染模板

通常来说，我们不会手写 HTML 页面，而是通过模板引擎进行生成。框架自身没有集成任何一个模板引擎，但是约定了 [View 插件的规范](../advanced/view-plugin.md)，通过接入的模板引擎，可以直接使用 `ctx.render(template)` 来渲染模板生成 html。

```js
class HomeController extends Controller {
  async index() {
    const ctx = this.ctx;
    await ctx.render('home.tpl', { name: 'egg' });
    // ctx.body = await ctx.renderString('hi, {{ name }}', { name: 'egg' });
  }
}
```

具体示例可以查看[模板渲染](../core/view.md)。

#### JSONP

有时我们需要给非本域的页面提供接口服务，又由于一些历史原因无法通过 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) 实现，可以通过 [JSONP](https://en.wikipedia.org/wiki/JSONP) 来进行响应。

由于 JSONP 如果使用不当会导致非常多的安全问题，所以框架中提供了便捷的响应 JSONP 格式数据的方法，封装了 [JSONP XSS 相关的安全防范](../core/security.md#jsonp-xss)，并支持进行 CSRF 校验和 referrer 校验。

- 通过 `app.jsonp()` 提供的中间件来让一个 controller 支持响应 JSONP 格式的数据。在路由中，我们给需要支持 JSONP 的路由加上这个中间件：

```js
// app/router.js
module.exports = app => {
  const jsonp = app.jsonp();
  app.router.get('/api/posts/:id', jsonp, app.controller.posts.show);
  app.router.get('/api/posts', jsonp, app.controller.posts.list);
};
```

- 在 Controller 中，只需要按常规编写即可：

```js
// app/controller/posts.js
class PostController extends Controller {
  async show() {
    this.ctx.body = {
      name: 'egg',
      category: 'framework',
      language: 'Node.js'
    };
  }
}
```

用户请求对应的 URL 访问到这个 controller 的时候，如果 query 中有 `_callback=fn` 参数，将会返回 JSONP 格式的数据；否则返回 JSON 格式的数据。

##### JSONP 配置

框架默认通过 query 中的 `_callback` 参数作为识别是否返回 JSONP 格式数据的依据，并且 `_callback` 中设置的方法名长度最多只允许 50 个字符。应用可以在 `config/config.default.js` 中全局覆盖默认的配置：

```js
// config/config.default.js
exports.jsonp = {
  callback: 'callback', // 识别 query 中的 `callback` 参数
  limit: 100 // 函数名最长为 100 个字符
};
```

通过上述方式配置之后，如果用户请求 `/api/posts/1?callback=fn`，响应为 JSONP 格式；如果用户请求 `/api/posts/1`，响应格式为 JSON。

我们同样可以在 `app.jsonp()` 创建中间件时覆盖默认的配置，以实现不同路由使用不同配置的目的：

```js
// app/router.js
module.exports = app => {
  const { router, controller, jsonp } = app;
  router.get(
    '/api/posts/:id',
    jsonp({ callback: 'callback' }),
    controller.posts.show
  );
  router.get('/api/posts', jsonp({ callback: 'cb' }), controller.posts.list);
};
```

##### 跨站防御配置

默认配置下，响应 JSONP 时不会进行任何跨站攻击的防范。在某些情况下，这是很危险的。我们初步将 JSONP 接口分为三种类型：

1. 查询非敏感数据，例如获取一个论坛的公开文章列表。
2. 查询敏感数据，例如获取一个用户的交易记录。
3. 提交数据并修改数据库，例如为某一个用户创建一笔订单。

如果我们的 JSONP 接口提供下面两类服务，在不做任何跨站防御的情况下，可能泄露用户敏感数据甚至导致用户被钓鱼。因此框架默认为 JSONP 提供了 CSRF 校验支持和 referrer 校验支持。

###### CSRF

在 JSONP 配置中，我们只需打开 `csrf: true`，即可对 JSONP 接口开启 CSRF 校验。

```js
// config/config.default.js
module.exports = {
  jsonp: {
    csrf: true
  }
};
```

**注意，CSRF 校验依赖于 [security](../core/security.md) 插件提供的基于 Cookie 的 CSRF 校验。**

在开启 CSRF 校验时，客户端在发起 JSONP 请求时，也应带上 CSRF token。如果发起 JSONP 的请求方所在的页面和我们的服务在同一个主域名之下，可以读取到 Cookie 中的 CSRF token（在 CSRF token 缺失时，也可以自行设置 CSRF token 到 Cookie 中），并在请求时携带该 token。

##### Referrer 校验

如果在同一个主域之下，可以通过开启 CSRF 的方式来校验 JSONP 请求的来源。而如果想对其他域名的网页提供 JSONP 服务，我们可以通过配置 referrer 白名单的方式来限制 JSONP 的请求方在可控范围之内。

```javascript
// config/config.default.js
exports.jsonp = {
  whiteList: /^https?:\/\/test.com\//
  // whiteList: '.test.com'
  // whiteList: 'sub.test.com'
  // whiteList: ['sub.test.com', 'sub2.test.com']
};
```

`whiteList` 可以配置为正则表达式、字符串或者数组：

- 正则表达式：此时只有请求的 referrer 匹配该正则时才允许访问 JSONP 接口。在设置正则表达式的时候，注意开头的 `^` 和结尾的 `\/`，保证匹配到完整的域名。

```javascript
exports.jsonp = {
  whiteList: /^https?:\/\/test.com\//
};
// Matches referrer:
// https://test.com/hello
// http://test.com/
```

- 字符串：设置字符串形式的白名单时分为两种。当字符串以 `.` 开头，例如 `.test.com` 时，代表 referrer 白名单为 `test.com` 的所有子域名，包括 `test.com` 自身。当字符串不以 `.` 开头，例如 `sub.test.com`，则代表 referrer 白名单为 `sub.test.com` 这一个域名。（同时支持 HTTP 和 HTTPS）

```javascript
exports.jsonp = {
  whiteList: '.test.com'
};
// Matches domain test.com:
// https://test.com/hello
// http://test.com/

// Matches subdomain
// https://sub.test.com/hello
// http://sub.sub.test.com/

exports.jsonp = {
  whiteList: 'sub.test.com'
};
// Only matches domain sub.test.com:
// https://sub.test.com/hello
// http://sub.test.com/
```

- 数组：当设置的白名单为数组时，代表只要满足数组中任意一个元素的条件即可通过 referrer 校验。

```javascript
exports.jsonp = {
  whiteList: ['sub.test.com', 'sub2.test.com']
};
// Matches domain sub.test.com and sub2.test.com:
// https://sub.test.com/hello
// http://sub2.test.com/
```

**当 CSRF 和 referrer 校验同时开启时，请求发起方只需满足任意一个条件即可通过 JSONP 的安全校验。**

### 设置 Header

我们通过状态码标识请求是否成功及其状态，而响应体（body）中则设置响应的内容。通过响应头（Header），我们还可以设置一些扩展信息。

通过 `ctx.set(key, value)` 方法可以设置一个响应头，使用 `ctx.set(headers)` 设置多个 Header。

```javascript
// app/controller/api.js
class ProxyController extends Controller {
  async show() {
    const { ctx } = this;
    const start = Date.now();
    ctx.body = await ctx.service.post.get();
    const used = Date.now() - start;
    // 设置一个响应头
    ctx.set('show-response-time', used.toString());
  }
}
```

### 重定向

框架通过安全插件（security）覆盖了 Koa 原生的 `ctx.redirect` 实现，以增加重定向的安全性。

- `ctx.redirect(url)` 如果不在配置的白名单域名内，则禁止跳转。
- `ctx.unsafeRedirect(url)` 不判断域名，直接跳转。不建议使用，除非已明确了解可能带来的风险。

如果使用 `ctx.redirect` 方法，需要在应用的配置文件中进行如下配置：

```javascript
// config/config.default.js
exports.security = {
  domainWhiteList: ['.domain.com'] // 安全白名单，以 "." 开头
};
```

如果没有配置 `domainWhiteList` 或 `domainWhiteList` 数组为空，则默认允许所有跳转请求，等同于使用 `ctx.unsafeRedirect(url)`。
