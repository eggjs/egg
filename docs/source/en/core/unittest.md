title: Unit Testing
---

## Why Unit Testing

Let's start with a few questions:

- How to measure the quality of code
- How to ensure the quality of code
- Are you free to refactor code
- How to guarantee the correctness of refactored code
- Dare you to release your code without tests

If you hesitate, you probably need unit testing.

Actually, it brings us tremendous profits:
- ensurance of maintaining code quality
- correctness of refactor
- confidence
- automatic running

It's more important to use unit test in web application during the fast iteration, because each testing case can contribute to increase the stability of the application. The result of various inputs in each test is definite, so it's obvious whether the changed code has an impact on correctness or not.

Therefore, such as Controller, Service, Helper, Extend and so on, code requires corresponding unit testing for quality assurances, especially modification of framework or plug-in, of which test coverage is strongly recommended to be 100%.

## Test Framework

When [searching 'test framework' in npm](https://www.npmjs.com/search?q=test%20framework&page=1&ranking=popularity), there are a mass of test frameworks owning their own unique characteristics.
### Mocha

Mocha is our first choice.

> Mocha is a feature-rich JavaScript test framework running on Node.js and in the browser, making asynchronous testing simple and fun. Mocha tests run serially, allowing for flexible and accurate reporting, while mapping uncaught exceptions to the correct test cases.

And it's more efficient to use with another module [co-mocha](https://npmjs.com/co-mocha), which provides multiple ways of implementation, such as generator function and async await.

### AVA

Why not another recently popular framework [AVA](https://github.com/avajs/ava), it looks like faster ?AVA looks great, but practice tells us the truth that it actually makes code harder to write.

Comments from [@dead-horse](https://github.com/dead-horse):
> - AVA is not stable enough, for example, CPU capacity is going to be overloaded when plenty of files are running concurrently. The solution of setting parameter controlling concurrent could work, but 'only mode' would be not functioning.
> - Running cases concurrently makes great demands on code, because each test has to be independent, and it is difficult to implement especially do some mocking work
> - Considering the expensive initialization of app, it's irrational of AVA to execute each file in an independent process initializing their own app while serial framework does only one time.

Comments from [@fool2fish](https://github.com/fool2fish)：
> - It's faster to use AVA in simple application(maybe too simple to judge). But it's not recommended to use in complicate one because of its considerable flaws, such as incapability of offering accurate error stacks; meanwhile, concurrency may cause service relying on other test settings to hang up which reduces the success rate of the test. So process testing, for example, CRUD operations of database, should not use AVA.

## Assertion Library

[Our assertion library](https://www.npmjs.com/search?q=assert&page=1&ranking=popularity), as flourishing as test frameworks, have changed from [assert](https://nodejs.org/api/assert.html) to [should](https://github.com/shouldjs/should.js), and then to [expect](https://github.com/Automattic/expect.js)
, but we are still trying to find better one.

In the end, we come back to the original assertion library because of the appearance of [power-assert](https://github.com/power-assert-js/power-assert) which best expresses [『No API is the best API』](https://github.com/atian25/blog/issues/16).

Shortly, its advantages are:
- No API is the best API. Assert is all.
- ** powerful failure message **
- ** powerful failure message **
- ** powerful failure message **

You may intentionally make mistake in order to see these messages.
![](https://cloud.githubusercontent.com/assets/227713/20919940/19e83de8-bbd9-11e6-8951-bf4a332f9b5a.png)

## Test rule

Framework defined some fundamental rules on unit testing to keep us forcus on coding rather than assistant work, such as how to execute test cases.

All test files have to be named by the pattern of `${filename}.test.js` ending with `.test.js`.

For example:

```bash
test
├── controller
│   └── home.test.js
├── hello.test.js
└── service
    └── user.test.js
```

### Testing tool

Consistently using [egg-bin to launch tests](./development.md#unit_testing) , which automaticlly load modules like mocha, co-mocha, power-assert, istanbul into test scripts, so that we can ** concentrate on writing tests ** without wasting time on the choice of various test tools or modules.

The only thing you need to do is setting `scripts.test` in `package.json`.

```json
{
  "scripts": {
    "test": "egg-bin test"
  }
}
```

Then tests would be launched by executing command `npm test`.

```bas
npm test

> unittest-example@ test /Users/mk2/git/github.com/eggjs/examples/unittest
> egg-bin test

  test/hello.test.js
    ✓ should work

  1 passing (10ms)
```

## Preparation

This chapter introduces you how to write test, and introduction of tests for framework and plugin are located in [framework](../advanced/framework.md) and [plugin](../advanced/plugin.md).

### mock

Generally, a complete application test require initialization and cleanup, such as deleting temporary files or destroy application. Also, we have to deal with exceptional situations like network problem and inaccessible of server.

We extracted an module [egg-mock](https://github.com/eggjs/egg-mock) for mock, help for quick implementation of application unit tests, supporting fast creation of ctx to test.

### app

Before lauching, we have to create an instance of app to test code of application-level like Controller, Middleware, Service.

We can easily create one at Mocha's hook, `before`, through egg-mock.

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

Now, we have a reference of an app instance, and it's the base of all the following tests. See more about app at [`mock.app(options)`](https://github.com/eggjs/egg-mock#options).

It's redundancy to create one instance in each test file, so we offered an bootstrap file in egg-mock to create conveniently.

```js
// test/controller/home.test.js
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('test/controller/home.test.js', () => {
  // test cases
});
```

### ctx 

Except app, tests for Extend, Service and Helper are also taken into consideration. Let's ceate a context through [`app.mockContext(options)`](https://github.com/eggjs/egg-mock#appmockcontextoptions) offered by egg-mock.

```js
it('should get a ctx', () => {
  const ctx = app.mockContext();
  assert(ctx.method === 'GET');
  assert(ctx.url === '/');
});
```

Mocking data on context is also supported.

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

Since we have got the app and the context, you are free to do a lot of tests.

## Testing Order

Pay close attention to testing order, and make sure any chunk of code is executed as you expected.