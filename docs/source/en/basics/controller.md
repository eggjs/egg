title: controller
---

## What is Controller

[The previous chapter](./router.md) says router is mainly used to describe the relationship between the request URL and the Controller that processes the request eventually, so what is a Controller used for?

Simply speaking, a Controller is used for **parsing user input and send back the relative result after processing**, for example:

- In [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) interfaces, Controller accepts parameters from users and sends selected results back to user or modifies data in the database.
- In HTTP page requests, Controller renders related templates to HTML according to different URLs requested then send back to users.
- In proxy servers, Controller transfers user queries to other servers and send back process results to users in return.

The framework recommends the Controller layer is responsible for processing request parameters(verification and transformation) from user requests, then calls related business methods in [Service](./service.md), encapsulates and send back business result:

1. retrieves parameters passed by HTTP.
1. verifies and assembles parameters.
1. calls the Service to handle business, if necessary, transforms Service process results to satisfy user's requirement.
1. sends results back to user by HTTP.

## How To Write Controller

All Controller files must be put under `app/controller` directory. Controllers can be written in various patterns depending on various project scenarios and develop styles.

### Controller Class(Recommended)

You can write a Controller by defining a Controller class:

```js
// app/controller/post.js
const Controller = require('egg').Controller;
class PostController extends Controller {
  async create() {
    const { ctx, service } = this;
    const createRule = {
      title: { type: 'string' },
      content: { type: 'string' },
    };
    // verify parameters
    ctx.validate(createRule);
    // assemble parameters
    const author = ctx.session.userId;
    const req = Object.assign(ctx.request.body, { author });
    // calls Service to handle business
    const res = await service.post.create(req);
    // set response content and status code
    ctx.body = { id: res.id };
    ctx.status = 201;
  }
}
module.exports = PostController;
```

We've defined a `PostController` class above and every method of this Controller can be used in Router.

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.post('createPost', '/api/posts', controller.post.create);
}
```

Multi-level directory is supported, for example, put the above code into `app/controller/sub/post.js`, then we could mount it by:

```js
// app/router.js
module.exports = app => {
  app.router.post('createPost', '/api/posts', app.controller.sub.post.create);
}
```

The defined Controller class initializes a new object for every request accessing the server, and, for the example above, several attributes are attached to `this` since the Controller class inherits `egg.Controller`.

- `this.ctx`: the instance of [Context](./extend.md#context) for current request, through which we can access many attributes and methods, encapsulated by the framework, of current request conveniently.
- `this.app`: the instance of [Application](./extend.md#application) for current request, through which we can access global objects and methods provided by the framework.
- `this.service`: [Service](./service.md) defined by the application, through which we can access the abstract business layer, equivalent to `this.ctx.service`.
- `this.config`: the application's run-time [config](./config.md).
- `this.logger`：logger with `debug`，`info`，`warn`，`error`, use to print different level log, almost the same as [context logger](../core/logger.md#context-logger), but it will append Controller file path for quickly track.

#### Customized Controller Base Class

Defining a Controller class helps us not only abstract the Controller layer codes better(e.g. universal routines can be abstracted as private) but also encapsulate methods that are widely used in the application by defining a customized Controller base class.

```js
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

Now we can use base class' methods by extends from `BaseController`:

```js
//app/controller/post.js
const Controller = require('../core/base_controller');
class PostController extends Controller {
  async list() {
    const posts = await this.service.listByUser(this.user);
    this.success(posts);
  }
}
```

### Methods Style Controller (not recommend, only for compatbility)

Every Controller is an async function, whose argument is the instance of the request [Context](./extend.md#context) through which we can access many attributes and methods, encapsulated by the framework, of current request conveniently.

For example, when we define a Controller relative to `POST /api/posts`, we create a `post.js` file under `app/controller` directory.

```js
// app/controller/post.js
exports.create = async ctx => {
  const createRule = {
    title: { type: 'string' },
    content: { type: 'string' },
  };
  // verify parameters
  ctx.validate(createRule);
  // assemble parameters
  const author = ctx.session.userId;
  const req = Object.assign(ctx.request.body, { author });
  // calls Service to handle business
  const res = await ctx.service.post.create(req);
  // set response content and status code
  ctx.body = { id: res.id };
  ctx.status = 201;
};
```

In the above example, we introduce some new concepts, however it's still intuitional and understandable. We'll explain these new concepts in detail soon.

## HTTP Basics

Since Controller is probably the only place to interact with HTTP protocol when developing business logics, it's necessary to have a quick look at how HTTP protocol works before going on.

If we send a HTTP request to access the previous example Controller:

```
curl -X POST http://localhost:3000/api/posts --data '{"title":"controller", "content": "what is controller"}' --header 'Content-Type:application/json; charset=UTF-8'
```

The HTTP request sent by curl looks like this:

```
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json; charset=UTF-8

{"title": "controller", "content": "what is controller"}
```

The 1st line of the request contains 3 information, first 2 of which are commonly used:

- method: it's `POST` in this example.
- path: it's `/api/posts`, the query, if any, is placed here too.

From the 2nd line to the place where the 1st empty line appears is the Header part of the request and many useful attributes are here including, as you may see, Host, Content-Type and `Cookie`, `User-Agent`, etc. 2 headers in this request:

- `Host`: when we send a request in the browser, the domain is resolved to server IP by DNS and, as well, the domain and port are send to the server in the Host header by the browser.
- `Content-Type`: when we have a body in our request, the Content-Type is provided to describe the type of our request body.

The whole following content is the request body, which can be set by POST, PUT, DELETE, etc. methods and the server resolves the request body according to Content-Type.

When the sever finishes to process the request, a HTTP response is send back to the client:

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 8
Date: Mon, 09 Jan 2017 08:40:28 GMT
Connection: keep-alive

{"id": 1}
```

The 1st line contains 3 segments, among which the [status code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes) is used mostly, in this case, it's 201 which means the server has created a resource successfully.

Similar to the request, the header part begins at the 2nd line and end at the place where the 1st empty line appears, in this case, they are Content-Type and Content-Length indicating the response format is JSON and the length is 8 bytes.

The remaining part is the actual content of this response.

## Acquire HTTP Request Parameters

It can be seen from the above HTTP request examples that there are many places can be used to put user request data. The framework, binding the Context instance to Controllers, provides many convenient methods and attributes to acquire parameters sent by users through HTTP request.

### query

Usually the Query String, string following `?` in the URL, is used to send parameters by request of GET type. For example, `category=egg&language=node` in `GET /posts?category=egg&language=node` is parameter that user sends. We can acquire this parsed parameter body through `ctx.query`:

```js
class PostController extends Controller {
  async listPosts() {
    const query = this.ctx.query;
    // {
    //   category: 'egg',
    //   language: 'node',
    // }
  }
}
```

If duplicated keys exists in Query String, only the 1st value of this key is used by `ctx.query` and all other values it appear later will be omitted. That is to say, for request `GET /posts?category=egg&category=koa`, what `ctx.query` acquires is `{ category: 'egg' }`.

This is for unity reason, since, by design, we usually do not let users pass parameters with same keys in Query String then we write codes like below:

```js
const key = ctx.query.key || '';
if (key.startsWith('egg')) {
  // do something
}
```

Or if someone passes parameters with same keys in Query String on purpose, system error may be thrown. To avoid this, the framework guarantee the parameter be of string type whenever it is acquired from `ctx.query`.

#### queries

Sometimes our system is designed to accept same keys sent by users, like `GET /posts?category=egg&id=1&id=2&id=3`. For this situation, the framework provides `ctx.queries` object that parses Query String and put duplicated data into an array:

```js
// GET /posts?category=egg&id=1&id=2&id=3
class PostController extends Controller {
  async listPosts() {
    console.log(this.ctx.queries);
    // {
    //   category: [ 'egg' ],
    //   id: [ '1', '2', '3' ],
    // }
  }
}
```

The value type for keys in `ctx.queries` is array for sure if any.

### Router params

In [Router](./router.md) part, we say Router is allowed to declare parameters which can be acquired by `ctx.params`.

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

### body

Although we can pass parameters through URL, but constraints exist:

- [the browser limits the maximum length of a URL](http://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers), so parameters cannot be passed that many.
- the server records the full request URL to log files so it is not safe to pass sensitive data through URL.

In the above HTTP request message example, we can learn, following the header, there's a body part that can be used to put parameters for POST, PUT and DELETE, etc. The `Content-Type` is to be sent by clients(browser) in the same time indicating the type of request body. Two mostly used data format are JSON and Form in Web developing for transferring data.

The [bodyParser](https://github.com/koajs/bodyparser) middleware is built in by the framework to parse these 2 kinds of request to be an object mounting to `ctx.request.body`. Since it's not recommended by the HTTP protocol to pass a body by GET and HEAD methods, `ctx.request.body` cannot be used for GET and HEAD methods.

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

The framework configures the bodyParser using default parameters and features below are available out of the box:

- when Content-Type is `application/json`, `application/json-patch+json`, `application/vnd.api+json` and `application/csp-report`, it parses the request body as JSON format and limits the maximum length of the body down to `100kb`.
- when Content-Type is `application/x-www-form-urlencoded`, it parses the request body as Form format and limits the maximum length of the body down to `100kb`.
- when parses successfully, the body must be an Object(also can be an array).

The mostly adjusted config field is the maximum length of the request body for parsing which can be configured in `config/config.default.js` to overwrite the default value of the framework:

```js
module.exports = {
  bodyParser: {
    jsonLimit: '1mb',
    formLimit: '1mb',
  },
};
```
If user request exceeds the maximum length for parsing that we configured, the framework will throw an exception whose status code is `413`; if request body failed to be parsed(e.g. malformed JSON), an exception with status code `400` will be thrown.

**Note: when adjusting the maximum length of the body for bodyParser, the reverse proxy, if any in front of our application, should be adjusted as well to support the newly configured length of the body.**

**A common mistake is to confuse `ctx.request.body` and `ctx.body`(which is alias for `ctx.response.body`).**

### Acquire Uploaded Files

Files, too, can be sent by the request body besides parameters, and browsers usually send file in `multipart/form-data` type. The uploaded files can be acquired by the framework built-in plugin [Multipart](https://github.com/eggjs/egg-multipart).

For full example, see [eggjs/examples/multipart](https://github.com/eggjs/examples/tree/master/multipart).

In Controller, we can acquire the file stream of the uploaded file through interface `ctx.getFileStream()`.

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
const Controller = require('egg').Controller;

class UploaderController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const stream = await ctx.getFileStream();
    const name = 'egg-multipart-test/' + path.basename(stream.filename);
    // file processing, e.g. uploading to the cloud storage etc.
    let result;
    try {
      result = await ctx.oss.put(name, stream);
    } catch (err) {
      // must consume the file stream, or the browser will get stuck
      await sendToWormhole(stream);
      throw err;
    }

    ctx.body = {
      url: result.url,
      // all form fields can be acquired by `stream.fields`
      fields: stream.fields,
    };
  }
};

module.exports = UploaderController;
```

To acquire user uploaded files conveniently by `ctx.getFileStream`, 2 conditions must be matched:

- only one file can be uploaded in the same time.
- file uploading must appear after other fields, otherwise we may can't access fields when we got file stream.

If more than 1 file are to be uploaded, `ctx.getFileStream()` is no longer the way but the following:

```js
const sendToWormhole = require('stream-wormhole');
const Controller = require('egg').Controller;

class UploaderController extends Controller {
  async upload() {
    const ctx = this.ctx;
    const parts = ctx.multipart();
    let part;
    // parts() return a promise
    while ((part = await parts()) != null) {
      if (part.length) {
        // it is field in case of arrays
        console.log('field: ' + part[0]);
        console.log('value: ' + part[1]);
        console.log('valueTruncated: ' + part[2]);
        console.log('fieldnameTruncated: ' + part[3]);
      } else {
        if (!part.filename) {
          // it occurs when user selects no file then click to upload(part represents file, while part.filename is empty)
          // more process should be taken, like giving an error message
          return;
        }
        // part represents the file stream uploaded
        console.log('field: ' + part.fieldname);
        console.log('filename: ' + part.filename);
        console.log('encoding: ' + part.encoding);
        console.log('mime: ' + part.mime);
        // file processing, e.g. uploading to the cloud storage etc.
        let result;
        try {
          result = await ctx.oss.put('egg-multipart-test/' + part.filename, part);
        } catch (err) {
          // must consume the file stream, or the browser will get stuck
          await sendToWormhole(part);
          throw err;
        }
        console.log(result);
      }
    }
    console.log('and we are done parsing the form!');
  }
};

module.exports = UploaderController;
```

To ensure the security of uploading files, the framework limits supported file formats and the whitelist supported by default is below:

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

New file extensions can be add by configuring the `config/config.default.js` file or rewriting the whole whitelist.

- add new file extensions

```js
module.exports = {
  multipart: {
    fileExtensions: [ '.apk' ], // supports .apk file extention
  },
};
```

- overwrite the whole whitelist

```js
module.exports = {
  multipart: {
    whitelist: [ '.png' ], // overwrite the whole whitelist, only '.png' is allowed to be uploaded
  },
};
```

**Note: when the whitelist attribute is used, the fileExtensions attribute will be discarded.**

### header

Apart from URL and request body, some parameters can be sent by request header. The framework provides some helper attributes and methods to retrieve them.

- `ctx.headers`, `ctx.header`, `ctx.request.headers`, `ctx.request.header`: these methods are equivalent and all of them get the whole header object.
- `ctx.get(name)`, `ctx.request.get(name)`: get the value of one parameter from the request header, if the parameter does not exist, an empty string is returned.
- We recommend you use `ctx.get(name)` rather than `ctx.headers['name']` because the former handles upper/lower case automatically.

Since header is special, some of which are given specific meanings by the `HTTP` protocol (like `Content-Type`, `Accept`), some are set by the reverse proxy as a convention (X-Forwarded-For), and the framework provides some convenient getters for them as well, for more details please refer to [API](https://eggjs.org/api/).

Specially when we set `config.proxy = true` to deploy the application behind the reverse proxy (Nginx), some Getters' internal process may be changed.

#### `ctx.host`

Reads the header's value configured by `config.hostHeaders` firstly, if fails, then it tries to get the value of host header, if fails again, it returns an empty string.

`config.hostHeaders` defaults to `x-forwarded-host`.

#### `ctx.protocol`

When you get protocol through this Getter, it checks whether current connection is an encrypted one or not, if it is, it returns HTTPS.

When current connection is not an encrypted one, it reads the header's value configured by `config.protocolHeaders` to check HTTP or HTTPS, if it fails, we can set a safe-value(defaults to HTTP) through `config.protocol` in the configuration.

`config.protocolHeaders` defaults to `x-forwarded-proto`.

#### `ctx.ips`

A IP address list of all intermediate equipments that a request go through can be get by `ctx.ips`, only when `config.proxy = true`, it reads the header's value configured by `config.ipHeaders` instead, if fails, it returns an empty array.

`config.ipHeaders` defaults to `x-forwarded-for`.

#### `ctx.ip`

The IP address of the sender of the request can be get by `ctx.ip`, it reads from `ctx.ips` firstly, if `ctx.ips` is empty, it returns the connection sender's IP address.

**Note: `ip` and `ips` are different, if `config.proxy = false`, `ip` returns the connection sender's IP address while `ips` returns an empty array.**

### Cookie

All HTTP requests are stateless but, on the contrary, our Web applications usually need to know who sends the requests. To make it through, the HTTP protocol designs a special request header: [Cookie](https://en.wikipedia.org/wiki/HTTP_cookie). With the response header (set-cookie), the server is able to send a few data to the client, the browser saves these data according to the protocol and brings them along with the next request(according to the protocol and for safety reasons, only when accessing websites that match the rules specified by Cookie does the browser bring related Cookies).

Through `ctx.cookies`, we can conveniently and safely set and get Cookie in Controller.

```js
class CookieController extends Controller {
  async add() {
    const ctx = this.ctx;
    const count = ctx.cookies.get('count');
    count = count ? Number(count) : 0;
    ctx.cookies.set('count', ++count);
    ctx.body = count;
  }

  async remove() {
    const ctx = this.ctx;
    const count = ctx.cookies.set('count', null);
    ctx.status = 204;
  }
}
```

Although Cookie is only a header in HTTP, multiple key-value pairs can be set in the format of `foo=bar;foo1=bar1;`.

In Web applications, Cookie is usually used to send the identity information of the client, so it has many safety related configurations which can not be ignored, [Cookie](../core/cookie-and-session.md#cookie) explains the usage and safety related configurations of Cookie in detail and is worth being read in depth.

### Session

By using Cookie, we can create an individual Session specific to every user to store user identity information related data which is encrypted then stored in Cookie to perform session persistence across requests.

The framework builds in [Session](https://github.com/eggjs/egg-session) plugin, which provides `ctx.session` for us to get or set current user's Session.

```js
class PostController extends Controller {
  async fetchPosts() {
    const ctx = this.ctx;
    // get data from Session
    const userId = ctx.session.userId;
    const posts = await ctx.service.post.fetch(userId);
    // set value to Session
    ctx.session.visited = ctx.session.visited ? ctx.session.visited++ : 1;
    ctx.body = {
      success: true,
      posts,
    };
  }
}
```

It's quite intuition to use Session, just get or set directly, and if set it to `null`, it is deleted.

```js
class SessionController extends Controller {
  async deleteSession() {
    this.ctx.session = null;
  }
};
```

Like Cookie, Session has many safety related configurations and functions etc., so it's better to read [Session](../core/cookie-and-session.md#session) in depth in ahead.

#### Configuration

There mainly are these attributes below can be used to configure Session in `config.default.js`:

```js
module.exports = {
  key: 'EGG_SESS', // the name of key-value pairs, which is specially used by Cookie to store Session
  maxAge: 86400000, // Session maximum valid time
};
```

## Parameter Validation

After getting parameters from user requests, in most cases, it is a must to validate these parameters.

With the help of the convenient parameter validation mechanism provided by [Validate](https://github.com/eggjs/egg-validate) plugin, with which we can do all kinds of complex parameter validations.

```js
// config/plugin.js
exports.validate = {
  enable: true,
  package: 'egg-validate',
};
```

Validate parameters directly through `ctx.validate(rule, [body])`:

```js
class PostController extends Controller {
  async create() {
    // validate parameters
    // if the second parameter is absent, `ctx.request.body` is validated automatically
    this.ctx.validate({
      title: { type: 'string' },
      content: { type: 'string' },
    });
  }
}
```

When the validation fails, an exception will be thrown immediately with an error code of 422 and an errors field containing the detailed information why it fails. You can capture this exception through `try catch` and handle it all by yourself.

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
};
```

### Validation Rules

The parameter validation is done by [Parameter](https://github.com/node-modules/parameter#rule), and all supported validation rules can be found in its document.

#### Customizing validation rules

In addition to built-in validation types introduced in the previous section, sometimes we hope to customize several validation rules to make the development more convenient and now customized rules can be added through `app.validator.addRule(type, check)`.

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

After adding the customized rule, it can be used immediately in Controller to do parameter validation.

```js
class PostController extends Controller {
  async handler() {
    const ctx = this.ctx;
    // query.test field must be a json string
    const rule = { test: 'json' };
    ctx.validate(rule, ctx.query);
  }
}
```

## Using Service

We do not prefer to implement too many business logics in Controller, so a [Service](./service.md) layer is provided to encapsulate business logics, which not only increases the reusability of codes but also makes it easy for us to test our business logics.

In Controller, any method of any Service can be called and, in the meanwhile, Service is lazy loaded which means it is initialized by the framework on the first time it is accessed.

```js
class PostController extends Controller {
  async create() {
    const ctx = this.ctx;
    const author = ctx.session.userId;
    const req = Object.assign(ctx.request.body, { author });
    // using service to handle business logics
    const res = await ctx.service.post.create(req);
    ctx.body = { id: res.id };
    ctx.status = 201;
  }
};
```

To write a Service in detail, please refer to [Service](./service.md).

## Sending HTTP Response

After business logics are handled, the last thing Controller should do is to send the processing result to users with an HTTP response.

### Setting Status

HTTP designs many [Status Code](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes), each of which indicates a specific meaning, and setting the status code correctly makes the response more semantic.

The framework provides a convenient Setter to set the status code:

```js
class PostController extends Controller {
  async create() {
    // set status code to 201
    this.ctx.status = 201;
  }
}
```

As to which status code should be used for a specific case, please refer to status code meanings on [List of HTTP status codes](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)

### Setting Body

Most data is sent to receivers through the body and, just like the body in the request, the body sent by the response demands a set of corresponding Content-Type to inform clients how to parse data.

- for a RESTful API controller, we usually send a body whose Content-Type is `application/json`, indicating it's a JSON string.
- for a HTML page controller, we usually send a body whose Content-Type is `text/html`, indicating it's a piece of HTML code.

**Note: `ctx.body` is alias of `ctx.response.body`, don't confuse with `ctx.request.body`.**

```js
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

Due to the Stream feature of Node.js, we need to send the response by Stream in some cases, e.g., sending a big file, the proxy server returns content from upstream straightforward, the framework, too, endorses setting the body to be a Stream directly and it handles error events on this stream well in the meanwhile.

```js
class ProxyController extends Controller {
  async proxy() {
    const ctx = this.ctx;
    const result = await ctx.curl(url, {
      streaming: true,
    });
    ctx.set(result.header);
    // result.res is stream
    ctx.body = result.res;
  }
}
```

#### Rendering Template

Usually we do not write HTML pages by hand, instead we generate them by a template engine.
Egg itself does not integrate any template engine, but it establishes the [View Plugin Specification](../advanced/view-plugin.md). Once the template engine is loaded, `ctx.render(template)` can be used to render templates to HTML directly.

```js
class HomeController extends Controller {
  async index() {
    const ctx = this.ctx;
    await ctx.render('home.tpl', { name: 'egg' });
    // ctx.body = await ctx.renderString('hi, {{ name }}', { name: 'egg' });
  }
};
```

For detailed examples, please refer to [Template Rendering](../core/view.md).

#### JSONP

Sometimes we need to provide API services for pages in a different domain, and, for historical reasons, [CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Access_control_CORS) fails to make it through, while [JSONP](https://en.wikipedia.org/wiki/JSONP) does.

Since misuse of JSONP leads to dozens of security issues, the framework supplies a convenient way to respond JSONP data, encapsulating [JSONP XSS Related Security Precautions](../core/security.md#jsonp-xss), supporting the validation of CSRF and referrer.

- `app.jsonp()` provides a middleware for the controller to respond JSONP data. We may add this middleware for controllers demanding for JSONP supporting in the router:

```js
// app/router.js
module.exports = app => {
  const jsonp = app.jsonp();
  app.router.get('/api/posts/:id', jsonp, app.controller.posts.show);
  app.router.get('/api/posts', jsonp, app.controller.posts.list);
};
```

- We just program as usual in the Controller:

```js
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

When user requests access this controller through a corresponding URL, if the query contains the `_callback=fn` parameter, data is returned in JSONP format, otherwise in JSON format.

##### JSONP Configuration

By default, the framework determines whether to return data in JSONP format or not depending on the `_callback` parameter in the query, and the method name set by `_callback` must be less than 50 characters. Applications may overwrite the default configuration globally in `config/config.default.js`:

```js
// config/config.default.js
exports.jsonp = {
  callback: 'callback', // inspecting the `callback` parameter in the query
  limit: 100, // the maximum size of the method name is 100 characters
};
```

With the configuration above, if a user requests `/api/posts/1?callback=fn`, a JSONP format response is sent, if `/api/posts/1`, a JSON format response is sent.

Also we can overwrite the default configuration in `app.jsonp()` when creating the middleware and therefore separate configurations is used for separate routers:

```js
// app/router.js
module.exports = app => {
  const { router, controller, jsonp } = app;
  router.get('/api/posts/:id', jsonp({ callback: 'callback' }), controller.posts.show);
  router.get('/api/posts', jsonp({ callback: 'cb' }), controller.posts.list);
};
```

#### XSS Defense Configuration

By default, XSS is not defended when responding JSONP, and, in some cases, it is quite dangerous. We classify JSONP APIs into three type grossly:

1. querying non-sensitive data, e.g. getting the public post list of a BBS.
2. querying sensitive data, e.g. getting the transaction record of a user.
3. submitting data and modifying the database, e.g. create a new order for a user.

If our JSONP API provides the last two type services and, without any XSS defense, user sensitive data may be leaked and even user may be phished. Given this, the framework supports the validations of CSRF and referrer by default.

##### CSRF

In the JSONP configuration, we could enable the CSRF validation for JSONP APIs simply by setting `csrf: true`.

```js
// config/config.default.js
module.exports = {
  jsonp: {
    csrf: true,
  },
};
```

**Note: the CSRF validation depends on the Cookie based CSRF validation provided by [security](../core/security.md).**

When the CSRF validation is enabled, the client should bring CSRF token as well when it sends a JSONP request, if the page where the JSONP sender belongs to shares the same domain with our services, CSRF token in Cookie can be read(CSRF can be set manually if it is absent), and is brought together with the request.

##### referrer Validation

The CSRF way can be used for JSONP request validation only if the main domains are the same, while providing JSONP services for pages in different domains, we can limit JSONP senders into a controllable rang by configuring the referrer whitelist.

```js
//config/config.default.js
exports.jsonp = {
  whiteList: /^https?:\/\/test.com\//,
  // whiteList: '.test.com',
  // whiteList: 'sub.test.com',
  // whiteList: [ 'sub.test.com', 'sub2.test.com' ],
};
```
`whileList` can be configured as regular expression, string and array:

- Regular Expression: only requests whose Referrer match the regular expression are allow to access the JSONP API. When composing the regular expression, please also notice the leading `^` and tail `\/` which guarantees the whole domain matches.

```js
exports.jsonp = {
  whiteList: /^https?:\/\/test.com\//,
};
// matches referrer:
// https://test.com/hello
// http://test.com/
```

- String: two cases exists when configuring the whitelist as a string, if the string begins with a `.`, e.g. `.test.com`, the referrer whitelist indicates all sub-domains of `test.com`, `test.com` itself included. if the string does not begin with a `.`, e.g. `sub.test.com`, it indicates `sub.test.com` one domain only. (both HTTP and HTTPS are supported)

```js
exports.jsonp = {
  whiteList: '.test.com',
};
// matches domain test.com:
// https://test.com/hello
// http://test.com/

// matches subdomain
// https://sub.test.com/hello
// http://sub.sub.test.com/

exports.jsonp = {
  whiteList: 'sub.test.com',
};
// only matches domain sub.test.com:
// https://sub.test.com/hello
// http://sub.test.com/
```

- Array: when the whitelist is configured as an array, the referrer validation is passed only if at least one condition represented by array items is matched.

```js
exports.jsonp = {
  whiteList: [ 'sub.test.com', 'sub2.test.com' ],
};
// matches domain sub.test.com and sub2.test.com:
// https://sub.test.com/hello
// http://sub2.test.com/
```

**If both CSRF and referrer validation are enabled, the request sender passes any one of them passes the JSONP security validation.**

### Setting Header

We identify the request success or not, in which state by the status code and set response content in the body. By setting the response header, extended information can be set as well.

`ctx.set(key, value)` sets one response header and `ctx.set(headers)` sets many in one time.

```js
// app/controller/api.js
class ProxyController extends Controller {
  async show() {
    const ctx = this.ctx;
    const start = Date.now();
    ctx.body = await ctx.service.post.get();
    const used = Date.now() - start;
    // set one response header
    ctx.set('show-response-time', used.toString());
  }
}
```
