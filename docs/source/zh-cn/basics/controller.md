title: Controller
---

# Controller

## 什么是 Controller

前面章节写到，我们通过 router 将用户的请求基于 method 和 url 分发到了对应的 controller 上，那 controller 负责做什么？

简单的说 controller 负责**解析用户的输入，处理后返回相应的结果**，例如

- 在 [RESTful](https://en.wikipedia.org/wiki/Representational_state_transfer) 接口中，controller 接受用户的参数，从数据库中查找内容返回给用户或者将用户的请求更新到数据库中。
- 在 html 页面请求中，controller 根据用户访问不同的 url，渲染不同的模板得到 html 返回给用户。
- 在代理服务器中，controller 将用户的请求转发到其他服务器上，并将其他服务器的返回响应给用户。

框架推荐 controller 层主要处理用户请求参数（校验、转换），调用对应的 [service](./service.md) 方法处理业务，并封装业务返回结果。

1. 获取用户通过 http 传递过来的请求参数。
1. 校验、组装参数。
1. 调用 service 进行业务处理，必要时处理转换 service 的返回，让它适应用户的需要。
1. 通过 http 将结果响应给用户。

## 如何编写 controller

所有的 controller 都必须放置于 `app/controller` 目录下，每一个 controller 都是一个 generator function，它的 `this` 都被绑定成了 [Context](./extend.md#context) 对象的实例，通过它我们可以拿到框架给我们封装的各种便捷属性和方法。

例如我们写一个对应到 `POST /api/posts` 接口的 controller，我们会在 `app/controller` 目录下创建一个 post.js 文件

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
  const create = Object.assign(this.request.body, { author });
  // 调用 service 进行业务处理
  const res = yield this.service.post.create(author);
  // 设置响应内容和响应状态码
  this.body = { id: res.id };
  this.status = 201;
};
```

在上面的例子中我们引入了许多新的概念，但还是比较直观，容易理解的，我们会在下面对它们进行更详细的介绍。

## http 基础

由于 controller 基本上是业务开发中唯一和 http 协议打交道的地方，在继续往下了解之前，我们首先简单的看一下 http 协议是怎样的。

如果我们发起一个请求请求前面例子中提到的 controller，我们发起的 http 请求的内容就会是下面这样的

```
POST /api/posts HTTP/1.1
Host: localhost:3000
Content-Type: application/json; charset=UTF-8

{"title": "controller", "content": "what is controller"}
```

请求的第一行包含了三个信息，我们比较常用的是前面两个：

- method：这个请求中 method 的值是 `POST`。
- path：值为 `/api/posts`，如果用户的请求中包含 query，也会在这里出现

从第二行开始直到遇到的第一个空行位置，都是请求的 headers 部分，这一部分中有许多常用的属性，包括这里看到的 `Host`，`Content-Type`，还有 `Cookie`，`User-Agent` 等等。在这个请求中有两个头：

- `Host`：我们在浏览器发起请求的时候，域名会用来通过 DNS 解析找到服务的 ip 地址，但是浏览器也会将域名和端口号放在 `Host` 头中一并发送给服务端。
- `Content-Type`：当我们的请求有 body 的时候，都会有 `Content-Type` 来标明我们的请求体是什么格式的。

之后的内容全部都是请求的 body，当请求是 `POST`, `PUT`, `DELETE` 等方法的时候，可以带上请求体，服务端会根据 `Content-Type` 来解析请求体。

在服务端处理完这个请求后，会发送一个 http 响应给客户端

```
HTTP/1.1 201 Created
Content-Type: application/json; charset=utf-8
Content-Length: 8
Date: Mon, 09 Jan 2017 08:40:28 GMT
Connection: keep-alive

{"id": 1}
```

第一行中也包含了三段，其中我们常用的主要是[响应状态码](https://en.wikipedia.org/wiki/List_of_HTTP_status_codes)，这个例子中它的值是 `201`，它的含义是在服务端成功创建了一条资源。

和 http 请求一样，从第二行开始到下一个空行之间都是响应头，这里的 `Content-Type`, `Content-Length` 表示这个响应的格式是 json，长度为 8 个字符。

最后剩下的部分就是这次响应真正的内容。

## 获取 http 请求参数

### query

#### queries

### router param

### body

### 获取上传的文件

### header

### cookie

### session

## 参数校验

## 调用 service

## 发送 http 响应

### 设置 body

### 设置 header
