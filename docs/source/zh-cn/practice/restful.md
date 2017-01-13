title: 实现 RESTful API
---

通过 web 技术开发服务给客户端提供接口，可能是各个 web 框架最广泛的应用之一。这篇文章我们拿 [cnode](https://cnodejs.org/) 社区的接口来看一看通过 egg 如何实现 [RESTful](https://zh.wikipedia.org/wiki/REST) API 给客户端调用。

cnode 社区现在 v1 版本的接口不是完全符合 RESTful 语义，在这篇文章中，我们将基于 cnode V1 的接口，封装一个更符合 RESTful 语义的 V2 版本 API。

## 设计响应格式

在 RESTful 风格的设计中，我们会通过响应状态码来标识响应的状态，保持响应的 body 简洁，只返回接口数据。以 `topic` 资源为例：

### 获取主题列表

- `GET /api/v2/topics`
- 响应状态码：200
- 响应体：

```json
[
  {
    "id": "57ea257b3670ca3f44c5beb6",
    "author_id": "541bf9b9ad60405c1f151a03",
    "tab": "share",
    "content": "content",
    "last_reply_at": "2017-01-11T13:32:25.089Z",
    "good": false,
    "top": true,
    "reply_count": 155,
    "visit_count": 28176,
    "create_at": "2016-09-27T07:53:31.872Z",
  },
  {
    "id": "57ea257b3670ca3f44c5beb6",
    "author_id": "541bf9b9ad60405c1f151a03",
    "tab": "share",
    "content": "content",
    "title": "《一起学 Node.js》彻底重写完毕",
    "last_reply_at": "2017-01-11T10:20:56.496Z",
    "good": false,
    "top": true,
    "reply_count": 193,
    "visit_count": 47633,
  },
]
```

### 获取单个主题

- `GET /api/v2/topics/57ea257b3670ca3f44c5beb6`
- 响应状态码：200
- 响应体：

```json
{
  "id": "57ea257b3670ca3f44c5beb6",
  "author_id": "541bf9b9ad60405c1f151a03",
  "tab": "share",
  "content": "content",
  "title": "《一起学 Node.js》彻底重写完毕",
  "last_reply_at": "2017-01-11T10:20:56.496Z",
  "good": false,
  "top": true,
  "reply_count": 193,
  "visit_count": 47633,
}
```

### 创建主题

- `POST /api/v2/topics`
- 响应状态码：201
- 响应体：

```
{
  "topic_id": "57ea257b3670ca3f44c5beb6"
}
```

### 更新主题

- `PUT /api/v2/topics/57ea257b3670ca3f44c5beb6`
- 响应状态码：204
- 响应体：空

### 错误处理

在接口处理发生错误的时候，如果是客户端请求参数导致的错误，我们会返回 4xx 状态码，如果是服务端自身的处理逻辑错误，我们会返回 5xx 状态码。所有的异常对象都是对这个异常状态的描述，其中 error 字段是错误的描述，detail 字段（可选）是导致错误的详细原因。

例如，当客户端传递的参数异常时，我们可能返回一个响应，状态码为 422，返回响应体为：

```json
{
  "error": "Validation Failed",
  "detail": [ { "message": "required", "field": "title", "code": "missing_field" } ]
}
```

## 实现

在约定好接口之后，我们可以开始动手实现了。

### 初始化项目

还是通过[快速入门](../intro/quickstart.md)章节介绍的 [egg-init](https://github.com/eggjs/egg-init) 工具来初始化我们的应用

```bash
$ egg-init cnode-api --type=empty
$ cd cnode-api
$ npm i
```

### 注册路由

首先，我们先按照前面的设计来注册[路由](../core/router.md)，框架提供了一个便捷的方式来创建 RESTful 风格的路由，并将一个资源的接口映射到对应的 controller 文件。在 `app/router.js` 中：

```js
module.exports = app => {
  app.resources('Topic', '/api/v2/topics', 'topics');
};
```

通过 `app.resources` 方法，我们将 Topic 这个资源的增删改查接口映射到了 `app/controller/topic.js` 文件。

### controller 开发

在 [controller](../core/controller.md) 中，我们只需要实现 `app.resources` 约定的 [RESTful 风格的 URL 定义](../basics/router.md#restful-风格的-url-定义) 中我们需要提供的接口即可。例如我们来实现创建一个 Topic 的接口：

```js
// 定义创建接口的请求参数规则
const createRule = {
  accesstoken: 'string',
  title: 'string',
  tab: { type: 'enum', values: [ 'ask', 'share', 'job' ], required: false },
  content: 'string',
};
exports.create = function* () {
  // 校验 `this.request.body` 是否符合我们预期的格式
  // 如果参数校验未通过，将会抛出一个 status = 422 的异常
  this.validate(createRule);
  // 调用 service 创建一个 topic
  const id = yield this.service.topic.create(this.request.body);
  // 设置响应体和状态码
  this.body = {
    topic_id: id,
  };
  this.status = 201;
};
```

如同注释中说明的，一个 controller 主要实现了下面的逻辑：

1. 调用 validate 方法对请求参数进行验证。
2. 用验证过的参数调用 service 封装的业务逻辑来创建一个 topic。
3. 按照接口约定的格式设置响应状态码和内容。

### service 开发

在 [service](../core/service.md) 中，我们可以更加专注的编写实际生效的业务逻辑。

```js
'use strict';

module.exports = app => {
  class TopicService extends app.Service {
    constructor(ctx) {
      super(ctx);
      this.root = 'https://cnodejs.org/api/v1/topics';
    }

    * create(params) {
      // 调用 cnode V1 版本 API
      const result = yield this.ctx.curl(this.root, {
        method: 'post',
        data: params,
        dataType: 'json',
        contentType: 'json',
      });
      // 检查调用是否成功，如果调用失败会抛出异常
      this.checkSuccess(result);
      // 返回创建的 topic 的 id
      return result.data.topic_id;
    }

    // 封装统一的调用检查函数，可以在查询、创建和更新等 service 中复用
    checkSuccess(result) {
      if (result.status !== 200) {
        const errorMsg = result.data && result.data.error_msg ? result.data.error_msg : 'unknown error';
        this.ctx.throw(result.status, errorMsg);
      }
      if (!result.data.success) {
        // 远程调用返回格式错误
        this.ctx.throw(500, 'remote response error', { data: result.data });
      }
    }
  }

  return TopicService;
};

```

在 创建 topic 的 service 开发完成之后，我们就从上往下的完成了一个接口的开发。

### 统一错误处理

正常的业务逻辑已经正常完成了，但是异常我们还没有进行处理。在前面编写的代码中，controller 和 service 都有可能抛出异常，这也是我们推荐的编码方式，当发现客户端参数传递错误或者调用后端服务异常时，通过抛出异常的方式来进行中断。

- controller 中 `this.validate()` 进行参数校验，失败抛出异常。
- service 中调用 `this.ctx.curl()` 方法访问 cnode 服务，可能由于网络问题等原因抛出服务端异常。
- service 中拿到 cnode 服务端返回的结果后，可能会收到请求调用失败的返回结果，此时也会抛出异常。

框架虽然提供了默认的异常处理，但是可能和我们在前面的接口约定不一致，因此我们需要自己实现一个统一错误处理的中间件来对错误进行处理。

在 `app/middleware` 目录下新建一个 `error_handler.js` 的文件来新建一个 [middleware](../core/middleware.md)

```js
module.exports = () => {
  return function* (next) {
    try {
      yield next;
    } catch (err) {
      // 所有的异常都在 app 上触发一个 error 事件，框架会记录一条错误日志
      this.app.emit('error', err, this);

      const status = err.status || 500;
      // 生产环境时 500 错误的详细错误内容不返回给客户端，因为可能包含敏感信息
      const error = status === 500 && this.app.config.env === 'prod'
        ? 'Internal Server Error'
        : err.message;

      // 从 error 对象上读出各个属性，设置到响应中
      this.body = { error };
      if (status === 422) {
        this.body.detail = err.errors;
      }
      this.status = status;
    }
  };
};
```

通过这个中间件，我们可以捕获所有异常，并按照我们想要的格式封装了响应。将这个中间件通过配置文件(`config/config.default.js`)加载进来：

```js
module.exports = {
  // 加载 errorHandler 中间件
  middleware: [ 'errorHandler' ],
  // 只对 /api 前缀的 url 路径生效
  errorHandler: {
    match: '/api',
  },
};
```

## 测试

写完代码后，还要记得对我们的代码编写[单元测试](../core/unittest.md)哦！具体的代码实现和测试都在 [eggjs/examples/cnode-api](https://github.com/eggjs/examples/tree/master/cnode-api) 中可以找到。
