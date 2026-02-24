# 单元测试

## 为什么要单元测试

先问我们自己以下几个问题：

- 你的代码质量如何度量？
- 你是如何保证代码质量？
- 你敢随时重构代码吗？
- 你是如何确保重构的代码依然保持正确性？
- 你是否有足够信心在没有测试的情况下随时发布你的代码？

如果答案都比较犹豫，那么就证明我们非常需要单元测试。

它能带给我们很多保障：

- 代码质量持续有保障
- 重构正确性保障
- 增强自信心
- 自动化运行

Web 应用中的单元测试更加重要，Web 产品快速迭代的时期，每个测试用例都为应用的稳定性提供了保障。API 升级时，测试用例可以很好地检查代码是否向下兼容。对于各种可能的输入，一旦测试覆盖，都能明确它的输出。代码改动后，可以通过测试结果判断代码的改动是否影响了已确定的结果。

所以，应用的 Controller、Service、Helper、Extend 等代码，都必须有对应的单元测试以保证代码质量。当然，框架和插件的每个功能改动和重构都需要有相应的单元测试，并且要求尽量做到修改的代码能被 100% 覆盖到。

## 测试框架

从 [npm 搜索”test framework”](https://www.npmjs.com/search?q=test%20framework&page=1&ranking=popularity) 我们会发现有大量测试框架存在，每个测试框架都有它的独特之处。

### Vitest

从 `@eggjs/bin` v8 开始，Egg 使用 [Vitest](https://vitest.dev) 作为默认的测试运行器。Vitest 是基于 Vite 的下一代测试框架，提供原生 TypeScript 支持、快速执行和现代化的测试体验。

> Vitest 是一个基于 Vite 的极速单元测试框架，提供原生 ESM 支持，开箱即用的 TypeScript 支持，以及 Vite 驱动的转换管道。

主要优势：

- **原生 TypeScript 支持** — 无需 ts-node 或额外的 loader
- **快速执行** — 利用 Vite 的转换管道
- **内置 watch 模式** — 开发时即时反馈
- **兼容的 API** — 支持 `describe`、`it`、`beforeAll`、`afterAll` 等
- **内置覆盖率** — 通过 `@vitest/coverage-v8`，无需外部工具

### Mocha（旧版）

`@eggjs/bin` 之前的版本（v7 及更早）使用 [Mocha](http://mochajs.org) 作为测试运行器。如果你从 Mocha 迁移，请注意以下钩子名称变更：

| Mocha          | Vitest                 |
| -------------- | ---------------------- |
| `before()`     | `beforeAll()`          |
| `after()`      | `afterAll()`           |
| `beforeEach()` | `beforeEach()`（相同） |
| `afterEach()`  | `afterEach()`（相同）  |

## 断言库

我们推荐使用 Node.js 内置的 [assert](https://nodejs.org/api/assert.html) 模块进行断言。它遵循『无 API 是最好的 API』的原则——简单、熟悉，且无需额外依赖。

```js
import assert from 'node:assert';

assert(result.status === 200);
assert.equal(user.name, 'fengmk2');
assert.deepStrictEqual(data, { foo: 'bar' });
```

Vitest 也提供了内置的 `expect` API，如果你偏好 BDD 风格的断言：

```js
import { expect } from 'vitest';

expect(result.status).toBe(200);
expect(user.name).toBe('fengmk2');
```

## 测试约定

为了让我们更多地关注测试用例本身如何编写，而不是耗费时间在如何运行测试脚本等辅助工作上，框架对单元测试做了一些基本约定。

### 测试目录结构

我们约定 `test` 目录为存放所有测试脚本的目录，测试所使用到的 `fixtures` 和相关辅助脚本都应该放在此目录下。

测试脚本文件统一按 `${filename}.test.js` 命名，必须以 `.test.js` 作为文件后缀。

以下为一个应用的测试目录示例：

```bash
test
├── controller
│   └── home.test.js
├── hello.test.js
└── service
    └── user.test.js
```

### 测试运行工具

统一使用 [egg-bin 运行测试脚本](https://github.com/eggjs/egg-bin#test)，内部使用 [Vitest](https://vitest.dev) 运行测试。egg-bin 自动配置 vitest 的合理默认值，让我们**聚焦精力在编写测试代码**上，而不是纠结选择哪些测试周边工具和模块。

egg-bin 提供的主要功能：

- 自动检测 TypeScript 并配置 vitest
- 自动加载 `test/.setup.ts`（或 `.setup.js`）作为 setup 文件
- 对于 egg 应用，自动注入 `@eggjs/mock/setup_vitest`（处理 app 生命周期）
- 注入 vitest 全局变量（`describe`、`it`、`beforeAll` 等），纯 JS 测试文件无需导入

只需在 `package.json` 上配置好 `scripts.test` 即可。

```json
{
  "scripts": {
    "test": "egg-bin test"
  }
}
```

然后就可以按标准的 `npm test` 来运行测试了。

```bash
npm test

> unittest-example@ test /Users/mk2/git/github.com/eggjs/examples/unittest
> egg-bin test

 ✓ test/hello.test.js (1 test) 10ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

## 准备测试

本文主要介绍了如何编写应用的单元测试，关于框架和插件的单元测试请查看[框架开发](https://eggjs.org/zh-cn/advanced/framework.html)和[插件开发](https://eggjs.org/zh-cn/advanced/plugin.html)相关章节。

### mock

正常来说，如果要完整手写一个创建和启动 app 的脚本，还是需要写一段初始化脚本的，并且还需要在测试结束后进行一些清理工作，比如删除临时文件、销毁 app 等。

我们可能还需要模拟各种网络异常、服务访问异常等特殊情况。

因此我们单独为框架抽取了一个测试 mock 辅助模块：**`@eggjs/mock`**（历史上也常被称为 egg-mock）。有了它我们就可以非常快速地编写应用单元测试，并且还能快速创建 ctx 来测试属性、方法和 Service 等。

- 仓库（Egg 3.x）：https://github.com/eggjs/mock/tree/4.x
- 也可以参考：[测试 Mock 工具（@eggjs/mock / mm）](./mock.md)

### app

在测试运行之前，我们首先要创建应用的一个 app 实例，通过它来访问需要被测试的 Controller、Middleware、Service 等应用层代码。

通过 `@eggjs/mock`，结合 `beforeAll` 钩子，可以便捷地创建出一个 app 实例。

```typescript
// test/controller/home.test.ts
import assert from 'node:assert';
import { mock } from '@eggjs/mock';
import { beforeAll, describe } from 'vitest';

describe('test/controller/home.test.ts', () => {
  let app;
  beforeAll(async () => {
    // 创建当前应用的 app 实例
    app = mock.app();
    // 等待 app 启动成功，才能执行测试用例
    await app.ready();
  });
});
```

这样我们就拿到了一个 app 的引用，接下来所有测试用例都会基于这个 app 进行。更多关于创建 app 的信息请查看 [`mock.app(options)`](https://github.com/eggjs/egg-mock#appoptions) 文档。

考虑到每个测试文件都需要这样创建 app 实例会非常冗余，因此 `@eggjs/mock` 提供了一个 bootstrap 文件，直接从其上面获取常用的实例：

```typescript
// test/controller/home.test.ts
import { app, mock } from '@eggjs/mock/bootstrap';
import assert from 'node:assert';

describe('test/controller/home.test.ts', () => {
  // 测试用例
});
```

> **提示：** 使用 egg-bin 时，`@eggjs/mock/setup_vitest` 会被自动注入为 vitest 的 setup 文件。它会自动处理 `beforeAll`（启动 app）、`afterEach`（恢复 mock）和 `afterAll`（关闭 app）。

### ctx

除了 app，我们还需要一种便捷的方式来获得 ctx，以便进行 Extend、Service、Helper 等测试。
已经通过上述方法拿到了一个 app，结合 egg-mock 提供的 [`app.mockContext(options)`](https://github.com/eggjs/egg-mock#appmockcontextoptions) 方法可以快速创建一个 ctx 实例。

```typescript
it('should get a ctx', () => {
  const ctx = app.mockContext();
  assert(ctx.method === 'GET');
  assert(ctx.url === '/');
});
```

如果要模拟 `ctx.user`，也可以通过给 mockContext 传递数据参数实现：

```typescript
it('should mock ctx.user', () => {
  const ctx = app.mockContext({
    user: {
      name: 'fengmk2',
    },
  });
  assert(ctx.user);
  assert(ctx.user.name === 'fengmk2');
});
```

现在我们已经拿到了 app，也知道如何创建一个 ctx，可以开始进行更多的单元测试了。

## 测试执行顺序

特别需要注意的是执行顺序，应确保在执行某个用例时，相关代码才被执行。

一些常见的错误写法如下：

```ts
// Bad
import { app } from '@eggjs/mock/bootstrap';

describe('bad test', () => {
  doSomethingBefore();

  it('should redirect', () => {
    return app.httpRequest().get('/').expect(302);
  });
});
```

测试框架在开始运行时将载入所有的测试用例，此时 describe 方法会被调用，那么 `doSomethingBefore` 也就提前被触发了。如果期望通过 only 方式执行某个特定测试用例，那段代码依然会被执行，这是不符合预期的。

一个正确的做法是将其放入 `beforeAll` 中，只有在运行这个测试套件中的某个用例时，相关代码才会执行。

```ts
// Good
import { app } from '@eggjs/mock/bootstrap';

describe('good test', () => {
  beforeAll(() => doSomethingBefore());

  it('should redirect', () => {
    return app.httpRequest().get('/').expect(302);
  });
});
```

Vitest 通过 `beforeAll`/`afterAll`/`beforeEach`/`afterEach` 来处理前置和后置任务，这几个钩子基本上能处理所有的问题。每个测试用例会按照如下顺序执行：`beforeAll` -> `beforeEach` -> `it` -> `afterEach` -> `afterAll`，并且可以定义多个。

```ts
describe('egg test', () => {
  beforeAll(() => console.log('order 1'));
  beforeAll(() => console.log('order 2'));
  afterAll(() => console.log('order 6'));
  beforeEach(() => console.log('order 3'));
  afterEach(() => console.log('order 5'));
  it('should worker', () => console.log('order 4'));
});
```

## 异步测试

egg-bin 支持异步测试，它提供了多种方式：

```js
// 使用返回 Promise 的方法
it('should redirect', () => {
  return app.httpRequest().get('/').expect(302);
});

// 使用回调函数的方法
it('should redirect', (done) => {
  app.httpRequest().get('/').expect(302, done);
});

// 使用 async
it('should redirect', async () => {
  await app.httpRequest().get('/').expect(302);
});
```

根据不同的应用场景，应当选择适合的写法。如果遇到多个异步操作，可以使用 async 函数，或者可以把它们拆分成多个测试用例。
修改后的内容：

## Controller 测试

Controller 在整个应用代码里面属于较为难测试的部分。因为它与 router 配置紧密相关，所以我们需要利用 `app.httpRequest()` 接口结合 [SuperTest](https://github.com/visionmedia/supertest) 发起真实请求，来将 Router 与 Controller 连接起来。同时，它可以帮助我们发送各种满足边界条件的请求数据，以此测试 Controller 参数校验的完整性。 `app.httpRequest()` 是由 [egg-mock](https://github.com/eggjs/egg-mock) 封装的 SuperTest 请求实例。

例如，我们要为 `app/controller/home.js` 编写单元测试：

```js
// app/router.js
module.exports = (app) => {
  const { router, controller } = app;
  router.get('homepage', '/', controller.home.index);
};

// app/controller/home.js
class HomeController extends Controller {
  async index() {
    this.ctx.body = 'hello world';
  }
}
```

其对应的测试代码 `test/controller/home.test.js` 如下：

```ts
import { app } from '@eggjs/mock/bootstrap';
import assert from 'node:assert';

describe('test/controller/home.test.ts', () => {
  describe('GET /', () => {
    it('应该返回状态码为 200 并获取到内容', () => {
      // 对 app 发起 `GET /` 请求
      return app
        .httpRequest()
        .get('/')
        .expect(200) // 期望返回状态码为 200
        .expect('hello world'); // 期望响应内容为 hello world
    });

    it('应该发送多个请求', async () => {
      // 使用 async 方式编写测试用例，可以在一个用例中串行发起多次请求
      await app
        .httpRequest()
        .get('/')
        .expect(200) // 期望返回状态码 200
        .expect('hello world'); // 期望响应内容为 hello world

      // 再次请求
      const result = await app
        .httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world');

      // 也可以这样验证
      assert(result.status === 200);
    });
  });
});
```

通过基于 SuperTest 的 `app.httpRequest()` 我们可以轻松发起 GET、POST、PUT 等 HTTP 请求。它拥有非常丰富的请求数据构造接口，例子如下，我们可以以 POST 方式发送一个 JSON 请求：

```js
// app/controller/home.js
class HomeController extends Controller {
  async post() {
    this.ctx.body = this.ctx.request.body;
  }
}

// test/controller/home.test.js
it('应该返回状态码 200 并获取到请求体', () => {
  // 模拟 CSRF token，下文会详细说明
  app.mockCsrf();
  return app
    .httpRequest()
    .post('/post')
    .type('form')
    .send({
      foo: 'bar',
    })
    .expect(200)
    .expect({
      foo: 'bar',
    });
});
```

更详尽的 HTTP 请求构造方式，请查看 [SuperTest 文档](https://github.com/visionmedia/supertest#getting-started)。

### 模拟 CSRF

框架的默认安全插件会自动启用 [CSRF 防护](./security.md#安全威胁csrf的防范)。如果要完全按照 CSRF 校验逻辑进行测试，那么代码必须首先发起一次页面请求，通过解析 HTML 获得 CSRF token，再利用此 token 发起 POST 请求。

因此，egg-mock 为 app 添加了 `app.mockCsrf()` 方法，用于模拟获取 CSRF token 的过程。这样，我们就可以在利用 SuperTest 请求 app 时，自动通过 CSRF 校验。

```js
app.mockCsrf();
return app
  .httpRequest()
  .post('/post')
  .type('form')
  .send({
    foo: 'bar',
  })
  .expect(200)
  .expect({
    foo: 'bar',
  });
```

## Service 层的单元测试

Service 层相比于 Controller 层来说，测试起来更简单。我们只需要首先创建一个 `ctx`，然后通过 `ctx.service.${serviceName}` 取得 Service 实例，接着即可调用 Service 方法进行测试。

例如：

```js
// app/service/user.js
class UserService extends Service {
  async get(name) {
    return await userDatabase.get(name);
  }
}

// 单元测试代码如下：

describe('get()', () => {
  it('应该获取已存在的用户', async () => {
    // 创建 ctx
    const ctx = app.mockContext();
    // 通过 ctx 访问 service.user
    const user = await ctx.service.user.get('fengmk2');
    assert(user);
    assert(user.name === 'fengmk2');
  });

  it('当用户不存在时应返回 null', async () => {
    const ctx = app.mockContext();
    const user = await ctx.service.user.get('fengmk1');
    assert(!user);
  });
});
```

当然，实际中的 Service 代码不会像示例中展示的这般简单，这里只是为了演示如何测试 Service。

## Extend 测试

应用可以对 Application、Request、Response、Context 和 Helper 进行扩展。我们可以对扩展的方法或者属性针对性的编写单元测试。

### Application

egg-mock 创建 app 的时候，已经将 Application 的扩展自动加载到 app 实例了，直接使用这个 app 实例访问扩展的属性和方法即可进行测试。

例如 `app/extend/application.js`，我们给 app 增加了一个基于 [ylru](https://github.com/node-modules/ylru) 的缓存功能：

```js
const LRU = Symbol('Application#lru');
const LRUCache = require('ylru');
module.exports = {
  get lru() {
    if (!this[LRU]) {
      this[LRU] = new LRUCache(1000);
    }
    return this[LRU];
  },
};
```

对应的单元测试：

```js
describe('get lru', () => {
  it('should get an lru and it should work', () => {
    // 设置缓存
    app.lru.set('foo', 'bar');
    // 读取缓存
    assert(app.lru.get('foo') === 'bar');
  });
});
```

可以看到，测试 Application 的扩展是非常容易的。

### Context

测试 Context 扩展只需多一个 `app.mockContext()` 步骤来模拟创建一个 Context 对象。

例如在 `app/extend/context.js` 中增加一个 `isXHR` 属性，用于判断请求是否通过 [XMLHttpRequest](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/setRequestHeader) 发起：

```js
module.exports = {
  get isXHR() {
    return this.get('X-Requested-With') === 'XMLHttpRequest';
  },
};
```

对应的单元测试：

```js
describe('isXHR()', () => {
  it('should be true', () => {
    const ctx = app.mockContext({
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    assert(ctx.isXHR === true);
  });

  it('should be false', () => {
    const ctx = app.mockContext({
      headers: {
        'X-Requested-With': 'SuperAgent',
      },
    });
    assert(ctx.isXHR === false);
  });
});
```

### Request

通过 `ctx.request` 访问 Request 扩展的属性和方法，测试即可直接进行。

例如在 `app/extend/request.js` 中增加一个 `isChrome` 属性，用于判断请求是否由 Chrome 浏览器发起：

```js
const IS_CHROME = Symbol('Request#isChrome');
module.exports = {
  get isChrome() {
    if (!this[IS_CHROME]) {
      const ua = this.get('User-Agent').toLowerCase();
      this[IS_CHROME] = ua.includes('chrome/');
    }
    return this[IS_CHROME];
  },
};
```

对应的单元测试：

```js
describe('isChrome()', () => {
  it('should be true', () => {
    const ctx = app.mockContext({
      headers: {
        'User-Agent': 'Chrome/56.0.2924.51',
      },
    });
    assert(ctx.request.isChrome === true);
  });

  it('should be false', () => {
    const ctx = app.mockContext({
      headers: {
        'User-Agent': 'FireFox/1',
      },
    });
    assert(ctx.request.isChrome === false);
  });
});
```

Response 测试与 Request 完全一致。
通过 `ctx.response` 来访问 Response 扩展的属性和方法，直接即可进行测试。

例如在 `app/extend/response.js` 中增加一个 `isSuccess` 属性，判断当前响应状态码是否 200：

```js
module.exports = {
  get isSuccess() {
    return this.status === 200;
  },
};
```

对应的单元测试：

```js
describe('isSuccess()', () => {
  it('should return true when status is 200', () => {
    const ctx = app.mockContext();
    ctx.status = 200;
    assert(ctx.response.isSuccess === true);
  });

  it('should return false when status is not 200', () => {
    const ctx = app.mockContext();
    ctx.status = 404;
    assert(ctx.response.isSuccess === false);
  });
});
```

Helper 测试方式与 Service 类似，也是通过 ctx 来访问到 Helper，然后调用 Helper 方法进行测试。
例如 `app/extend/helper.js`

```js
module.exports = {
  money(val) {
    const lang = this.ctx.get('Accept-Language');
    if (lang.includes('zh-CN')) {
      return `￥ ${val}`;
    }
    return `$ ${val}`;
  },
};
```

对应的单元测试：

```js
describe('money()', () => {
  it('should return RMB when Accept-Language includes zh-CN', () => {
    const ctx = app.mockContext({
      // 模拟 ctx 的 headers
      headers: {
        'Accept-Language': 'zh-CN,zh;q=0.5',
      },
    });
    assert(ctx.helper.money(100) === '￥ 100');
  });

  it('should return US Dollar when Accept-Language does not include zh-CN', () => {
    const ctx = app.mockContext();
    assert(ctx.helper.money(100) === '$ 100');
  });
});
```

## Mock 方法

`egg-mock` 除了上面介绍过的 `app.mockContext()` 和 `app.mockCsrf()` 方法外，还提供了[非常多的 mock 方法](https://github.com/eggjs/egg-mock#api)帮助我们便捷地写单元测试。

- 如果我们不想在终端 console 输出任何日志，可以通过 `mock.consoleLevel('NONE')` 来模拟。
- 例如，我们想模拟一次请求的 Session 数据，可以通过 `app.mockSession(data)` 来模拟。

  ```js
  describe('GET /session', () => {
    it('should mock session work', () => {
      app.mockSession({
        foo: 'bar',
        uid: 123,
      });
      return app
        .httpRequest()
        .get('/session')
        .expect(200)
        .expect({
          session: {
            foo: 'bar',
            uid: 123,
          },
        });
    });
  });
  ```

因为 mock 之后会一直生效，我们需要避免每个单元测试用例之间不能相互 mock 污染，
所以通常我们会在 `afterEach` 钩子里面还原掉所有 mock。

```ts
describe('some test', () => {
  // beforeAll hook

  afterEach(() => mock.restore());

  // it tests
});
```

**使用 egg-bin 时，`@eggjs/mock/setup_vitest` 会被自动注入，它会在 `afterEach` 钩子中自动还原所有的 mock，所以不需要再次编写这部分内容。**

接下来会详细解释 `egg-mock` 的常见使用场景。

### Mock 属性和方法

由于 `egg-mock` 是基于 [mm](https://github.com/node-modules/mm) 模块扩展的，
它包含了 `mm` 的所有功能，因此我们可以非常方便地 mock 任意对象的属性和方法。

#### Mock 一个对象的属性

mock `app.config.baseDir` 的值指向 `/tmp/mockapp`。

```js
mock(app.config, 'baseDir', '/tmp/mockapp');
assert(app.config.baseDir === '/tmp/mockapp');
```

#### Mock 一个对象的方法

mock `fs.readFileSync` 方法，使其返回 `'hello world'`。

```js
mock(fs, 'readFileSync', (filename) => {
  return 'hello world';
});
assert(fs.readFileSync('foo.txt') === 'hello world');
```

我们还有 `mock.data()`、`mock.error()` 等更多高级的 mock 方法。
详细使用说明请参考 [mm API](https://github.com/node-modules/mm#api)。

### Mock Service

Service 作为框架的标准内置对象，我们利用 `app.mockService(service, methodName, fn)` 方法来方便地模拟 Service 方法的返回值。

例如，模拟 `app/service/user` 中 `get(name)` 方法，让其返回一个本来不存在的用户数据。

```js
it('should mock fengmk1 exists', () => {
  app.mockService('user', 'get', () => {
    return {
      name: 'fengmk1',
    };
  });

  return (
    app
      .httpRequest()
      .get('/user?name=fengmk1')
      .expect(200)
      // 返回了本来不存在的用户信息
      .expect({
        name: 'fengmk1',
      })
  );
});
```

通过 `app.mockServiceError(service, methodName, error)`，我们可以模拟 Service 方法调用时的异常情况。

例如，模拟 `app/service/user` 中的 `get(name)` 方法调用时抛出异常：

```js
it('should mock service error', () => {
  app.mockServiceError('user', 'get', 'mock user service error');
  return (
    app
      .httpRequest()
      .get('/user?name=fengmk2')
      // 由于 service 异常，触发了 500 响应
      .expect(500)
      .expect(/mock user service error/)
  );
});
```

### Mock HttpClient

框架内置了 HttpClient，应用发起的对外 HTTP 请求基本都是通过它来处理。我们可以通过 `app.mockHttpclient(url, method, data)` 来 mock 掉 `app.curl` 和 `ctx.curl` 方法，从而实现各种网络异常情况。

例如在 `app/controller/home.js` 中发起了一个 curl 请求：

```js
class HomeController extends Controller {
  async httpclient() {
    const res = await this.ctx.curl('https://eggjs.org');
    this.ctx.body = res.data.toString();
  }
}
```

需要 mock 它的返回值：

```js
describe('GET /httpclient', () => {
  it('should mock httpclient response', () => {
    app.mockHttpclient('https://eggjs.org', {
      // 模拟的参数，可以是 buffer / string / json，
      // 都会转换成 buffer。
      // 按照请求时的 options.dataType 来做对应的转换。
      data: 'mock eggjs.org response',
    });
    return app
      .httpRequest()
      .get('/httpclient')
      .expect('mock eggjs.org response');
  });
});
```

## 示例代码

完整示例代码可以在 [eggjs/examples/unittest](https://github.com/eggjs/examples/blob/master/unittest) 找到。
