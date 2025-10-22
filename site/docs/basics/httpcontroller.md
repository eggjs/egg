# HTTP Controller

## Use Cases

When you need to provide HTTP services in your application, use the HTTPController decorator to declare HTTP interfaces. It's recommended for scenarios that strongly depend on the HTTP protocol. Common scenarios include:

- SSR scenarios, where HTML is rendered on the server side and returned to the frontend.
- SSE scenarios, communicating with the frontend in real-time through Server-Sent Events to implement features like AI conversations.
- Scenarios that rely on HTTP protocol data such as cookies for business logic processing.

## Usage

Use the `HTTPController` decorator to declare a class as an HTTP controller, and use the `HTTPMethod` decorator to declare the specific HTTP interface information for methods in that class.

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from 'egg';

@HTTPController()
export default class SimpleController {
  // Declare a GET /api/hello/:name interface
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/hello/:name' })
  async hello(@HTTPParam() name: string) {
    return {
      message: 'hello ' + name,
    };
  }
}
```

The `HTTPController` decorator supports passing a `path` parameter to specify the base HTTP path for the controller, which will be concatenated with the `path` parameter in `HTTPMethod` to form the final HTTP path.

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

// Set path parameter to specify the path prefix for all interfaces in this class
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

## Path Priority

The `path` set through the `HTTPMethod` decorator is parsed using [path-to-regexp](https://github.com/pillarjs/path-to-regexp), which supports simple parameters, wildcards, and other features. When multiple `HTTPMethod` decorators satisfy path matching simultaneously, priority is needed to determine the matched interface. Interfaces with higher priority will be matched first.

Egg automatically calculates a priority for each interface. The default priority rules should satisfy most scenarios. Therefore, in most cases, there's no need to manually specify priority. The default priority rules are as follows:

> priority = pathHasRegExp
> ? regexpIndexInPath.reduce((p,c) => p + c \* 1000, 0)
> : 100000

Combined with specific examples, the default priorities of the following interfaces are shown from low to high:

| Path                          | RegExp index | priority |
| ----------------------------- | ------------ | -------- |
| /\*                           | [0]          | 0        |
| /hello/:name                  | [1]          | 1000     |
| /hello/world/message/:message | [3]          | 3000     |
| /hello/:name/message/:message | [1, 3]       | 4000     |
| /hello/world                  | []           | 100000   |

For business scenarios where the default priority is insufficient, you can manually specify priority through the `priority` parameter of the `HTTPMethod` decorator.

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

@HTTPController()
export default class PriorityController {
  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/(api|openapi)/echo',
    priority: 100000, // Specify higher priority for this interface
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

## Request Parameter Decorators

### HTTPHeaders

The `HTTPHeaders` decorator is used to get the complete HTTP request headers.

:::warning
⚠️ Note: Keys in headers will be converted to lowercase. Please use lowercase characters when retrieving values.
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

The `HTTPQuery/HTTPQueries` decorators are used to get querystring parameters from HTTP requests. `HTTPQuery` only takes the first parameter and must be of type `string`; `HTTPQueries` injects parameters as an array containing one or more values, of type `string[]`.

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
    @HTTPQuery() user?: string, // When name is not set, variable name will be used automatically
    @HTTPQueries({ name: 'user' }) users?: string[], // Can also manually specify name
  ) {
    // ...
  }
}
```

### HTTPParam

The `HTTPParam` decorator is used to get matched parameters from the HTTP request `path`, which can only be of string type. The parameter name is the same as the variable name by default, but can also be manually specified if there are alias requirements.

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPParam } from 'egg';

@HTTPController()
export default class ArgsController {
  // curl http://127.0.0.1:7001/api/2088000
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/:id' })
  async getParamId(@HTTPParam() id: string) {
    // id is '2088000'
    // ...
  }

  // Match the first regex-matched character in path
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/foo/(.*)' })
  async getParamBar(@HTTPParam({ name: '0' }) bar: string) {
    // ...
  }
}
```

### HTTPBody

The `HTTPBody` decorator is used to get request body content. When injecting, the framework will first parse the request body according to the `content-type` in the request header, supporting json, text, and form-urlencoded. Other `content-type` types will inject empty values. You can get the raw request body through the `Request` decorator and process it yourself.

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
    @HTTPBody() body: FormData, // In function apps, it's FormData type
    // @HTTPBody() body: BodyData, // In standard apps, it's a plain object
  ) {
    // ...
  }
}
```

### Cookies

The `Cookies` decorator is used to get the complete HTTP Cookies.

```typescript
import {
  Cookies,
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

### HTTPRequest

The `HTTPRequest` decorator is used to get the complete HTTP request object, allowing you to get request information such as url, headers, and body. For specific APIs, please refer to the type definitions.

:::warning
⚠️ Note: After injecting the request body through the @HTTPBody decorator, the request body will be consumed. If you also inject @HTTPRequest and consume the request body again, it will cause an error (injecting @HTTPRequest without consuming the request body to get url, headers, etc. will not be affected).
:::

```typescript
import {
  HTTPBody,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  HTTPRequest,
} from 'egg';

@HTTPController()
export default class ArgsController {
  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/request' })
  async getRequest(@HTTPRequest() request: Request) {
    const headerData = request.headers.get('x-header-key');
    const url = request.url;
    // Get request body arrayBuffer
    const arrayBufferData = await request.arrayBuffer();
    // ...
  }

  @HTTPMethod({ method: HTTPMethodEnum.POST, path: '/api/request2' })
  async getRequest2(@HTTPBody() body: object, @HTTPRequest() request: Request) {
    // Injecting both HTTPBody and Request, reading header, url, etc. through request works normally
    const headerData = request.headers.get('x-header-key');
    const url = request.url;
    // ❌ Wrong example
    // When the request body has already been injected through HTTPBody
    // Consuming the request body again through request will throw an exception
    // const arrayBufferData = await request.arrayBuffer();
    // ...
  }
}
```

### HTTPContext

In standard applications, you can use the `HTTPContext` decorator to get the Egg [Context][Context] object.

:::warning
⚠️ Note: The `HTTPContext` decorator is not supported in function applications.
:::

```typescript
import {
  HTTPContext,
  Context,
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

## HTTP Response

### Default Response

By default, when the `HTTPMethod` function returns an object, the framework will process it with `JSON.stringify` and set `Content-Type: application/json` to return to the client.

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

### Custom Response

#### Function Applications

In function applications, when you need to return non-JSON data or set HTTP response codes and response headers, you can set and return through the globally injected `Response` object.

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum } from 'egg';

@HTTPController()
export default class ResponseController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/custom-response' })
  async customResponse() {
    // Response is a global object, no need to import
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

#### Standard Applications

In standard applications, you can use the APIs provided by [Context][Context] to customize HTTP response codes and response headers.

```typescript
import {
  Context,
  HTTPContext,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
} from 'egg';

@HTTPController()
export default class ResponseController {
  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/api/custom-response' })
  async customResponse(@HTTPContext() ctx: Context) {
    // Custom response code
    ctx.status = 200;
    // Add custom response header
    ctx.set('x-custom', 'custom');
    // Syntactic sugar for setting Content-Type, equivalent to ctx.set('content-type', 'application/json')
    // Supports common types like json, html, etc. See https://github.com/jshttp/mime-types
    ctx.type = 'html';

    return '<h1>Hello World</h1>';
  }
}
```

### Stream Response

Simply wrap the streaming data as a `Readable` object and return it.

```typescript
import { Readable } from 'node:stream';
import { setTimeout } from 'node:timers/promises';
import {
  Context,
  HTTPContext,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
} from 'egg';

// Construct streaming data
async function* generate(count = 5, duration = 500) {
  yield '<html><head><title>hello stream</title></head><body>';
  for (let i = 0; i < count; i++) {
    yield `<h2>Stream content ${i + 1}, ${Date()}</h2>`;
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
