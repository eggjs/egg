title: 快速入门
---

本文将从实例的角度，一步步地搭建出一个 egg 应用，让你能快速的入门 egg。

## 环境准备

- 操作系统：支持 OSX，Linux，Windows
- 运行环境：建议选择 [LTS 版本][node]，最低要求 6.x

## 快速初始化

通过脚手架快速生成项目:

```bash
$ npm i egg-init -g
$ egg-init egg-example --type=simple
$ cd egg-example
$ npm i
```

启动项目:

```bash
$ npm run dev
$ open localhost:7001
```

## 逐步搭建

通常你可以通过上一节的方式，使用 [egg-init] 快速选择适合对应业务模型的脚手架，快速启动 egg 项目的开发。

但为了让大家更好的了解 egg，接下来，我们将跳过脚手架，手动一步步的搭建出一个 [egg hackernews](https://github.com/eggjs/examples/tree/master/hackernews)。

![Egg HackerNews Snapshoot](https://cloud.githubusercontent.com/assets/227713/22960991/812999bc-f37d-11e6-8bd5-a96ca37d0ff2.png)

### 初始化项目

先来初始化下目录结构：

```bash
$ mkdir egg-example
$ cd egg-example
$ npm init
$ npm i egg --save
$ npm i egg-bin --save-dev
```

添加 `npm scripts` 到 `package.json`：

```json
{
  "name": "egg-example",
  "scripts": {
    "dev": "egg-bin dev"
  }
}
```

### 编写 controller

如果你熟悉 Web 开发或 MVC，肯定猜到我们第一步需要编写的是 [controller](../basics/controller.md) 和 [router](../basics/router.md)。

```js
// app/controller/home.js
module.exports = app => {
  class HomeController extends app.Controller {
    * index() {
      this.ctx.body = 'hi, egg';
    }
  }
  return HomeController;
};
```

配置路由映射：

```js
// app/router.js
module.exports = app => {
  app.get('/', 'home.index');
};
```

此时目录结构如下：

```bash
egg-example
├── app
│   ├── controller
│   │   └── home.js
│   └── router.js
└── package.json
```

完整的目录结构规范参见[目录结构](../basics/structure.md)。

好，现在可以启动应用来体验下

```bash
$ npm run dev
$ open localhost:7001
```

### 静态资源

egg 内置了 [static][egg-static] 插件，线上环境建议部署到 CDN，无需该插件。

static 插件默认映射 `/public/* -> app/public/*` 目录

此处，我们把静态资源都放到 `app/public` 目录即可：

```bash
app/public
├── css
│   └── news.css
└── js
    ├── lib.js
    └── news.js
```

### 模板渲染

绝大多数情况，我们都需要读取数据后渲染模板，然后呈现给用户。故我们需要引入对应的模板引擎。

框架并不强制你使用某种模板引擎，只是约定了 [view 插件开发规范](../advanced/view-plugin.md)，开发者可以引入不同的插件来实现差异化定制。

更多用法参见 [View](../core/view.md)。

在本例中，我们使用 [nunjucks] 来渲染，先安装对应的插件 [egg-view-nunjucks] ：

```bash
$ npm i egg-view-nunjucks --save
```

开启插件：

```js
// config/plugin.js
exports.nunjucks = {
  enable: true,
  package: 'egg-view-nunjucks'
};
```

为列表页编写模板文件，一般放置在 `app/view` 目录下

``` html
<!-- app/view/news/list.tpl -->
<html>
  <head>
    <title>Egg HackerNews Clone</title>
    <link rel="stylesheet" href="/public/css/news.css" />
  </head>
  <body>
    <div class="news-view view">
      {% for item in list %}
        <div class="item">
          <a href="{{ item.url }}">{{ item.title }}</a>
        </div>
      {% endfor %}
    </div>
  </body>
<html/>
```

添加 controller 和 router

```js
// app/controller/news.js
module.exports = app => {
  class NewsController extends app.Controller {
    * list() {
      const dataList = {
        list: [
          { id: 1, title: 'this is news 1', url: '/news/1' },
          { id: 2, title: 'this is news 2', url: '/news/2' }
        ]
      };
      yield this.ctx.render('news/list.tpl', dataList);
    }
  }
  return NewsController;
};

// app/router.js
module.exports = app => {
  app.get('/', 'home.index');
  app.get('/news', 'news.list');
};
```

启动浏览器，访问 http://localhost:7001/news 即可看到渲染后的页面。

**提示：开发期默认开启了 [development][egg-development] 插件，修改后端代码后，会自动重启 worker 进程。**

### 编写 service

在实际应用中， controller 一般不会自己产出数据，也不会包含复杂的逻辑，复杂的过程应抽象为业务逻辑层 [service](../basics/service.md)。

我们来添加一个 service 抓取 [HackerNews](https://github.com/HackerNews/API) 的数据 ，如下：

```js
// app/service/news.js
module.exports = app => {
  class NewsService extends app.Service {
    * list(page = 1) {
      // read config
      const { serverUrl, pageSize } = this.app.config.news;

      // use build-in http client to GET hacker-news api
      const { data: idList } = yield this.ctx.curl(`${serverUrl}/topstories.json`, {
        data: {
          orderBy: '"$key"',
          startAt: `"${pageSize * (page - 1)}"`,
          endAt: `"${pageSize * page - 1}"`,
        },
        dataType: 'json',
      });

      // parallel GET detail, see `yield {}` from co
      const newsList = yield Object.keys(idList).map(key => {
        const url = `${serverUrl}/item/${idList[key]}.json`;
        return this.ctx.curl(url, { dataType: 'json' });
      });
      return newsList.map(res => res.data);
    }
  }
  return NewsService;
};
```

> 框架提供了内置的 [http client](../core/httpclient.md) 来方便开发者使用 http 请求。

然后稍微修改下之前的 controller：

```js
// app/controller/news.js
module.exports = app => {
  class NewsController extends app.Controller {
    * list() {
      const ctx = this.ctx;
      const page = ctx.query.page || 1;
      const newsList = yield ctx.service.news.list(page);
      yield ctx.render('news/list.tpl', { list: newsList });
    }
  }
  return NewsController;
};
```

还需增加 `app/service/news.js` 中读取到的配置：

```js
// config/config.default.js
exports.news = {
  pageSize: 5,
  serverUrl: 'https://hacker-news.firebaseio.com/v0',
};
```

### 编写扩展

遇到一个小问题，我们的资讯时间的数据是 UnixTime 格式的，我们希望显示为便于阅读的格式。

框架提供了一种快速扩展的方式，只需在 `app/extend` 目录下提供扩展脚本即可，具体参见[扩展](../basics/extend.md)。

在这里，我们可以使用 view 插件支持的 helper 来实现：

```js
// app/extend/helper.js
const moment = require('moment');
exports.relativeTime = time => moment(new Date(time * 1000)).fromNow();
```

在模板里面使用：

``` html
<!-- app/views/news/list.tpl -->
{{ helper.relativeTime(item.time) }}
```

### 编写 middleware

假设有个需求：我们的新闻站点，禁止百度爬虫访问。

聪明的同学们一定很快能想到可以通过 [middleware](../basics/middleware.md) 判断 UA，如下：

```js
// app/middleware/robot.js
// options === app.config.robot
module.exports = (options, app) => {
  return function* robotMiddleware(next) {
    const source = this.get('user-agent') || '';
    const match = options.ua.some(ua => ua.test(source));
    if (match) {
      this.status = 403;
      this.message = 'go away, robot';
    } else {
      yield next;
    }
  }
};

// config/config.default.js
// mount middleware
exports.middleware = [
  'robot'
];
// middleware config
exports.robot = {
  ua: [
    /Baiduspider/i,
  ]
};
```

现在可以使用 `curl localhost:7001/news -A "Baiduspider"` 看看效果。

### 配置文件

写业务的时候，不可避免的需要有配置文件，框架提供了强大的配置合并管理功能：

- 支持按环境变量加载不同的配置文件，如 `config.local.js`， `config.prod.js` 等等。
- 应用/插件/框架都可以配置自己的配置文件，框架将按顺序合并加载。
- 具体合并逻辑可参见[配置文件](../basics/config.md)。

```js
// config/config.default.js
exports.robot = {
  ua: [
    /curl/i,
    /Baiduspider/i,
  ],
};

// config/config.local.js
// only read at development mode, will override default
exports.robot = {
  ua: [
    /Baiduspider/i,
  ],
};

// app/service/some.js
module.exports = app => {
  class SomeService extends app.Service {
    * list() {
      const rule = this.app.config.robot.ua;
    }
  }
  return SomeService;
};
```

### 单元测试

单元测试非常重要，框架也提供了 [egg-bin] 来帮开发者无痛的编写测试。

```js
// test/app/middleware/robot.test.js
const assert = require('assert');
const mock = require('egg-mock');
const request = require('supertest');

describe('test/app/middleware/robot.test.js', () => {
  let app;
  before(() => {
    // 创建当前应用的 app 实例
    app = mock.app();
    // 等待 app 启动成功，才能执行测试用例
    return app.ready();
  });

  afterEach(mock.restore);

  it('should block robot', () => {
    return request(app.callback())
      .get('/')
      .set('User-Agent', "Baiduspider")
      .expect(403);
  });

  // ...
});
```

然后配置依赖和 `npm scripts`：

```json
{
  "scripts": {
    "test": "egg-bin test"
  }
}
```

```bash
$ npm i egg-mock supertest --save-dev
```

执行测试：

```bash
$ npm test
```

就这么简单，更多请参见[单元测试](../core/unittest.md)。

## 后记

短短几章内容，只能讲 egg 的冰山一角，我们建议开发者继续阅读其他章节：

- 提供了强大的扩展机制，参见[插件开发](../advanced/plugin.md)。
- 一个大规模的团队需要遵循一定的约束和约定，在 egg 里我们建议封装适合自己团队的上层框架，参见[框架开发](../advanced/framework.md)。
- 这是一个渐进式的框架，代码的共建，复用和下沉，竟然可以这么的无痛，建议阅读[渐进式开发](../tutorials/progressive.md)。
- 写单元测试其实很简单的事，egg 也提供了非常多的配套辅助，我们强烈建议大家测试驱动开发，具体参见[单元测试](../core/unittest.md)。

[nvm]: https://github.com/creationix/nvm
[nvs]: https://github.com/jasongin/nvs
[node]: http://nodejs.org
[npm]: https://www.npmjs.org
[egg-init]: https://github.com/eggjs/egg-init
[egg-bin]: https://github.com/eggjs/egg-bin
[egg-static]: https://github.com/eggjs/egg-static
[egg-development]: https://github.com/eggjs/egg-development
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[urllib]: https://www.npmjs.com/package/urllib
[nunjucks]: https://mozilla.github.io/nunjucks/
