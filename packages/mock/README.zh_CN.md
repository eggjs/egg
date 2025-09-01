# @eggjs/mock

[![NPM version][npm-image]][npm-url]
[![Node.js CI](https://github.com/eggjs/mock/actions/workflows/nodejs.yml/badge.svg)](https://github.com/eggjs/mock/actions/workflows/nodejs.yml)
[![Test coverage][codecov-image]][codecov-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/mock.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/mock.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/mock
[codecov-image]: https://codecov.io/github/eggjs/mock/coverage.svg?branch=master
[codecov-url]: https://codecov.io/github/eggjs/mock?branch=master
[download-image]: https://img.shields.io/npm/dm/@eggjs/mock.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/mock

一个数据模拟的库，更方便地测试 Egg 应用、插件及自定义 Egg 框架。
`@eggjs/mock` 拓展自 [node_modules/mm](https://github.com/node-modules/mm)，你可以使用所有 `mm` 包含的 API。

## Install

```bash
npm i egg-mock --save-dev
```

## Usage

### 创建测试用例

通过 `mm.app` 启动应用，可以使用 App 的 API 模拟数据

```js
// test/index.test.js
const path = require('path');
const mm = require('@eggjs/mock');

describe('some test', () => {
  let app;
  before(() => {
    app = mm.app({
      baseDir: 'apps/foo'
    });
    return app.ready();
  })
  after(() => app.close());

  it('should request /', () => {
    return app.httpRequest()
      .get('/')
      .expect(200);
  });
});
```

使用 `mm.app` 启动后可以通过 `app.agent` 访问到 agent 对象。

使用 `mm.cluster` 启动多进程测试，API 与 `mm.app` 一致。

### 应用开发者

应用开发者不需要传入 baseDir，其为当前路径

```js
before(() => {
  app = mm.app({
    framework: path.join(__dirname, '../node_modules/egg'),
  });
  return app.ready();
});
```

### 框架开发者

框架开发者需要指定 `framework`，会将当前路径指定为框架入口

```js
before(() => {
  app = mm.app({
    baseDir: 'apps/demo',
    framework: true,
  });
  return app.ready();
});
```

### 插件开发者

在插件目录下执行测试用例时，只要 `package.json` 中有 `eggPlugin.name` 字段，就会自动把当前目录加到插件列表中。

```js
before(() => {
  app = mm.app({
    baseDir: 'apps/demo',
  });
  return app.ready();
});
```

也可以通过 `framework` 指定其他框架，比如希望在 aliyun-egg 和 framework-b 同时测试此插件。

```js
describe('aliyun-egg', () => {
  let app;
  before(() => {
    app = mm.app({
      baseDir: 'apps/demo',
      framework: path.join(__dirname, 'node_modules/aliyun-egg'),
    });
    return app.ready();
  });
});

describe('framework-b', () => {
  let app;
  before(() => {
    app = mm.app({
      baseDir: 'apps/demo',
      framework: path.join(__dirname, 'node_modules/framework-b'),
    });
    return app.ready();
  });
});
```

如果当前目录确实是一个 egg 插件，但是又不想当它是一个插件来测试，可以通过 `options.plugin` 选项来关闭：

```js
before(() => {
  app = mm.app({
    baseDir: 'apps/demo',
    plugin: false,
  });
  return app.ready();
});
```

## API

### mm.app(options)

创建一个 mock 的应用。

### mm.cluster(options)

创建一个多进程应用，因为是多进程应用，无法获取 worker 的属性，只能通过 supertest 请求。

```js
const mm = require('@eggjs/mock');

describe('test/app.js', () => {
  let app, config;
  before(() => {
    app = mm.cluster();
    return app.ready();
  });
  after(() => app.close());

  it('some test', () => {
    return app.httpRequest()
      .get('/config')
      .expect(200)
  });
});
```

默认会启用覆盖率，因为覆盖率比较慢，可以设置 coverage 关闭

```js
mm.cluster({
  coverage: false,
});
```

### mm.env(env)

设置环境变量，主要用于启动阶段，运行阶段可以使用 app.mockEnv。

```js
// 模拟生成环境
mm.env('prod');
mm.app({
  cache: false,
});
```

具体值见 <https://github.com/eggjs/egg-core/blob/master/lib/loader/egg_loader.js#L82>

### mm.consoleLevel(level)

mock 终端日志打印级别

```js
// 不输出到终端
mm.consoleLevel('NONE');
```

可选 level 为 `DEBUG`, `INFO`, `WARN`, `ERROR`, `NONE`

### mm.home(homePath)

模拟操作系统用户目录

### mm.restore

还原所有 mock 数据，一般需要结合 `afterEach(mm.restore)` 使用

### options

mm.app 和 mm.cluster 的配置参数

#### baseDir {String}

当前应用的目录，如果是应用本身的测试可以不填默认为 $CWD。

指定完整路径

```js
mm.app({
  baseDir: path.join(__dirname, 'fixtures/apps/demo'),
});
```

也支持缩写，找 test/fixtures 目录下的

```js
mm.app({
  baseDir: 'apps/demo',
});
```

#### framework {String/Boolean}

指定框架路径

```js
mm.app({
  baseDir: 'apps/demo',
  framework: path.join(__dirname, 'fixtures/egg'),
});
```

对于框架的测试用例，可以指定 true，会自动加载当前路径。

#### plugin

指定插件的路径，只用于插件测试。设置为 true 会将当前路径设置到插件列表。

```js
mm.app({
  baseDir: 'apps/demo',
  plugin: true,
})
```

#### plugins {Object}

传入插件列表，可以自定义多个插件

#### cache {Boolean}

是否需要缓存，默认开启。

是通过 baseDir 缓存的，如果不需要可以关闭，但速度会慢。

#### clean {Boolean}

是否需要清理 log 目录，默认开启。

如果是通过 ava 等并行测试框架进行测试，需要手动在执行测试前进行统一的日志清理，不能通过 mm 来处理，设置 `clean` 为 `false`。

### app.mockLog([logger]) and app.expectLog(str[, logger]), app.notExpectLog(str[, logger])

断言指定的字符串记录在指定的日志中。
建议 `app.mockLog()` 和 `app.expectLog()` 或者 `app.notExpectLog()` 配对使用。
单独使用 `app.expectLog()` 或者 `app.notExpectLog()` 需要依赖日志的写入速度，在服务器磁盘高 IO 的时候，会出现不稳定的结果。

```js
it('should work', async () => {
  // 将日志记录到内存，用于下面的 expectLog
  app.mockLog();
  await app.httpRequest()
    .get('/')
    .expect('hello world')
    .expect(200);

  app.expectLog('foo in logger');
  app.expectLog('foo in coreLogger', 'coreLogger');
  app.expectLog('foo in myCustomLogger', 'myCustomLogger');

  app.notExpectLog('bar in logger');
  app.notExpectLog('bar in coreLogger', 'coreLogger');
  app.notExpectLog('bar in myCustomLogger', 'myCustomLogger');
});
```

### app.httpRequest()

请求当前应用 http 服务的辅助工具。

```js
it('should work', () => {
  return app.httpRequest()
    .get('/')
    .expect('hello world')
    .expect(200);
});
```

更多信息请查看 [supertest](https://github.com/visionmedia/supertest) 的 API 说明。

#### .unexpectHeader(name)

断言当前请求响应不包含指定 header

```js
it('should work', () => {
  return app.httpRequest()
    .get('/')
    .unexpectHeader('set-cookie')
    .expect(200);
});
```

#### .expectHeader(name)

断言当前请求响应包含指定 header

```js
it('should work', () => {
  return app.httpRequest()
    .get('/')
    .expectHeader('set-cookie')
    .expect(200);
});
```

### app.mockContext(options)

模拟上下文数据

```js
const ctx = app.mockContext({
  user: {
    name: 'Jason'
  }
});
console.log(ctx.user.name); // Jason
```

### app.mockContextScope(fn, options)

安全的模拟上下文数据，同一用例用多次调用 mockContext 可能会造成 AsyncLocalStorage 污染

```js
await app.mockContextScope(async ctx => {
  console.log(ctx.user.name); // Jason
}, {
  user: {
    name: 'Jason'
  }
});
```

### app.mockCookies(data)

```js
app.mockCookies({
  foo: 'bar'
});
const ctx = app.mockContext();
console.log(ctx.getCookie('foo'));
```

### app.mockHeaders(data)

模拟请求头

### app.mockSession(data)

```js
app.mockSession({
  foo: 'bar'
});
const ctx = app.mockContext();
console.log(ctx.session.foo);
```

### app.mockService(service, methodName, fn)

```js
it('should mock user name', async function() {
  app.mockService('user', 'getName', async function(ctx, methodName, args) {
    return 'popomore';
  });
  const ctx = app.mockContext();
  await ctx.service.user.getName();
});
```

### app.mockServiceError(service, methodName, error)

可以模拟一个错误

```js
app.mockServiceError('user', 'home', new Error('mock error'));
```

### app.mockCsrf()

模拟 csrf，不用传递 token

```js
app.mockCsrf();

return app.httpRequest()
  .post('/login')
  .expect(302);
```

### app.mockHttpclient(url, method, data)

模拟 httpclient 的请求，例如 `ctx.curl`

```js
app.get('/', async ctx => {
  const ret = await ctx.curl('https://eggjs.org');
  this.body = ret.data.toString();
});

app.mockHttpclient('https://eggjs.org', {
  // 模拟的参数，可以是 buffer / string / json / function
  // 都会转换成 buffer
  // 按照请求时的 options.dataType 来做对应的转换
  data: 'mock egg',
});

return app.httpRequest()
  .post('/')
  .expect('mock egg');
```

## Bootstrap

我们提供了一个 bootstrap 来减少单测中的重复代码:

```js
const { app, mock, assert } = require('@eggjs/mock/bootstrap');

describe('test app', () => {
  it('should request success', () => {
    // mock data will be restored each case
    mock.data(app, 'method', { foo: 'bar' });
    return app.httpRequest()
      .get('/foo')
      .expect(res => {
        assert(!res.headers.foo);
      })
      .expect(/bar/);
  });
});

describe('test ctx', () => {
  it('can use ctx', async function() {
    const res = await this.ctx.service.foo();
    assert(res === 'foo');
  });
});
```

我们将会在每个 case 中自定注入 ctx, 可以通过 `app.currentContext` 来获取当前的 ctx。
并且第一次使用 `app.mockContext` 会自动复用当前 case 的上下文。

```js
const { app, mock, assert } = require('@eggjs/mock/bootstrap');

describe('test ctx', () => {
  it('should can use ctx', () => {
    const ctx = app.currentContext;
    assert(ctx);
  });

  it('should reuse ctx', () => {
    const ctx = app.currentContext;
    // 第一次调用会复用上下文
    const mockCtx = app.mockContext();
    assert(ctx === mockCtx);
    // 后续调用会新建上下文
    // 极不建议多次调用 app.mockContext
    // 这会导致上下文污染
    // 建议使用 app.mockContextScope
    const mockCtx2 = app.mockContext();
    assert(ctx !== mockCtx);
  });
});
```

### env for custom bootstrap

EGG_BASE_DIR: the base dir of egg app
EGG_FRAMEWORK: the framework of egg app

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/mock)](https://github.com/eggjs/mock/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
