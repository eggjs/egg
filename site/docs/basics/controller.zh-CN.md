---
title: 控制器（Controller）
order: 7
---

## 什么是 Controller

在[前面的章节](./router.md)中提到，我们通过 Router 将用户的请求基于方法和 URL 分发到了相应的 Controller。那么，Controller 负责什么呢？

简单来说，Controller 的职责是**解析用户的输入，处理后返回相应的结果**。例如：

- 在 [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) 接口中，Controller 接收用户的参数，从数据库中查找信息后返回给用户，或者将用户的请求更新到数据库中。
- 在 HTML 页面请求中，Controller 根据用户访问不同的 URL，渲染不同的模板并返回 HTML 给用户。
- 在代理服务器中，Controller 将用户的请求转发到其他服务器，然后将其处理结果返回给用户。

框架推荐的 Controller 层主要对用户的请求参数进行处理（校验、转换），然后调用相应的 [service](./service.md) 方法处理业务。处理完业务后，再封装并返回结果：

1. 获取用户通过 HTTP 传递过来的请求参数。
2. 校验、组装参数。
3. 调用 Service 进行业务处理。如有必要，处理转换 Service 的返回结果，使之适应用户的需求。
4. 通过 HTTP 将结果响应给用户。

## 如何编写 Controller

所有的 Controller 文件都必须放在 `app/controller` 目录下。支持多级目录结构，用户可以通过目录名级联访问。Controller 有多种编写形式，可根据不同项目场景和开发习惯选择合适的方式。

### Controller 类（推荐）

通过定义 Controller 类的方式编写代码是推荐的做法：

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

上述代码定义了一个 `PostController` 类，其中的每个方法都可以作为一个 Controller 在 Router 中引用。可以从 `app.controller` 根据文件名和方法名定位到它。

```javascript
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.post('createPost', '/api/posts', controller.post.create);
};
```

如果将 Controller 代码放在 `app/controller/sub/post.js` 中，则在 router 中可以这样使用：

```javascript
// app/router.js
module.exports = (app) => {
  app.router.post('createPost', '/api/posts', app.controller.sub.post.create);
};
```

定义的 Controller 类在每个请求访问服务器时会实例化一个全新的对象。项目中的 Controller 类继承自 `egg.Controller`，会有以下几个属性挂载在 `this` 上：

- `this.ctx`：当前请求的上下文 [Context](./extend.md#context) 对象实例，包含了处理当前请求的各种便捷属性和方法。
- `this.app`：当前应用 [Application](./extend.md#application) 对象实例，可以访问框架提供的全局对象和方法。
- `this.service`：应用定义的 [Service](./service.md)，可以访问抽象业务层，等同于 `this.ctx.service`。
- `this.config`：应用运行时的 [配置项](./config.md)。
- `this.logger`：日志对象，包含 `debug`、`info`、`warn`、`error` 四个方法，用于记录不同级别的日志。记录的日志会加上文件路径，便于快速定位。

#### 自定义 Controller 基类

通过类方式编写 Controller，除了可以对 Controller 层代码进行抽象外，还可以通过自定义 Controller 基类封装常用方法。

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

继承 `BaseController` 后，可以直接使用基类上的方法：

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

### Controller 方法（不推荐使用，仅为兼容旧代码）

每个 Controller 都可以是一个异步函数（async function），它的入参是当前请求的上下文 [Context](./extend.md#context) 对象实例。通过 Context，我们可以访问到封装好的各种便捷属性和方法。

例如，编写一个对应 `POST /api/posts` 接口的 Controller，我们会在 `app/controller` 目录下创建一个 `post.js` 文件：

```javascript
// app/controller/post.js
exports.create = async (ctx) => {
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

在上述示例中，我们引入了许多新的概念，但它们都是直观且易于理解的。这些概念将在下文中进行更详细的介绍。

## HTTP 基础

由于 Controller 是业务开发中唯一与 HTTP 协议打交道的地方，在继续了解之前，我们先简单回顾一下 HTTP 协议的基础知识。

假设我们发起一个 HTTP 请求来访问前面例子中提到的 Controller：

```
curl -X POST http://localhost:3000/api/posts --data '{"title":"controller", "content": "what is controller"}' --header 'Content-Type:application/json; charset=UTF-8'
```

使用 curl 发出的 HTTP 请求内容如下：

```
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json; charset=UTF-8

{"title": "controller", "content": "what is controller"}
```

请求的第一行包含了三个部分，通常我们关注前两个：

- method：本请求的方法为 `POST`。
- path：路径为 `/api/posts`，如果用户请求中包含查询字符串（query），也会在此处显示。

从第二行开始，直到遇到第一个空行，都是请求的 Headers 部分。这一部分包含了许多常用的属性，例如这里看到的 `Host` 和 `Content-Type`，以及其他如 `Cookie`、`User-Agent` 等。本例中有两个请求头：

- `Host`：在浏览器发起请求时，域名用于 DNS 解析以找到服务的 IP 地址，但浏览器也会将域名和端口号放在 Host 头中发送给服务器。
- `Content-Type`：当请求有 body 时，这个头部标明了请求体的格式。

之后的内容是请求的 body 部分，当请求方法为 POST、PUT、DELETE 等时，可以包含请求体，服务器会根据 `Content-Type` 来解析请求体内容。

服务器在处理完请求后，会发送一个 HTTP 响应给客户端：

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 8
Date: Mon, 09 Jan 2017 08:40:28 GMT
Connection: keep-alive

{"id": 1}
```

响应的第一行也包含三部分，其中我们通常关注的是[响应状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，这个例子中它的值是 201，表示在服务器端成功创建了资源。

和请求一样，从第二行到下一个空行之间是响应头。这里的 `Content-Type` 和 `Content-Length` 表示响应格式是 JSON，长度为 8 个字节。

最后剩下的部分是响应的实际内容。

### 获取 HTTP 请求参数

从上述 HTTP 请求示例可以看到，用户的请求数据可以放在多个位置。框架通过在 Controller 上绑定的 Context 实例，提供了多种便捷方法和属性来获取用户通过 HTTP 请求发送过来的参数。

#### query

在 URL 中 `?` 后面的部分称为查询字符串（Query String），这部分通常用于 GET 请求中传递参数。例如 `GET /posts?category=egg&language=node` 中的 `category=egg&language=node` 就是用户传递过来的参数。我们可以通过 `ctx.query` 获取到解析后的参数对象：

```javascript
class PostController extends Controller {
  async listPosts() {
    const query = this.ctx.query;
    // query 的值为：
    // {
    //   category: 'egg',
    //   language: 'node',
    // }
  }
}
```

当查询字符串中的键（key）重复时，`ctx.query` 只取第一次出现的键值，后续相同的键会被忽略。例如 `GET /posts?category=egg&category=koa` 通过 `ctx.query` 获取的值将是 `{ category: 'egg' }`。

这样的处理原因是为了保持一致性。通常情况下，我们不会设计让用户传递重复的键，所以我们经常会写类似以下代码：

```javascript
const key = ctx.query.key || '';
if (key.startsWith('egg')) {
  // 执行相关操作
}
```

如果有人故意发起请求并在查询字符串中带上重复的键，这可能会引发系统异常。因此，框架保证了从 `ctx.query` 获取的参数一旦存在，一定是字符串类型。

#### queries

有时候，我们的系统会设计成允许用户传递相同的键，例如 `GET /posts?category=egg&id=1&id=2&id=3`。对于这种情况，框架提供了 `ctx.queries` 对象，这个对象也解析了查询字符串，但它会保留所有重复的数据，并将它们放到一个数组中：

```javascript
// GET /posts?category=egg&id=1&id=2&id=3
class PostController extends Controller {
  async listPosts() {
    console.log(this.ctx.queries);
    // queries 的值为：
    // {
    //   category: [ 'egg' ],
    //   id: [ '1', '2', '3' ],
    // }
  }
}
```

`ctx.queries` 中所有的键如果有值，也一定会是数组类型。

#### Router params

在 [Router](./router.md) 中，我们介绍了路由中也可以声明参数，这些参数可以通过 `ctx.params` 获取。

```javascript
// app/router.js
// app.get('/projects/:projectId/app/:appId', 'app.listApp');
// 当请求为 GET /projects/1/app/2 时
class AppController extends Controller {
  async listApp() {
    assert.equal(this.ctx.params.projectId, '1');
    assert.equal(this.ctx.params.appId, '2');
  }
}
```

#### body

虽然可以通过 URL 传递参数，但还是有诸多限制：

- 浏览器对 URL 长度有限制，如果参数过多，可能无法传递。
- 服务端通常会将访问的完整 URL 记录到日志文件中，通过 URL 传递敏感数据可能不安全。

在前面的 HTTP 请求报文示例中，我们看到请求头（header）之后还有一个 body 部分。我们通常会在这个部分传递 POST、PUT 和 DELETE 等方法的参数。一般情况下，客户端（如浏览器）会同时发送 `Content-Type` 告诉服务端请求体的格式。Web 开发中最常用的两种数据传递格式是 JSON 和 Form。

框架内置了 [bodyParser](https://github.com/koajs/bodyparser) 中间件，用于解析这两种格式的请求体，并将解析结果挂载到 `ctx.request.body` 上。HTTP 协议中不建议在 GET、HEAD 方法中传递 body，因此我们无法在这两种方法中通过此方式获取内容。

```javascript
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

框架对 bodyParser 中间件设置了一些默认参数，配置后具有以下特性：

- 当请求的 Content-Type 为 `application/json`、`application/json-patch+json`、`application/vnd.api+json` 和 `application/csp-report` 时，会按照 JSON 格式对请求体进行解析，并限制 body 最大长度为 `100kb`。
- 当请求的 Content-Type 为 `application/x-www-form-urlencoded` 时，会按照表单格式对请求体进行解析，并限制 body 最大长度为 `100kb`。
- 如果解析成功，body 一定是一个对象（可能是数组）。

通常我们最常调整的配置项是解析时允许的最大长度，可以在 `config/config.default.js` 中覆盖框架的默认值。

```javascript
// config/config.default.js
module.exports = {
  bodyParser: {
    jsonLimit: '1mb',
    formLimit: '1mb',
  },
};
```

如果用户的请求体超过配置的最大长度，框架会抛出一个状态码为 `413` 的异常；如果请求体解析失败（如错误的 JSON），会抛出一个状态码为 `400` 的异常。

**注意：调整 bodyParser 支持的 body 长度时，如果应用前有反向代理（如 Nginx），可能也需要调整其配置，确保反向代理也支持同样长度的请求体。**

**另外，注意不要将 `ctx.request.body` 和 `ctx.body` 混淆。后者实际上是 `ctx.response.body` 的简写。**

#### 获取上传的文件

请求体除了可以携带参数，还可以上传文件。通常，浏览器通过 `Multipart/form-data` 格式发送文件。框架内置的 [Multipart](https://github.com/eggjs/egg-multipart) 插件支持获取用户上传的文件，提供了两种方式：

- **File 模式**：适合对 Node.js 中的 Stream 不太熟悉的开发者。

1. 在配置文件中启用 `file` 模式：

   ```javascript
   // config/config.default.js
   exports.multipart = {
     mode: 'file',
   };
   ```

2. 接收文件：

   - 接收单个文件：

     前端页面代码示例：

     ```html
     <form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
       title: <input name="title" />
       file: <input name="file" type="file" />
       <button type="submit">Upload</button>
     </form>
     ```

     后端 Controller 代码：

     ```javascript
     // app/controller/upload.js
     const Controller = require('egg').Controller;
     const fs = require('fs/promises');

     class UploadController extends Controller {
       async upload() {
         const { ctx } = this;
         const file = ctx.request.files[0];
         let result;
         try {
           // 处理文件，例如上传到云存储等
           result = await ctx.oss.put('egg-multipart-test/' + file.filename, file.filepath);
         } finally {
           // 删除临时文件
           await fs.unlink(file.filepath);
         }
         ctx.body = {
           url: result.url,
           requestBody: ctx.request.body,
         };
       }
     }
     ```

     后端 Controller 代码：

     ```javascript
     // app/controller/upload.js
     const Controller = require('egg').Controller;
     const fs = require('fs/promises');

     class UploadController extends Controller {
       async upload() {
         const { ctx } = this;
         for (const file of ctx.request.files) {
           let result;
           try {
             // 处理文件，例如上传到云存储等
             result = await ctx.oss.put('egg-multipart-test/' + file.filename, file.filepath);
           } finally {
             // 删除临时文件
             await fs.unlink(file.filepath);
           }
           console.log(result);
         }
         ctx.body = {
           success: true,
         };
       }
     }
     ```

- - **Stream 模式**：适合熟悉 Node.js Stream 的开发者。在 Controller 中，可以通过 `ctx.getFileStream()` 获取上传的文件流。

  - 接收单个文件：

    前端页面代码示例：

    ```html
    <form method="POST" action="/upload?_csrf={{ ctx.csrf | safe }}" enctype="multipart/form-data">
      title: <input name="title" />
      file: <input name="file" type="file" />
      <button type="submit">Upload</button>
    </form>
    ```

    后端 Controller 代码：

    ```javascript
    const Controller = require('egg').Controller;
    const sendToWormhole = require('stream-wormhole');

    class UploaderController extends Controller {
      async upload() {
        const ctx = this.ctx;
        const stream = await ctx.getFileStream();
        let result;
        try {
          // 文件处理，例如上传到云存储等
          result = await ctx.oss.put('egg-multipart-test/' + stream.filename, stream);
        } catch (err) {
          // 必须消费掉 stream，否则浏览器响应会卡死
          await sendToWormhole(stream);
          throw err;
        }
        ctx.body = {
          url: result.url,
          fields: stream.fields,
        };
      }
    }
    ```
```markdown
  - 接收多个文件：

    如果需要同时获取多个上传的文件，不能使用 `ctx.getFileStream()` 方法，而应该使用以下方式：

    ```javascript
    const Controller = require('egg').Controller;
    const sendToWormhole = require('stream-wormhole');

    class UploaderController extends Controller {
      async upload() {
        const ctx = this.ctx;
        const parts = ctx.multipart();
        let part;
        while ((part = await parts()) != null) {
          if (part.length) {
            // 这是 busboy 的字段
            console.log('field: ' + part[0]);
            console.log('value: ' + part[1]);
            console.log('valueTruncated: ' + part[2]);
            console.log('fieldnameTruncated: ' + part[3]);
          } else {
            if (!part.filename) {
              // 用户没有选择文件就点击了上传
              // 需要做出处理，例如给出错误提示消息
              return;
            }
            // part 是上传的文件流
            let result;
            try {
              result = await ctx.oss.put('egg-multipart-test/' + part.filename, part);
            } catch (err) {
              // 必须消费掉 stream，否则浏览器响应会卡死
              await sendToWormhole(part);
              throw err;
            }
            console.log(result);
          }
        }
        console.log('表单解析完成');
      }
    }
    ```

    为了确保文件上传的安全，框架限制了支持的文件格式。默认情况下，框架支持的文件扩展名包括：

    - 图片：`.jpg`, `.jpeg`, `.png`, `.gif`, `.bmp`, `.wbmp`, `.webp`, `.tif`, `.psd`
    - 文本：`.svg`, `.js`, `.jsx`, `.json`, `.css`, `.less`, `.html`, `.htm`, `.xml`
    - 压缩文件：`.zip`, `.gz`, `.tgz`, `.gzip`
    - 视频：`.mp3`, `.mp4`, `.avi`

    开发者可以通过在 `config/config.default.js` 中配置来新增或覆盖支持的文件扩展名：

    - 新增支持的文件扩展名：

      ```javascript
      // config/config.default.js
      exports.multipart = {
        fileExtensions: ['.apk'], // 增加对 .apk 扩展名的支持
      };
      ```

    - 覆盖整个文件扩展名白名单：

      ```javascript
      // config/config.default.js
      exports.multipart = {
        whitelist: ['.png'], // 覆盖整个白名单，只允许上传 .png 格式
      };
      ```

    **注意：当重写 `whitelist` 时，`fileExtensions` 配置不会生效。**

    欲了解更多相关技术细节和详情，请参阅 [Egg-Multipart](https://github.com/eggjs/egg-multipart) 文档。
了解了，我将继续执行修改任务，并注意不翻译代码中的英文以及保留原文中全角圆括号里的补充说明内容。现在我开始进行下一部分的修改。

### header

除了从 URL 和请求体上获取参数外，还有许多参数是通过请求头（header）传递的。框架提供了一些辅助属性和方法来获取这些值。

- `ctx.headers`、`ctx.header`、`ctx.request.headers`、`ctx.request.header`：这些方法等价，用于获取整个 header 对象。
- `ctx.get(name)`、`ctx.request.get(name)`：用于获取请求头中某个字段的值。如果字段不存在，将返回空字符串。
- 建议使用 `ctx.get(name)` 而不是 `ctx.headers['name']`，因为前者会自动处理字段名的大小写。

由于 header 的特殊性，框架为一些常见的 header 字段提供了便捷的 getter，例如 `Content-Type`、`Accept`。如果应用部署在反向代理（如 Nginx）之后，通过 `config.proxy = true` 设置后，这些 getter 的内部处理逻辑会有所不同。

#### `ctx.host`

优先读取 `config.hostHeaders` 配置中指定的 header 值，如果没有则尝试读取 `host` 这个 header 的值。如果都获取不到，则返回空字符串。

`config.hostHeaders` 默认配置为 `x-forwarded-host`。

#### `ctx.protocol`

通过 `ctx.protocol` 获取协议时，首先会判断当前连接是否为加密连接（https）。如果是，返回 `https`。

如果是非加密连接，将优先读取 `config.protocolHeaders` 配置中指定的 header 值来判断是 HTTP 还是 HTTPS。如果读取不到，可以通过 `config.protocol` 设置默认值，默认为 HTTP。

`config.protocolHeaders` 默认配置为 `x-forwarded-proto`。

#### `ctx.ips`

通过 `ctx.ips` 获取请求经过所有中间设备的 IP 地址列表。只有在 `config.proxy = true` 时，才会通过 `config.ipHeaders` 配置中指定的 header 值来获取。如果获取不到，则为空数组。

`config.ipHeaders` 默认配置为 `x-forwarded-for`。

#### `ctx.ip`

通过 `ctx.ip` 获取请求发起方的 IP 地址。优先从 `ctx.ips` 获取，如果 `ctx.ips` 为空，则使用连接上发起方的 IP 地址。

**注意：`ip` 和 `ips` 的区别在于，当 `config.proxy = false` 时，`ip` 返回当前连接发起者的 IP 地址，`ips` 会是空数组。**

### Cookie

HTTP 请求是无状态的，但我们的 Web 应用通常需要知道发起请求的用户是谁。为此，HTTP 协议设计了一个特殊的请求头：[Cookie](https://en.wikipedia.org/wiki/HTTP_cookie)。服务端可以通过响应头（Set-Cookie）将少量数据发送给客户端。浏览器会根据协议保存这些数据，并在下次请求同一服务时携带它们。

通过 `ctx.cookies`，我们可以在 Controller 中便捷且安全地设置和读取 Cookie。

```javascript
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

Cookie 虽然在 HTTP 中只是一个头，但它可以设置多个键值对，例如 `foo=bar;foo1=bar1;`。

Cookie 在 Web 应用中常用于传递客户端身份信息，因此有许多与安全相关的配置。[Cookie](../core/cookie-and-session.md#cookie) 文档中详细介绍了 Cookie 的用法和安全配置项。

#### 配置

Cookie 的一些属性可以在 `config.default.js` 中配置：

```javascript
module.exports = {
  cookies: {
    // httpOnly: true | false,
    // sameSite: 'none|lax|strict',
  },
};
```

举例：配置应用级别的 Cookie [SameSite](https://www.ruanyifeng.com/blog/2019/09/cookie-samesite.html) 属性为 `Lax`。

```javascript
module.exports = {
  cookies: {
    sameSite: 'lax',
  },
};
```

### Session

利用 Cookie，我们可以为每个用户创建一个 Session，用于存储用户身份相关的信息。这些信息经过加密后存储在 Cookie 中，实现了跨请求的用户身份保持。

框架内置了 [Session](https://github.com/eggjs/egg-session) 插件，提供了 `ctx.session` 来访问或修改当前用户的 Session。

```javascript
class PostController extends Controller {
  async fetchPosts() {
    const ctx = this.ctx;
    // 获取 Session 上的内容
    const userId = ctx.session.userId;
    const posts = await ctx.service.post.fetch(userId);
    // 修改 Session 的值
    ctx.session.visited = ctx.session.visited ? ++ctx.session.visited : 1;
    ctx.body = {
      success: true,
      posts,
    };
  }
}
```

使用 Session 非常直观，直接读取或修改即可。如果需要删除 Session，直接将其赋值为 `null`：

```javascript
class SessionController extends Controller {
  async deleteSession() {
    this.ctx.session = null;
  }
}
```

和 Cookie 一样，Session 也有许多安全选项和功能。在使用之前，建议阅读 [Session](../core/cookie-and-session.md#session) 文档以深入了解。

#### 配置

Session 的一些属性可以在 `config.default.js` 中配置：

```javascript
module.exports = {
  key: 'EGG_SESS', // 承载 Session 的 Cookie 键值对名称
  maxAge: 86400000, // Session 的最大有效时间
};
```

## 参数校验

在获取用户请求的参数后，我们通常需要对这些参数进行校验。框架内置的 [Validate](https://github.com/eggjs/egg-validate) 插件提供了便捷的参数校验机制，帮助我们完成各种复杂的参数校验。

```javascript
// config/plugin.js
exports.validate = {
  enable: true,
  package: 'egg-validate',
};
```

使用 `ctx.validate(rule, [body])` 方法可以直接对参数进行校验：

```javascript
class PostController extends Controller {
  async create() {
    // 校验参数
    // 如果不传第二个参数，将自动校验 `ctx.request.body`
    this.ctx.validate({
      title: { type: 'string' },
      content: { type: 'string' },
    });
  }
}
```

当校验发生异常时，会直接抛出一个异常，异常状态码为 422，`errors` 字段包含了详细的校验失败信息。如果希望自己处理校验异常，可以通过 `try catch` 来捕获。

```javascript
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

参数校验通过 [Parameter](https://github.com/node-modules/parameter#rule) 完成，支持的校验规则可以在该模块的文档中查阅。

#### 自定义校验规则

除了内置的校验类型，有时我们需要自定义一些校验规则，这时可以通过 `app.validator.addRule(type, check)` 来新增自定义规则。

```javascript
// app.js
app.validator.addRule('json', (rule, value) => {
  try {
    JSON.parse(value);
  } catch (err) {
    return 'must be json string';
  }
});
```

添加自定义规则后，就可以在 Controller 中使用这条规则进行参数校验了。

```javascript
class PostController extends Controller {
  async handler() {
    const ctx = this.ctx;
    // query.test 必须是 json 字符串
    const rule = { test: 'json' };
    ctx.validate(rule, ctx.query);
  }
}
```


## 调用 Service

我们希望 Controller 层主要负责解析用户输入和发送 HTTP 响应，业务逻辑则应该抽象到 Service 层。Service 不仅提高了代码的复用性，还可以让业务逻辑更容易被测试。

在 Controller 中，你可以调用任何一个 Service 上的任何方法。Service 是懒加载的，只有当访问到它时，框架才会去实例化它。

```javascript
class PostController extends Controller {
  async create() {
    const ctx = this.ctx;
    const author = ctx.session.userId;
    const req = Object.assign(ctx.request.body, { author });
    // 调用 Service 进行业务处理
    const res = await ctx.service.post.create(req);
    // 设置响应内容和状态码
    ctx.body = { id: res.id };
    ctx.status = 201;
  }
}
```

Service 的具体写法可以参考 [Service](./service.md) 章节。

## 发送 HTTP 响应

业务逻辑处理完成后，Controller 的最后一个职责是将结果通过 HTTP 响应发送给用户。

### 设置 status

HTTP 定义了丰富的[状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，每个状态码都有其特定含义。通过设置合适的状态码，可以使响应更具语义性。

框架提供了一个便捷的 Setter 来设置状态码：

```javascript
class PostController extends Controller {
  async create() {
    // 设置状态码为 201
    this.ctx.status = 201;
  }
}
```

具体应使用哪个状态码，可以参考 [HTTP 状态码列表](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)。

### 设置 body

大多数情况下，数据是通过响应体（body）发送给用户的。响应体的 `Content-Type` 应该明确指定，以告知客户端如何解析数据。

- RESTful API 接口通常返回 `application/json` 格式的 JSON 字符串。
- HTML 页面请求通常返回 `text/html` 格式的 HTML 代码。

**注意：`ctx.body` 是 `ctx.response.body` 的简写，不要与 `ctx.request.body` 混淆。**

```javascript
class ViewController extends Controller {
  async show() {
    this.ctx.body = {
      name: 'egg',
      category: 'framework',
      language: 'Node.js',
    };
  }

  async page() {
    this.ctx.body = '<html><h1>Hello</h1></html>';
  }
}
```

Node.js 的流式处理特性使得我们有时需要通过 Stream 返回响应，例如返回大文件或代理服务器直接返回上游内容。框架支持将 body 设置为一个 Stream，并会处理好 Stream 上的错误事件。

```javascript
class ProxyController extends Controller {
  async proxy() {
    const ctx = this.ctx;
    const result = await ctx.curl(url, { streaming: true });
    ctx.set(result.header);
    // result.res 是一个 stream
    ctx.body = result.res;
  }
}
```

#### 渲染模板

通常，我们不会手写 HTML 页面，而是通过模板引擎生成。框架没有集成特定的模板引擎，但约定了 [View 插件规范](../advanced/view-plugin.md)。通过接入的模板引擎，可以直接使用 `ctx.render(template)` 渲染模板生成 HTML。

```javascript
class HomeController extends Controller {
  async index() {
    const ctx = this.ctx;
    await ctx.render('home.tpl', { name: 'egg' });
    // ctx.body = await ctx.renderString('hi, {{ name }}', { name: 'egg' });
  }
}
```

更多示例可参考[模板渲染](../core/view.md)。

#### JSONP

在某些场合，我们需要向非同源的页面提供接口服务。由于历史原因，我们可能无法使用 [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) 实现跨域资源共享，这时可以使用 [JSONP](https://en.wikipedia.org/wiki/JSONP) 来响应请求。

由于 JSONP 存在潜在的安全风险，框架提供了安全的 JSONP 支持，封装了 [JSONP XSS 相关的安全防范](../core/security.md#jsonp-xss)，并支持进行 CSRF 校验和 referrer 校验。

- 使用 `app.jsonp()` 提供的中间件，可以让 controller 支持响应 JSONP 格式的数据。在路由中，我们给需要支持 JSONP 的路由加上这个中间件：

```javascript
// app/router.js
module.exports = (app) => {
  const jsonp = app.jsonp();
  app.router.get('/api/posts/:id', jsonp, app.controller.posts.show);
  app.router.get('/api/posts', jsonp, app.controller.posts.list);
};
```

- 在 Controller 中，只需要正常编写逻辑即可：

```javascript
// app/controller/posts.js
class PostController extends Controller {
  async show() {
    this.ctx.body = {
      name: 'egg',
      category: 'framework',
      language: 'Node.js',
    };
  }
}
```

如果请求的 query 中包含 `_callback=fn` 参数，将返回 JSONP 格式的数据；否则返回 JSON 格式的数据。

##### JSONP 配置

框架默认使用 `_callback` 作为 JSONP 请求的回调函数名称。`_callback` 函数名的长度最多允许 50 个字符。应用可以在 `config/config.default.js` 中全局覆盖默认配置：

```javascript
// config/config.default.js
exports.jsonp = {
  callback: 'callback', // 通过 query 中的 `callback` 参数识别 JSONP 请求
  limit: 100, // 函数名最长为 100 个字符
};
```

也可以在创建中间件时覆盖配置，以实现不同路由使用不同配置：

```javascript
// app/router.js
module.exports = (app) => {
  const { router, controller, jsonp } = app;
  router.get(
    '/api/posts/:id',
    jsonp({ callback: 'callback' }),
    controller.posts.show,
  );
  router.get('/api/posts', jsonp({ callback: 'cb' }), controller.posts.list);
};
```

##### 跨站防御配置

默认情况下，响应 JSONP 时不会进行跨站攻击防范。如果 JSONP 接口提供敏感数据或修改数据库，可能存在安全风险。因此，框架提供了 CSRF 校验和 referrer 校验的配置。

###### CSRF

在 JSONP 配置中，开启 `csrf: true` 即可为 JSONP 接口启用 CSRF 校验。

```javascript
// config/config.default.js
module.exports = {
  jsonp: {
    csrf: true,
  },
};
```

**注意：CSRF 校验依赖于 [security](../core/security.md) 插件提供的基于 Cookie 的 CSRF 校验。**

开启 CSRF 校验后，客户端在发起 JSONP 请求时，也需要携带 CSRF token。如果请求方页面与服务同域，可以读取 Cookie 中的 CSRF token，并在请求时带上该 token。

###### referrer 校验

如果想对其他域名的网页提供 JSONP 服务，可以通过配置 referrer 白名单来限制请求来源。

```javascript
// config/config.default.js
exports.jsonp = {
  whiteList: /^https?:\/\/test.com\//,
  // whiteList: '.test.com',
  // whiteList: 'sub.test.com',
  // whiteList: [ 'sub.test.com', 'sub2.test.com' ],
};
```

`whiteList` 可配置为正则表达式、字符串或数组：

- 正则表达式：只有请求的 Referrer 匹配该正则时，才允许访问 JSONP 接口。

- 字符串：以 `.` 开头的字符串（如 `.test.com`）表示允许 `test.com` 及其所有子域名的请求。不以 `.` 开头的字符串（如 `sub.test.com`）表示只允许特定域名的请求。

- 数组：只要满足数组中任一元素的条件，即可通过 referrer 校验。

**当 CSRF 和 referrer 校验同时开启时，只需满足其中一个条件即可通过 JSONP 的安全校验。**


### 设置 Header

除了通过状态码和响应体（body）传递信息外，我们还可以通过响应头（Header）设置一些扩展信息。

使用 `ctx.set(key, value)` 方法可以设置一个响应头，或使用 `ctx.set(headers)` 设置多个响应头。

```javascript
// app/controller/api.js
class ProxyController extends Controller {
  async show() {
    const ctx = this.ctx;
    const start = Date.now();
    ctx.body = await ctx.service.post.get();
    const used = Date.now() - start;
    // 设置一个响应头
    ctx.set('show-response-time', used.toString());
  }
}
```

### 重定向

框架提供了安全的重定向方法，覆盖了 koa 原生的 `ctx.redirect` 实现，以确保只能重定向到配置的白名单域名内。

- `ctx.redirect(url)`：如果不在配置的白名单域名内，则禁止跳转。
- `ctx.unsafeRedirect(url)`：不判断域名，直接跳转，一般不建议使用，除非明确了解可能带来的风险。

使用 `ctx.redirect` 方法时，需要在应用的配置文件中进行如下配置：

```javascript
// config/config.default.js
exports.security = {
  domainWhiteList: ['.domain.com'], // 安全白名单，以 . 开头
};
```

如果没有配置 `domainWhiteList` 或者 `domainWhiteList` 数组为空，则默认允许所有跳转，等同于 `ctx.unsafeRedirect(url)`。

