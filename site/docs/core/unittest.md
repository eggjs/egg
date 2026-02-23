---
title: Unit Testing
order: 2
---

## Why Unit Testing

Let us start with a few questions:

- How to measure the quality of code
- How to ensure the quality of code
- Are you free to refactor code
- How to guarantee the correctness of refactored code
- Have you confidence to release your untested code

If you are not sure, you probably need unit testing.

Actually, it brings us tremendous benefits:

- guarantee the quality of maintaining code
- guarantee the correctness of reconstruction
- enhance confidence
- automation

It's more important to use unit tests in a web application during the fast iteration, because each testing case can contribute to the increasing stability of the application. The result of various inputs in each test is definite, so it's obvious to detect whether the changed code has an impact on correctness or not.

Therefore, code, such as in Controller, Service, Helper, Extend and so on, require corresponding unit testing for quality assurances, especially modification of the framework or plugins, of which test coverage is strongly recommended to be 100%.

## Test Framework

When [searching 'test framework' in npm](https://www.npmjs.com/search?q=test%20framework&page=1&ranking=popularity), there are a mass of test frameworks owning their own unique characteristics.

### Vitest

Starting from `@eggjs/bin` v8, Egg uses [Vitest](https://vitest.dev) as the default test runner. Vitest is a next-generation testing framework powered by Vite, providing native TypeScript support, fast execution, and a modern testing experience.

> Vitest is a blazing fast unit test framework powered by Vite. It provides native ESM support, TypeScript out of the box, and a Vite-powered transformation pipeline.

Key advantages:

- **Native TypeScript support** — no need for ts-node or additional loaders
- **Fast execution** — leverages Vite's transformation pipeline
- **Built-in watch mode** — instant feedback during development
- **Compatible API** — supports `describe`, `it`, `beforeAll`, `afterAll`, etc.
- **Built-in coverage** — via `@vitest/coverage-v8`, no external tools needed

### Mocha (Legacy)

Previous versions of `@eggjs/bin` (v7 and earlier) used [Mocha](http://mochajs.org) as the test runner. If you are migrating from Mocha, note the following hook name changes:

| Mocha          | Vitest                |
| -------------- | --------------------- |
| `before()`     | `beforeAll()`         |
| `after()`      | `afterAll()`          |
| `beforeEach()` | `beforeEach()` (same) |
| `afterEach()`  | `afterEach()` (same)  |

## Assertion Library

We recommend using Node.js built-in [assert](https://nodejs.org/api/assert.html) module for assertions. It follows the principle of 『No API is the best API』— simple, familiar, and requires no additional dependencies.

```js
import assert from 'node:assert';

assert(result.status === 200);
assert.equal(user.name, 'fengmk2');
assert.deepStrictEqual(data, { foo: 'bar' });
```

Vitest also provides a built-in `expect` API if you prefer BDD-style assertions:

```js
import { expect } from 'vitest';

expect(result.status).toBe(200);
expect(user.name).toBe('fengmk2');
```

## Test Rule

Framework defines some fundamental rules on unit testing to keep us focus on coding rather than assistant work, such as how to execute test cases.
Egg does some basic conventions for unit testing.

### Directory Structure

Test code is demand to be put in `test` directory, include `fixtures` and assistant scripts.

Each Test file has to be named by the pattern of `${filename}.test.js`, ending with `.test.js`.

For example:

```bash
test
├── controller
│   └── home.test.js
├── hello.test.js
└── service
    └── user.test.js
```

### Test Tool

Consistently using [egg-bin to launch tests](./development.md#unit_testing), which internally uses [Vitest](https://vitest.dev) to run tests. egg-bin automatically configures vitest with sensible defaults so that we can **concentrate on writing tests** without wasting time on configuration.

Key features provided by egg-bin:

- Auto-detects TypeScript and configures vitest accordingly
- Auto-loads `test/.setup.ts` (or `.setup.js`) as a setup file
- Auto-injects `@eggjs/mock/setup_vitest` for egg applications (handles app lifecycle)
- Injects vitest globals (`describe`, `it`, `beforeAll`, etc.) so plain JS test files work without imports

The only thing you need to do is setting `scripts.test` in `package.json`.

```json
{
  "scripts": {
    "test": "egg-bin test"
  }
}
```

Then tests would be launched by executing `npm test` command.

```bash
npm test

> unittest-example@ test /Users/mk2/git/github.com/eggjs/examples/unittest
> egg-bin test

 ✓ test/hello.test.js (1 test) 10ms

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

## Test Preparation

This chapter introduces you how to write test, and introduction of tests for the framework and plugins are located in [framework](../advanced/framework.md) and [plugin](../advanced/plugin.md).

### mock

Generally, a complete application test requires initialization and cleanup, such as deleting temporary files or destroy application. Also, we have to deal with exceptional situations like network problem and exception visit of server.

We extracted a dedicated mocking helper package: **`@eggjs/mock`** (historically called **egg-mock**), to help implement application unit tests quickly and to create contexts easily.

- Repo (Egg 3.x): https://github.com/eggjs/mock/tree/4.x
- See also: [Mock Helpers (@eggjs/mock / mm)](./mock.md)

### app

Before launching, we have to create an instance of App to test code of application-level like Controller, Middleware or Service.

We can easily create an app instance with `beforeAll` hook through `@eggjs/mock`.

```ts
// test/controller/home.test.ts
import assert from 'node:assert';
import { mock } from '@eggjs/mock';
import { beforeAll, describe } from 'vitest';

describe('test/controller/home.test.ts', () => {
  let app;
  beforeAll(async () => {
    // create a current app instance
    app = mock.app();
    // execute tests after app is ready
    await app.ready();
  });
});
```

Now, we have an app instance, and it's the base of all the following tests. See more about app at [`mock.app(options)`](https://github.com/eggjs/egg-mock#options).

It's redundancy to create an instance in each test file, so we offered a bootstrap file in `@eggjs/mock` to create it conveniently.

```ts
// test/controller/home.test.ts
import { app, mock } from '@eggjs/mock/bootstrap';
import assert from 'node:assert';

describe('test/controller/home.test.ts', () => {
  // test cases
});
```

> **Note:** When using egg-bin, `@eggjs/mock/setup_vitest` is automatically injected as a vitest setup file for egg applications. It handles `beforeAll` (app startup), `afterEach` (mock restore), and `afterAll` (app close) automatically.

### ctx

Except app, tests for Extend, Service and Helper are also taken into consideration. Let's create a context through [`app.mockContext(options)`](https://github.com/eggjs/egg-mock#appmockcontextoptions) offered by `@eggjs/mock`.

```ts
it('should get a ctx', () => {
  const ctx = app.mockContext();
  assert(ctx.method === 'GET');
  assert(ctx.url === '/');
});
```

If we want to mock the data for `ctx.user`, we can do that by passing the data parameter to mockContext:

```ts
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

Since we have got the app and the context, you are free to do a lot of tests.

## Testing Order

Pay close attention to testing order, and make sure any chunk of code is executed as you expected.

Common Error:

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

The test framework loads all the code in the beginning, which means `doSomethingBefore` would be invoked before execution. It's not expected when especially using 'only' to specify the test.

It's supposed to locate in a `beforeAll` hook in the suite of a particular test case.

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

Vitest provides `beforeAll`, `afterAll`, `beforeEach` and `afterEach` to set up preconditions and clean-up after your tests. These keywords could be multiple and execute in strict order.

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

## Asynchronous Test

egg-bin supports asynchronous test:

```js
// using Promise
it('should redirect', () => {
  return app.httpRequest().get('/').expect(302);
});

// using callback
it('should redirect', (done) => {
  app.httpRequest().get('/').expect(302, done);
});

// using async
it('should redirect', async () => {
  await app.httpRequest().get('/').expect(302);
});
```

According to specific situation, you could make different choice of these ways. Multiple asynchronous test cases could be composed to one test with async function, or divided into several independent tests.

## Controller Test

It's the tough part of all application tests, since it's closely related to router configuration. We need use `app.httpRequest()` to return a real instance [SuperTest](https://github.com/visionmedia/supertest), which connects Router and Controller and could also help us to examine param verification of Router by loading boundary conditions. `app.httpRequest()` is a request instance [SuperTest](https://github.com/visionmedia/supertest) which is encapsulated by [egg-mock](https://github.com/eggjs/egg-mock).

Here is an `app/controller/home.js` example.

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

Then a test.

```ts
// test/controller/home.test.ts
import { app } from '@eggjs/mock/bootstrap';
import assert from 'node:assert';

describe('test/controller/home.test.ts', () => {
  describe('GET /', () => {
    it('should status 200 and get the body', () => {
      // load `GET /` request
      return app.httpRequest()
        .get('/')
        .expect(200) // set expectation of status to 200
        .expect('hello world'); // set expectation of body to 'hello world'
    });

    it('should send multi requests', async () => {
      await app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world'); // set expectation of body to 'hello world'

      // once more
      const result = await app.httpRequest()
        .get('/')
        .expect(200)
        .expect('hello world');

      // verify via assert
      assert(result.status === 200);
    });
  });
});
```

`app.httpRequest` based on SuperTest supports a majority of HTTP methods such as GET, POST, PUT, and it provides rich interfaces to construct request, such as a JSON POST request.

```ts
// app/controller/home.js
class HomeController extends Controller {
  async post() {
    this.ctx.body = this.ctx.request.body;
  }
}

// test/controller/home.test.ts
it('should status 200 and get the request body', () => {
  // mock CSRF token, explain later
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

See details at [SuperTest Document](https://github.com/visionmedia/supertest#getting-started).

### mock CSRF

The security plugin of framework would enable [CSRF prevention](./security.md#csrf-prevention) as default. Typically, tests have to precede with a request of page in order to parse CSRF token from the response, and then use the token in later POST requests. But egg-mock provides the `app.mockCsrf()` function to skip the verification of the CSRF token of requests sent by SuperTest.

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

## Service Test

Service is easier to test than Controller. We need to create a ctx, and then get the instance of Service via `ctx.service.${serviceName}`, and then use the instance to test.

For example:

```js
// app/service/user.js
class UserService extends Service {
  async get(name) {
    return await userDatabase.get(name);
  }
}
```

And a test:

```js
describe('get()', () => {
  // using generator function because of asynchronous invoking
  it('should get exists user', async () => {
    // create ctx
    const ctx = app.mockContext();
    // get service.user via ctx
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

Of course it's just a sample, actual code would probably be more complicated.

## Extend Test

It's extendable of Application, Request, Response and Context as well as Helper, and we are able to write specific test cases for extended functions or properties.

### Application

When an app instance is created by egg-mock, the extended functions and properties are already available on the instance and can be tested directly.

For example, we extend the application in `app/extend/application` to support cache based on [ylru](https://github.com/node-modules/ylru).

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

A corresponding test:

```js
describe('get lru', () => {
  it('should get a lru and it work', () => {
    // set cache
    app.lru.set('foo', 'bar');
    // get cache
    assert(app.lru.get('foo') === 'bar');
  });
});
```

As you can see, it's easy.

### Context

Compared to Application, you need only one more step for Context tests, which is to create an Context instance via `app.mockContext`.

Such as adding a property named `isXHR` to `app/extend/context.js` to present whether or not the request was submitted via [XMLHttpRequest](https://developer.mozilla.org/zh-CN/docs/Web/API/XMLHttpRequest/setRequestHeader).

```js
module.exports = {
  get isXHR() {
    return this.get('X-Requested-With') === 'XMLHttpRequest';
  },
};
```

A corresponding test:

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

Extended properties and function are available on `ctx.request`, so they can be tested directly.

For example, provide a `isChrome` property to `app/extend/request.js` to verify requests whether they are from Chrome or not.

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

A corresponding test:

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

Identical with Request, Response test could be based on `ctx.response` directly, accessing all the extended functions and properties.

For example, provide an `isSuccess` property to indicate current status code equal to 200 or not.

```js
module.exports = {
  get isSuccess() {
    return this.status === 200;
  },
};
```

The corresponding test:

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

Similar to Service, Helper is available on ctx, which can be tested directly.

Such as `app/extend/helper.js`:

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

A corresponding test:

```js
describe('money()', () => {
  it('should RMB', () => {
    const ctx = app.mockContext({
      // mock headers of ctx
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

## Mock Function

Except functions mentioned above, like `app.mockContext()` and `app.mockCsrf()`, egg-mock provides [quite a few mocking functions](https://github.com/eggjs/egg-mock#api) to make writing tests easier.

- To prevent console logs through `mock.consoleLevel('NONE')`
- To mock session data through `app.mockSession(data)`

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

Remember to restore mock data in an `afterEach` hook, otherwise it would take effect with all the tests that supposed to be independent to each other.

```ts
describe('some test', () => {
  // beforeAll hook

  afterEach(() => mock.restore());

  // it tests
});
```

**When using egg-bin, `@eggjs/mock/setup_vitest` is automatically injected, which resets all mocks in an `afterEach` hook. You don't need to write this code manually.**

The following will describe the common usage of egg-mock.

### Mock Properties And Functions

Egg-mock is extended from [mm](https://github.com/node-modules/mm) module which contains full features of mm, so we can directly mock any objects' properties and functions.

#### Mock Properties

Mock `app.config.baseDir` to return a given value - `/tmp/mockapp`.

```js
mock(app.config, 'baseDir', '/tmp/mockapp');
assert(app.config.baseDir === '/tmp/mockapp');
```

#### Mock Functions

Mock `fs.readFileSync` to return a given function.

```js
mock(fs, 'readFileSync', (filename) => {
  return 'hello world';
});
assert(fs.readFileSync('foo.txt') === 'hello world');
```

See more detail in [mm API](https://github.com/node-modules/mm#api), include advanced usage like `mock.data()`，`mock.error()` and so on.

### Mock Service

Service is a standard built-in member of the framework, `app.mockService(service, methodName, fn)` is offered to conveniently mock its result.

For example, mock the method `get(name)` in `app/service/user` to return a nonexistent user.

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
      // return an originally nonexistent user
      .expect({
        name: 'fengmk1',
      })
  );
});
```

Using `app.mockServiceError(service, methodName, error)` to mock exception.

For example, mock the method `get(name)` in `app/service/user` to throw an exception.

```js
it('should mock service error', () => {
  app.mockServiceError('user', 'get', 'mock user service error');
  return (
    app
      .httpRequest()
      .get('/user?name=fengmk2')
      // service exception causing the 500 status code
      .expect(500)
      .expect(/mock user service error/)
  );
});
```

### Mock HttpClient

External HTTP requests should be performed though [HttpClient](./httpclient.md), a built-in member of Egg, and `app.mockHttpclient(url, method, data)` is able to simulate various network exceptions of requests performed by `app.curl` and `ctx.curl`.

For example, we submit a request in `app/controller/home.js`.

```js
class HomeController extends Controller {
  async httpclient() {
    const res = await this.ctx.curl('https://eggjs.org');
    this.ctx.body = res.data.toString();
  }
}
```

Then mock it's response.

```js
describe('GET /httpclient', () => {
  it('should mock httpclient response', () => {
    app.mockHttpclient('https://eggjs.org', {
      // parameter allowed to be a buffer / string / json,
      // will be finally converted to buffer
      // according to options.dataType
      data: 'mock eggjs.org response',
    });
    return app
      .httpRequest()
      .get('/httpclient')
      .expect('mock eggjs.org response');
  });
});
```

## Sample Code

All sample code can be found in [eggjs/exmaples/unittest](https://github.com/eggjs/examples/blob/master/unittest)

[vitest]: https://vitest.dev
