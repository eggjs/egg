# HTTP Controller

## 使用场景

需要在应用中，提供 HTTP 服务时，通过 HTTPController 装饰器申明 HTTP 接口。建议用于强依赖 HTTP 协议的场景。常见场景有：

- SSR 场景，在服务端流式渲染 HTML 后返回给前端。
- SSE 场景，通过 Server-Sent Events 与前端实时通信，实现 AI 对话等功能。
- 依赖 cookie 等 HTTP 协议数据进行业务逻辑处理的场景。

## 使用方式

使用 `HTTPController` 装饰器申明一个类为 HTTP 控制器，使用 `HTTPMethod` 装饰器申明该类中的方法对应的具体 HTTP 接口信息。

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from 'egg';

@HTTPController()
export default class SimpleController {
  // 申明一个 GET /api/hello/:name 接口
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/hello/:name' })
  async hello(@HTTPParam() name: string) {
    return {
      message: 'hello ' + name,
    };
  }
}
```

`HTTPController` 装饰器支持传入 `path` 参数，用于指定该控制器的基础 HTTP path，和 `HTTPMethod` 中的 `path` 参数拼接后，为最终的 HTTP path。

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

// 设置 path 参数，用于指定该类下所有接口的 path 前缀
@HTTPController({ path: '/api' })
export default class PathController {
  // GET /api/hello
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: 'hello' })
  async hello() {
    // ...
  }

  // POST /api/echo
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: 'echo' })
  async echo() {
    // ...
  }
}
```

## path 优先级

通过 `HTTPMethod` 装饰器设置的 `path` 使用 [path-to-regexp](https://github.com/pillarjs/path-to-regexp) 进行解析，支持一些简单的参数、通配符等功能。若有多个 `HTTPMethod` 同时满足 `path` 匹配时，则需要通过优先级来确定匹配的接口，优先级越高的接口会被优先匹配。

egg 默认会给每个接口都计算一个优先级。默认优先级规则应该满足绝大多数场景使用。因此大多数场景，都无需手动指定优先级。默认优先级规则如下所示：

> priority = pathHasRegExp
> ? regexpIndexInPath.reduce((p,c) => p + c \* 1000, 0)
> : 100000

结合具体例子来看，下列接口的默认优先级由低到高分别如下所示：

| Path                          | RegExp index | priority |
| ----------------------------- | ------------ | -------- |
| /\*                           | [0]          | 0        |
| /hello/:name                  | [1]          | 1000     |
| /hello/world/message/:message | [3]          | 3000     |
| /hello/:name/message/:message | [1, 3]       | 4000     |
| /hello/world                  | []           | 100000   |

对于默认优先级无法满足的业务场景，可通过 `HTTPMethod` 装饰器的 `priority` 参数手动指定优先级。

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

@HTTPController()
export default class PriorityController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/(api|openapi)/echo',
    priority: 100000, // 指定该接口优先级更高
  })
  async high() {
    // ...
  }

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/(api|openapi)/(.+)',
  })
  async low() {
    // ...
  }
}
```

## 请求参数装饰器

### HTTPHeaders

`HTTPHeaders` 装饰器用于获取完整的 HTTP 请求头。

:::warning
⚠️注意: headers 中的 key 会被转为小写，取值时请使用小写字符进行取值。
:::

```typescript
import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPHeaders,
  IncomingHttpHeaders,
} from 'egg';

@HTTPController()
export default class ArgsController {
  // curl http://localhost:7001/api/hello -H 'X-Custom: custom'
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/hello' })
  async getHeaders(@HTTPHeaders() headers: IncomingHttpHeaders) {
    const custom = headers['x-custom'];
    // ...
  }
}
```

### HTTPQuery/HTTPQueries

`HTTPQuery/HTTPQueries` 装饰器用于获取 HTTP 请求中 querystring 参数。`HTTPQuery` 只取第一个参数，类型必须为 `string`；`HTTPQueries` 以数组形式注入参数，数组包含一个或多个值，类型为 `string[]`。

```typescript
import {
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPQuery,
  HTTPQueries,
} from 'egg';

@HTTPController()
export default class ArgsController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/query' })
  async getQueries(
    // /api/query?user=asd&user=fgh
    // user = 'asd'
    // users = ['asd', 'fgh']
    @HTTPQuery() user?: string, // 未设置 name 时，将自动读取变量名为 name
    @HTTPQueries({ name: 'user' }) users?: string[], // 也可手动指定 name
  ) {
    // ...
  }
}
```

### HTTPParam

`HTTPParam` 装饰器用于获取 HTTP 请求 `path` 中匹配的参数，只能为 string 类型。参数名默认和变量名相同，若有别名等需求，也可手动指定名称。

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from 'egg';

@HTTPController()
export default class ArgsController {
  // curl http://127.0.0.1:7001/api/2088000
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/:id' })
  async getParamId(@HTTPParam() id: string) {
    // id 为 '2088000'
    // ...
  }

  // 匹配 path 中第一个正则表达式匹配的字符
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/foo/(.*)' })
  async getParamBar(@HTTPParam({ name: '0' }) bar: string) {
    // ...
  }
}
```

### HTTPBody

`HTTPBody` 装饰器用于获取请求体内容，框架在注入时，会先根据请求头中的 `content-type` 对请求体进行解析，支持 json、text 以及 form-urlencoded。其他 `content-type` 类型会注入空值，可通过 `Request` 装饰器获取原始请求体，自行进行处理。

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPBody } from 'egg';

export interface BodyData {
  foo: string;
  bar?: number;
}

@HTTPController()
export default class ArgsController {
  // content-type: application/json
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/json-body' })
  async getJsonBody(@HTTPBody() body: BodyData) {
    // ...
  }

  // content-type: text/plain
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/text-body' })
  async getTextBody(@HTTPBody() body: string) {
    // ...
  }

  // content-type: application/x-www-form-urlencoded
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/formdata-body' })
  async getFormBody(
    @HTTPBody() body: FormData, // 函数应用中，为  FormData 类型
    // @HTTPBody() body: BodyData, // 标准应用中，为普通对象
  ) {
    // ...
  }
}
```

### Cookies

`Cookies` 装饰器用于获取完整的 HTTP Cookies。

```typescript
import {
  type Cookies,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPCookies,
} from 'egg';

@HTTPController()
export default class ArgsController {
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/cookies' })
  async getCookies(@HTTPCookies() cookies: Cookies) {
    return {
      success: true,
      cookies: cookies.get('test', { signed: false }),
    };
  }
}
```

### Request

`Request` 装饰器用于获取完整的 HTTP 请求对象，可获取 url、headers 以及 body 等请求信息，具体 api 可参考类型定义。

:::warning
⚠️ 注意：通过 @HTTPBody 装饰器注入请求体后，会对请求体进行消费。若同时注入 @Request，再次消费请求体时，将会导致错误（注入 @Request，不消费请求体，获取 url、headers 等信息不会有影响）。
:::

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPRequest } from 'egg';

@HTTPController()
export default class ArgsController {
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/request' })
  async getRequest(@HTTPRequest() request: Request) {
    const headerData = request.headers.get('x-header-key');
    const url = request.url;
    // 获取请求体 arrayBuffer
    const arrayBufferData = await request.arrayBuffer();
    // ...
  }

  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/request2' })
  async getRequest2(@HTTPBody() body: object, @HTTPRequest() request: Request) {
    // 同时注入 HTTPBody 和 Request，通过 request 读取 header、url 等信息可正常运行
    const headerData = request.headers.get('x-header-key');
    const url = request.url;
    // ❌ 错误示例
    // 已经通过 HTTPBody 注入请求体的情况下
    // 又同时通过 request 再次消费请求体时，将会抛出异常
    // const arrayBufferData = await request.arrayBuffer();
    // ...
  }
}
```

### HTTPContext

在标准应用中，可使用 `HTTPContext` 装饰器，用于获取 egg 的 [Context][Context] 对象。

:::warning
⚠️ 注意：函数应用中，不支持使用 `HTTPContext` 装饰器。
:::

```typescript
import {
  HTTPContext,
  type Context,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
} from 'egg';

@HTTPController()
export default class ArgsController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/context' })
  async getContext(@HTTPContext() context: Context) {
    // ...
  }
}
```

## HTTP 响应

### 默认响应

默认情况下，`HTTPMethod` 函数返回对象时，框架会进行 `JSON.stringify` 处理，并设置 `Content-Type: application/json` 返回给客户端。

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

@HTTPController()
export default class ResponseController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/json' })
  async defaultResponse() {
    return {
      result: 'hello world',
    };
  }
}
```

### 自定义响应

#### 函数应用

在函数应用中，当需要返回非 JSON 数据，或需要设置 HTTP 响应码以及响应头等数据时，可通过全局注入的 `Response` 对象进行设置并返回。

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

@HTTPController()
export default class ResponseController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/custom-response' })
  async customResponse() {
    // Response 为全局对象，无需 import
    return new Response('<h1>Hello World</h1>', {
      status: 200,
      headers: {
        'transfer-encoding': 'chunked',
        'content-type': 'text/html; charset=utf-8',
        'x-header-key': 'from-function',
      },
    });
  }
}
```

#### 标准应用

在标准应用中，可以通过 [Context][Context] 提供的 api 来自定义设置 HTTP 响应码和响应头等信息。

```typescript
import {
  type Context,
  HTTPContext,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
} from 'egg';

@HTTPController()
export default class ResponseController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/custom-response' })
  async customResponse(@HTTPContext() ctx: Context) {
    // 自定义响应码
    ctx.status = 200;
    // 添加自定义响应头
    ctx.set('x-custom', 'custom');
    // 设置 Content-Type 的语法糖，等价于 ctx.set('content-type', 'application/json')
    // 支持 json、html 等常见类型，可参考 https://github.com/jshttp/mime-types
    ctx.type = 'html';

    return '<h1>Hello World</h1>';
  }
}
```

### 流式响应

只需要将流式数据包装为一个 `Readable` 对象并返回即可。

```typescript
import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';
import {
  type Context,
  HTTPContext,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
} from 'egg';

// 构造流式数据
async function* generate(count = 5, duration = 500) {
  yield '<html><head><title>hello stream</title></head><body>';
  for (let i = 0; i < count; i++) {
    yield `<h2>流式内容${i + 1}，${Date()}</h2>`;
    await setTimeout(duration);
  }
  yield '</body></html>';
}

@HTTPController()
export default class ResponseController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/stream' })
  async streamResponse(@HTTPContext() ctx: Context) {
    ctx.type = 'html';
    return Readable.from(generate());
  }
}
```

[Context]: ./objects.md#context
