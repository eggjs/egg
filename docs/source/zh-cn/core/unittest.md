title: 单元测试
---

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

Web 应用中的单元测试更加重要，在 Web 产品快速迭代的时期，每个测试用例都给应用的稳定性提供了一层保障。
API 升级，测试用例可以很好地检查代码是否向下兼容。
对于各种可能的输入，一旦测试覆盖，都能明确它的输出。
代码改动后，可以通过测试结果判断代码的改动是否影响已确定的结果。

所以，应用的 Controller、Service、Helper、Extend 等代码，都必须有对应的单元测试保证代码质量。
当然，框架和插件的每个功能改动和重构都需要有相应的单元测试，并且要求尽量做到修改的代码能被 100% 覆盖到。

## 测试框架

从 [npm 搜索『test framework』](https://www.npmjs.com/search?q=test%20framework&page=1&ranking=popularity)，
我们会发现有大量测试框架存在，每个测试框架都有它的独特之处。

### Mocha

我们选择和推荐大家使用 [Mocha](http://mochajs.org)，功能非常丰富，支持运行在 Node.js 和浏览器中，
对异步测试支持非常友好。

> Mocha is a feature-rich JavaScript test framework running on Node.js and in the browser, making asynchronous testing simple and fun. Mocha tests run serially, allowing for flexible and accurate reporting, while mapping uncaught exceptions to the correct test cases.

### AVA

为什么没有选择最近比较火的 [AVA](https://github.com/avajs/ava)，它看起来会跑得很快。
经过我们几个真实项目实践下来，AVA 真的只是看起来很美，但是实际会让测试代码越来越难写，成本越来越高。

[@dead-horse](https://github.com/dead-horse) 的评价：
> - AVA 自身不够稳定，并发运行文件多的时候会撑爆 CPU；如果设置控制并发参数的方式运行，会导致 only 模式无效。
> - 并发执行对测试用例的要求很高，所有的测试不能有依赖，特别是遇到一些需要做 mock 的场景时，写好很难。
> - app 在初始化的时候是有耗时的，如果串行运行，只需要初始化一个 app 对它测试。
>   但是 AVA 每一个文件都运行在独立进程，有多少个文件就需要初始化多少个 app。

[@fool2fish](https://github.com/fool2fish) 的评价：
> 如果是简单的程序的话用 AVA 会快一些（但是本来就简单可能也没啥感觉），
> 如果是复杂的就不推荐了，比较大的问题是可能没法给出准确的错误堆栈，
> 另外并发可能会导致依赖的其他测试环境的服务挂掉，降低测试的成功率，
> 还有就是带流程的测试（比如测试数据库的增删改查功能）真心不适合用 AVA。

## 断言库

同样，测试断言库也是[百花齐放的时代](https://www.npmjs.com/search?q=assert&page=1&ranking=popularity)，
我们经历过 [assert](https://nodejs.org/api/assert.html)，到 [should](https://github.com/shouldjs/should.js) 和 [expect](https://github.com/Automattic/expect.js)，还是不断地在尝试更好的断言库。

直到我们发现 [power-assert]，
因为[『No API is the best API』](https://github.com/atian25/blog/issues/16)，
最终我们重新回归原始的 assert 作为默认的断言库。

简单地说，它的优点是：
- 没有 API 就是最好的 API，不需要任何记忆，只需 assert 即可。
- **强大的错误信息反馈**
- **强大的错误信息反馈**
- **强大的错误信息反馈**

报错信息实在太美太详细，让人有种想看错误报告的欲望：

![](https://cloud.githubusercontent.com/assets/227713/20919940/19e83de8-bbd9-11e6-8951-bf4a332f9b5a.png)

## 测试约定

为了让我们更多地关注测试用例本身如何编写，而不是耗费时间在如何运行测试脚本等辅助工作上，
框架对单元测试做了一些基本约定。

### 测试目录结构

我们约定 `test` 目录为存放所有测试脚本的目录，测试所使用到的 `fixtures` 和相关辅助脚本都应该放在此目录下。

测试脚本文件统一按 `${filename}.test.js` 命名，必须以 `.test.js` 作为文件后缀。

一个应用的测试目录示例：

```bash
test
├── controller
│   └── home.test.js
├── hello.test.js
└── service
    └── user.test.js
```

### 测试运行工具

统一使用 [egg-bin 来运行测试脚本](./development.md#单元测试)，
自动将内置的 [Mocha]、[co-mocha]、[power-assert]，[nyc] 等模块组合引入到测试脚本中，
让我们**聚焦精力在编写测试代码**上，而不是纠结选择那些测试周边工具和模块。

只需要在 `package.json` 上配置好 `scripts.test` 即可。

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

  test/hello.test.js
    ✓ should work

  1 passing (10ms)
```

## 准备测试

本文主要介绍如何编写应用的单元测试，关于框架和插件的单元测试请查看[框架开发](../advanced/framework.md)和[插件开发](../advanced/plugin.md)相关章节。

### mock

正常来说，如果要完整手写一个 app 创建和启动代码，还是需要写一段初始化脚本的，
并且还需要在测试跑完之后做一些清理工作，如删除临时文件，销毁 app。

常常还有模拟各种网络异常，服务访问异常等特殊情况。

所以我们单独为框架抽取了一个测试 mock 辅助模块：[egg-mock](https://github.com/eggjs/egg-mock)，
有了它我们就可以非常快速地编写一个 app 的单元测试，并且还能快速创建一个 ctx 来测试它的属性、方法和 Service 等。

### app

在测试运行之前，我们首先要创建应用的一个 app 实例，
通过它来访问需要被测试的 Controller、Middleware、Service 等应用层代码。

通过 egg-mock，结合 Mocha 的 `before` 钩子就可以便捷地创建出一个 app 实例。

```js
// test/controller/home.test.js
const assert = require('assert');
const mock = require('egg-mock');

describe('test/controller/home.test.js', () => {
  let app;
  before(() => {
    // 创建当前应用的 app 实例
    app = mock.app();
    // 等待 app 启动成功，才能执行测试用例
    return app.ready();
  });
});
```

这样我们就拿到了一个 app 的引用，接下来所有测试用例都会基于这个 app 进行。
更多关于创建 app 的信息请查看 [`mock.app(options)`](https://github.com/eggjs/egg-mock#options) 文档。

每一个测试文件都需要这样创建一个 app 实例非常冗余，因此 egg-mock 提供了一个 bootstrap 文件，可以直接从它上面拿到我们所常用的实例：

```js
// test/controller/home.test.js
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('test/controller/home.test.js', () => {
  // test cases
});
```

### ctx

我们除了 app，还需要一种方式便捷地拿到 ctx，方便我们进行 Extend、Service、Helper 等测试。
而我们已经通过上面的方式拿到了一个 app，结合 egg-mock 提供的 [`app.mockContext(options)`](https://github.com/eggjs/egg-mock#appmockcontextoptions) 方法来快速创建一个 ctx 实例。

```js
it('should get a ctx', () => {
  const ctx = app.mockContext();
  assert(ctx.method === 'GET');
  assert(ctx.url === '/');
});
```

如果我们想模拟 `ctx.user` 这个数据，也可以通过给 mockContext 传递 data 参数实现：

```js
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

现在我们拿到了 app，也知道如何创建一个 ctx 了，那么就可以进行更多代码的单元测试了。

## 测试执行顺序

特别需要注意的是执行顺序，尽量保证在执行某个用例的时候执行相关代码。

常见的错误写法

```js
// Bad
const { app } = require('egg-mock/bootstrap');

describe('bad test', () => {
  doSomethingBefore();

  it('should redirect', () => {
    return app.httpRequest()
      .get('/')
      .expect(302);
  });
});
```

Mocha 刚开始运行的时候会载入所有用例，这时 describe 方法就会被调用，那 `doSomethingBefore` 就会启动。
如果希望使用 only 的方式只执行某个用例那段代码还是会被执行，这是非预期的。

正确的做法是将其放到 before 中，只有运行这个套件中某个用例才会执行。

```js
// Good
const { app } = require('egg-mock/bootstrap');

describe('good test', () => {
  before(() => doSomethingBefore());

  it('should redirect', () => {
    return app.httpRequest()
      .get('/')
      .expect(302);
  });
});
```

Mocha 使用 before/after/beforeEach/afterEach 来处理前置后置任务，基本能处理所有问题。
每个用例会按 before -> beforeEach -> it -> afterEach -> after 的顺序执行，而且可以定义多个。

```js
describe('egg test', () => {
  before(() => console.log('order 1'));
  before(() => console.log('order 2'));
  after(() => console.log('order 6'));
  beforeEach(() => console.log('order 3'));
  afterEach(() => console.log('order 5'));
  it('should worker', () => console.log('order 4'));
});
```

## 异步测试

egg-bin 支持测试异步调用，它支持多种写法：

```js
// 使用返回 Promise 的方式
it('should redirect', () => {
  return app.httpRequest()
    .get('/')
    .expect(302);
});

// 使用 callback 的方式
it('should redirect', done => {
  app.httpRequest()
    .get('/')
    .expect(302, done);
});

// 使用 async
it('should redirect', async () => {
  await app.httpRequest()
    .get('/')
    .expect(302);
});
```

使用哪种写法取决于不同应用场景，如果遇到多个异步可以使用 async function，也可以拆分成多个测试用例。

## Controller 测试

Controller 在整个应用代码里面属于比较难测试的部分了，因为它跟 router 配置紧密相关，
我们需要利用 `app.httpRequest()` [SuperTest](https://github.com/visionmedia/supertest) 发起一个真实请求，
来将 Router 和 Controller 连接起来，并且可以帮助我们发送各种满足边界条件的请求数据，
以测试 Controller 的参数校验完整性。 `app.httpRequest()` 是 [egg-mock](https://github.com/eggjs/egg-mock) 封装的 [SuperTest](https://github.com/visionmedia/supertest) 请求实例。

例如我们要给 `app/controller/home.js`：

```js
// app/router.js
module.exports = app => {
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

写一个完整的单元测试，它的测试代码 `test/controller/home.test.js` 如下：

```js
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('test/controller/home.test.js', () => {
  describe('GET /', () => {
    it('should status 200 and get the body', () => {
      // 对 app 发起 `GET /` 请求
      return app.httpRequest()
        .get('/')
        .expect(200) // 期望返回 status 200
        .expect('hello world'); // 期望 body 是 hello world
    });

    it('should send multi requests', async () => {
      // 使用 generator function 方式写测试用例，可以在一个用例中串行发起多次请求
      await app.httpRequest()
        .get('/')
        .expect(200) // 期望返回 status 200
        .expect('hello world'); // 期望 body 是 hello world

      // 再请求一次
      const result = await app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world');

      // 也可以这样验证
      assert(result.status === 200);
    });
  });
});
```

通过基于 SuperTest 的 `app.httpRequest()` 可以轻松发起 GET、POST、PUT 等 HTTP 请求，并且它有非常丰富的请求数据构造接口，
例如以 POST 方式发送一个 JSON 请求：

```js
// app/controller/home.js
class HomeController extends Controller {
  async post() {
    this.ctx.body = this.ctx.request.body;
  }
}

// test/controller/home.test.js
it('should status 200 and get the request body', () => {
  // 模拟 CSRF token，下文会详细说明
  app.mockCsrf();
  return app.httpRequest()
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

更详细的 HTTP 请求构造方式，请查看 [SuperTest 文档](https://github.com/visionmedia/supertest#getting-started)。

### mock CSRF

框架的默认安全插件会自动开启 [CSRF 防护](./security.md#安全威胁csrf的防范)，
如果完整走 CSRF 校验逻辑，那么测试代码需要先请求一次页面，通过解析 HTML 拿到 CSRF token，
然后再使用此 token 发起 POST 请求。

所以 egg-mock 对 app 增加了 `app.mockCsrf()` 方法来模拟取 CSRF token 的过程。
这样在使用 SuperTest 请求 app 就会自动通过 CSRF 校验。

```js
app.mockCsrf();
return app.httpRequest()
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

## Service 测试

Service 相对于 Controller 来说，测试起来会更加简单，
我们只需要先创建一个 ctx，然后通过 `ctx.service.${serviceName}` 拿到 Service 实例，
然后调用 Service 方法即可。

例如

```js
// app/service/user.js
class UserService extends Service {
  async get(name) {
    return await userDatabase.get(name);
  }
}
```

编写单元测试：

```js
describe('get()', () => {
  it('should get exists user', async () => {
    // 创建 ctx
    const ctx = app.mockContext();
    // 通过 ctx 访问到 service.user
    const user = await ctx.service.user.get('fengmk2');
    assert(user);
    assert(user.name === 'fengmk2');
  });

  it('should get null when user not exists', async () => {
    const ctx = app.mockContext();
    const user = await ctx.service.user.get('fengmk1');
    assert(!user);
  });
});
```

当然，实际的 Service 代码不会像我们示例中那么简单，这里只是展示如何测试 Service 而已。

## Extend 测试

应用可以对 Application、Request、Response、Context 和 Helper 进行扩展。
我们可以对扩展的方法或者属性针对性的编写单元测试。

### Application

egg-mock 创建 app 的时候，已经将 Application 的扩展自动加载到 app 实例了，
直接使用这个 app 实例访问扩展的属性和方法即可进行测试。

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
  it('should get a lru and it work', () => {
    // 设置缓存
    app.lru.set('foo', 'bar');
    // 读取缓存
    assert(app.lru.get('foo') === 'bar');
  });
});
```

可以看到，测试 Application 的扩展是最容易的。

### Context

Context 测试只比 Application 多了一个 `app.mockContext()` 步骤来模拟创建一个 Context 对象。

例如在 `app/extend/context.js` 中增加一个 `isXHR` 属性，判断是否通过 [XMLHttpRequest](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/setRequestHeader) 发起的请求：

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
  it('should true', () => {
    const ctx = app.mockContext({
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
    assert(ctx.isXHR === true);
  });

  it('should false', () => {
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

通过 `ctx.request` 来访问 Request 扩展的属性和方法，直接即可进行测试。

例如在 `app/extend/request.js` 中增加一个 `isChrome` 属性，判断是否 Chrome 浏览器发起的请求：

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
  it('should true', () => {
    const ctx = app.mockContext({
      headers: {
        'User-Agent': 'Chrome/56.0.2924.51',
      },
    });
    assert(ctx.request.isChrome === true);
  });

  it('should false', () => {
    const ctx = app.mockContext({
      headers: {
        'User-Agent': 'FireFox/1',
      },
    });
    assert(ctx.request.isChrome === false);
  });
});
```

### Response

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
  it('should true', () => {
    const ctx = app.mockContext();
    ctx.status = 200;
    assert(ctx.response.isSuccess === true);
  });

  it('should false', () => {
    const ctx = app.mockContext();
    ctx.status = 404;
    assert(ctx.response.isSuccess === false);
  });
});
```

### Helper

Helper 测试方式与 Service 类似，也是通过 ctx 来访问到 Helper，然后调用 Helper 方法测试。

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
  it('should RMB', () => {
    const ctx = app.mockContext({
      // 模拟 ctx 的 headers
      headers: {
        'Accept-Language': 'zh-CN,zh;q=0.5',
      },
    });
    assert(ctx.helper.money(100) === '￥ 100');
  });

  it('should US Dolar', () => {
    const ctx = app.mockContext();
    assert(ctx.helper.money(100) === '$ 100');
  });
});
```

## Mock 方法

egg-mock 除了上面介绍过的 `app.mockContext()` 和 `app.mockCsrf()` 方法外，还提供了[非常多的 mock 方法](https://github.com/eggjs/egg-mock#api)帮助我们便捷地写单元测试。

- 如我们不想在终端 console 输出任何日志，可以通过 `mock.consoleLevel('NONE')` 来模拟。
- 又如我想模拟一次请求的 Session 数据，可以通过 `app.mockSession(data)` 来模拟。

  ```js
  describe('GET /session', () => {
    it('should mock session work', () => {
      app.mockSession({
        foo: 'bar',
        uid: 123,
      });
      return app.httpRequest()
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

因为 mock 之后会一直生效，我们需要避免每个单元测试用例之间是不能相互 mock 污染的，
所以通常我们都会在 `afterEach` 钩子里面还原掉所有 mock。

```js
describe('some test', () => {
  // before hook

  afterEach(mock.restore);

  // it tests
});
```

**引入 `egg-mock/bootstrap` 时，会自动在 `afterEach` 钩子中还原所有的 mock，不需要在测试文件中再次编写。**

下面会详细解释一下 egg-mock 的常见使用场景。

### Mock 属性和方法

因为 egg-mock 是扩展自 [mm](https://github.com/node-modules/mm) 模块，
它包含了 mm 的所有功能，这样我们就可以非常方便地 mock 任意对象的属性和方法了。

#### Mock 一个对象的属性

mock `app.config.baseDir` 指向 `/tmp/mockapp`

```js
mock(app.config, 'baseDir', '/tmp/mockapp');
assert(app.config.baseDir === '/tmp/mockapp');
```

#### Mock 一个对象的方法

mock `fs.readFileSync` 返回 `hello world`

```js
mock(fs, 'readFileSync', filename => {
  return 'hello world';
});
assert(fs.readFileSync('foo.txt') === 'hello world');
```

还有 `mock.data()`，`mock.error()` 等更多高级的 mock 方法，
详细使用说明请查看 [mm API](https://github.com/node-modules/mm#api)。

### Mock Service

Service 作为框架标准的内置对象，我们提供了便捷的 `app.mockService(service, methodName, fn)` 模拟 Service 方法返回值。

例如，模拟 `app/service/user` 中的 `get(name)` 方法，让它返回一个本来不存在的用户数据。

```js
it('should mock fengmk1 exists', () => {
  app.mockService('user', 'get', () => {
    return {
      name: 'fengmk1',
    };
  });

  return app.httpRequest()
    .get('/user?name=fengmk1')
    .expect(200)
    // 返回了原本不存在的用户信息
    .expect({
      name: 'fengmk1',
    });
});
```

通过 `app.mockServiceError(service, methodName, error)` 可以模拟 Service 调用异常。

例如，模拟 `app/service/user` 中的 `get(name)` 方法调用异常：

```js
it('should mock service error', () => {
  app.mockServiceError('user', 'get', 'mock user service error');
  return app.httpRequest()
    .get('/user?name=fengmk2')
    // service 异常，触发 500 响应
    .expect(500)
    .expect(/mock user service error/);
});
```

### Mock HttpClient

框架内置了 [HttpClient](./httpclient.md)，应用发起的对外 HTTP 请求基本都是通过它来处理。
我们可以通过 `app.mockHttpclient(url, method, data)` 来 mock 掉 `app.curl` 和 `ctx.curl` 方法，
从而实现各种网络异常情况。

例如在 `app/controller/home.js` 中发起了一个 curl 请求

```js
class HomeController extends Controller {
  async httpclient () {
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
      // 都会转换成 buffer
      // 按照请求时的 options.dataType 来做对应的转换
      data: 'mock eggjs.org response',
    });
    return app.httpRequest()
      .get('/httpclient')
      .expect('mock eggjs.org response');
  });
});
```

## 示例代码

完整示例代码可以在 [eggjs/exmaples/unittest](https://github.com/eggjs/examples/blob/master/unittest) 找到。

[Mocha]: https://mochajs.org
[co-mocha]: https://github.com/blakeembrey/co-mocha
[nyc]: https://github.com/istanbuljs/nyc
[power-assert]: https://github.com/power-assert-js/power-assert
