# HTTPController 开发指南

## 快速开始

### 创建基本 HTTP 接口

使用 `@HTTPController` 和 `@HTTPMethod` 装饰器创建 HTTP 接口：

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg/tegg';

@HTTPController()
export class DemoController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/hello/:name' })
  async hello(@HTTPParam() name: string) {
    return { message: 'hello ' + name };
  }
}
```

### 设置路径前缀

为控制器设置统一路径前缀：

```typescript
@HTTPController({ path: '/api' })
export class PathController {
  // 最终路径: GET /api/hello
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: 'hello' })
  async hello() { }

  // 最终路径: POST /api/create
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: 'create' })
  async create() { }
}
```

---

## 参数装饰器决策

### 决策树：选择合适的参数装饰器

```
需要从 HTTP 请求获取什么信息？

├─ URL 路径参数
│  └─ → @HTTPParam()
│
├─ URL 查询参数
│  ├─ 单个值 → @HTTPQuery()
│  └─ 多个值（数组） → @HTTPQueries()
│
├─ 请求体（POST/PUT）
│  └─ → @HTTPBody()
│     ├─ json → 对象
│     ├─ text → 字符串
│
├─ 请求头
│  └─ → @HTTPHeaders()
│     └─ 注意：key 自动转小写
│
├─ Cookie
│  └─ → @Cookies()
│
├─ 原始 HTTP 请求对象
│  └─ → @Request()
│     └─ 注意：不要和 @HTTPBody 一起消费请求体
│
└─ Egg Context（框架功能）
   └─ → @Context()
```

### 参考对照表（参数装饰器）

| 装饰器 | 获取内容 | 类型 | 默认值 | 支持选项 |
|--------|---------|------|--------|----------|
| `@HTTPParam()` | URL 路径参数 | `string` | 变量名 | `{ name?: string }` |
| `@HTTPQuery()` | 查询参数（单个） | `string` | 变量名 | `{ name?: string }` |
| `@HTTPQueries()` | 查询参数（多个） | `string[]` | 变量名 | `{ name?: string }` |
| `@HTTPBody()` | 请求体 | `object \| string` | - | - |
| `@HTTPHeaders()` | 请求头 | `IncomingHttpHeaders` | - | - |
| `@Cookies()` | Cookie | `HTTPCookies` | - | - |
| `@Request()` | HTTP 请求对象 | `HTTPRequest` | - | - |
| `@Context()` | Egg Context | `EggContext` | - | - |

### 快速选择指南

**需要从 URL 获取参数（id）** → `@HTTPParam`
**需要从查询字符串获取参数（category=books）** → `@HTTPQuery`
**需要从查询字符串获取全部值（tag=tech&tag=dev）** → `@HTTPQueries`
**需要获取请求体（POST JSON）** → `@HTTPBody`
**需要获取请求头字段** → `@HTTPHeaders`（注意：使用小写key）
**需要读取 Cookie** → `@Cookies`
**需要访问原始请求对象** → `@Request`

---

## HTTP 响应

### JSON 响应（默认）

直接返回对象，框架自动序列化为 JSON：

```typescript
@HTTPController({ path: '/api' })
export class JsonController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/data' })
  async getData() {
    return { result: 'hello world' };
  }
}
```

### 自定义响应

```typescript
@HTTPController({ path: '/api' })
export class ResponseController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/custom' })
  async customResponse(@Context() ctx: EggContext) {
    ctx.status = 201;
    ctx.set('X-Custom', 'value');
    ctx.type = 'json';
    return { message: 'Created' };
  }
}
```

---

## 服务端渲染（SSR）

```typescript
@HTTPController({ path: '/' })
export class SSRController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async render(@Context() ctx: EggContext) {
    ctx.type = 'html';
    return `
      <!DOCTYPE html>
      <html>
        <head><title>Home</title></head>
        <body><h1>Hello World</h1></body>
      </html>
    `;
  }
}
```

---

## Server-Sent Events（SSE）

```typescript
import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';

async function* generateHtml() {
  yield '<html><body>';
  for (let i = 1; i <= 5; i++) {
    yield `<p>Chunk ${i}</p>`;
    await setTimeout(1000);
  }
  yield '</body></html>';
}

@HTTPController({ path: '/api' })
export class StreamController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/stream' })
  async streamHtml(@Context() ctx: EggContext) {
    ctx.type = 'html';
    return Readable.from(generateHtml());
  }
}
```

---

## 路由优先级管理

### 默认优先级规则

| Path | RegExp Index | Priority | 说明 |
|------|-------------|----------|------|
| `/*` | `[0  ` | 0 | 通配符，最低 |
| `/hello/:name` | `[1  ` | 1000 | 单参数 |
| `/hello/world/message/:message` | `[3  ` | 3000 | 三参数 |
| `/hello/:name/message/:message` | `[1, 3  ` | 4000 | 多参数，索引更大 |
| `/hello/world` | `[  ` | 100000 | 静态路径，最高 |

### 手动设置优先级

```typescript
@HTTPController({ path: '/api' })
export class PriorityController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/(api|openapi)/version',
    priority: 100000, // 提升优先级
  })
  async high() { }

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/(api|openapi)/(.+)',
  })
  async low() { }
}
```

---

## 参数装饰器详解

### @HTTPParam

**装饰器类型**：参数装饰器（Parameter Decorator）

**使用场景**：从 URL 路径中提取参数

**语法**：`@HTTPParam(param?: HTTPParamParams)`

#### 快速参考

```typescript
@HTTPController({ path: '/api/users' })
export class UserController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: ':userId/posts/:postId' })
  async getPost(
    @HTTPParam() userId: string,
    @HTTPParam() postId: string
  ) {
    return { userId, postId };
  }
}
```

#### 使用要点

- 参数类型必须是 `string`
- 参数名默认和变量名相同
- 支持正则表达式捕获：`path: '/files/(.*)'`
- 使用 `{ name: '0' }` 获取正则第一个匹配
- 支持多参数路径

#### 示例

```typescript
// 路径参数
@HTTPController({ path: '/api/users' })
export class UserController {
  // GET /users/:id
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: ':id' })
  async getUser(@HTTPParam() id: string) {
    return { userId: id };
  }

  // GET /users/:userId/posts/:postId
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: ':userId/posts/:postId' })
  async getPost(@HTTPParam() userId: string, @HTTPParam() postId: string) {
    return { userId, postId };
  }

  // 获取正则匹配
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/files/(.*)' })
  async getFile(@HTTPParam({ name: '0' }) path: string) {
    return { path };
  }
}
```

---

### @HTTPQuery

**装饰器类型**：参数装饰器（Parameter Decorator）

**使用场景**：从 URL 查询字符串提取参数（`?key=value`）

**语法**：
- `@HTTPQuery(param?: HTTPQueryParams)` - 返回首个匹配的值（`string`）
- `@HTTPQueries(param?: HTTPQueriesParams)` - 返回全部值的数组（`string[]`）

#### 快速参考

```typescript
@HTTPController({ path: '/api/search' })
export class SearchController {
  // GET /api/search?category=books
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async searchByCategory(@HTTPQuery() category: string) {
    return { category };
  }

  // GET /api/search?tag=tech&tag=dev
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async searchByTags(@HTTPQueries({ name: 'tag' }) tags: string[]) {
    return { tags };
  }
}
```

#### 使用要点

- `@HTTPQuery`：返回首个匹配的值
- `@HTTPQueries`：返回全部值的数组
- 参数名默认与变量名匹配
- 使用 `{ name: 'key' }` 指定查询参数名

---

### @HTTPBody

**装饰器类型**：参数装饰器（Parameter Decorator）

**使用场景**：从请求体提取数据（POST/PUT 请求的 body）

**语法**：`@HTTPBody()`

**类型**：`object | string | FormData`

#### 快速参考

```typescript
@HTTPController({ path: '/api/users' })
export class UserController {
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/' })
  async createUser(@HTTPBody() body: { name: string; email: string }) {
    return { userId: '123', ...body };
  }
}
```

#### Content-Type 解析

| Content-Type | 解析结果         |
|-------------|--------------|
| `application/json` | 对象 `object`  |
| `text/plain` | 字符串 `string` |
| `application/x-www-form-urlencoded` | 对象 `object` |

**注意**：其他类型注入空值，需用 `@Request` 手动处理

---

### @HTTPHeaders

**装饰器类型**：参数装饰器（Parameter Decorator）

**使用场景**：获取 HTTP 请求头中的字段

**语法**：`@HTTPHeaders()`

**类型**：`IncomingHttpHeaders`

#### 快速参考

```typescript
@HTTPController({ path: '/api' })
export class HeaderController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/info' })
  async getInfo(@HTTPHeaders() headers: IncomingHttpHeaders) {
    const auth = headers['authorization'];
    const custom = headers['x-custom'];
    return { auth, custom };
  }
}
```

#### 使用要点

- Headers key 会自动转为小写，取值时使用小写字符
- 获取单个值：`headers['x-custom']`

---

### @Cookies

**装饰器类型**：参数装饰器（Parameter Decorator）

**使用场景**：从 HTTP Cookie 中读取会话数据

**语法**：`@Cookies()`

**类型**：`HTTPCookies`

#### 快速参考

```typescript
@HTTPController({ path: '/api' })
export class SessionController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/session' })
  async getSession(@Cookies() cookies: HTTPCookies) {
    const session = cookies.get('sessionId');
    return { session };
  }
}
```

#### 使用要点

- 使用 `cookies.get(key)` 读取 Cookie
- 使用 `{ signed: false }` 读取未签名的 Cookie

---

### @Request

**装饰器类型**：参数装饰器（Parameter Decorator）

**使用场景**：访问完整的 HTTP 请求对象

**语法**：`@Request()`

**类型**：`HTTPRequest`

#### 快速参考

```typescript
@HTTPController({ path: '/api' })
export class RequestController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/debug' })
  async getDebug(@Request() request: HTTPRequest) {
    const url = request.url;
    const method = request.method;
    const contentType = request.headers.get('content-type');
    const rawBody = await request.text();
    return { url, method, contentType, bodyLength: rawBody.length };
  }
}
```

#### 使用要点

- `request.url`：请求 URL
- `request.method`：请求方法
- `request.headers`：Headers 对象
- `request.text()`：读取请求体为文本
- `request.arrayBuffer()`：读取请求体为 ArrayBuffer

### @Context

**装饰器类型**：参数装饰器（Parameter Decorator）

**使用场景**：访问 Egg 框架的 Context 对象

**语法**：`@Context()`

**类型**：`EggContext`

#### 快速参考

```typescript
@HTTPController({ path: '/api' })
export class DebugController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/debug' })
  async debug(@Context() ctx: EggContext) {
    return {
      app: ctx.app.name,
      ip: ctx.ip,
      userAgent: ctx.get('user-agent')
    };
  }
}
```
