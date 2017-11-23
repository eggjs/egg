title: Quick Start
---

# Quick Start

This guide covers getting up and running with Egg using a real example.
By following along with this guide step by step, you can quickly get started with Egg development.

## Prerequisites

- Operating System: Linux, OS X or Windows.
- Node.js Runtime: 8.x or newer; it is recommended that you use [LTS Releases][Node.js].

## the Quick Way

To begin with, let's quickly initialize the project using a scaffold,
which will quickly generate some of the major pieces of the application.

```bash
$ npm i egg-init -g
$ egg-init egg-example --type=simple
$ cd egg-example
$ npm i
```

Then get up and running using the following commands.

```bash
$ npm run dev
$ open localhost:7001
```

## Step by Step

Usually you could just use [egg-init] of the last session,
choose a scaffold that best fits your business model and quickly generate a project,
then get started with the development.

However, in this section, instead of using scaffolds we will build a project called [Egg HackerNews](https://github.com/eggjs/examples/tree/master/hackernews) step by step, for a better understanding of how it works.

![Egg HackerNews Snapshoot](https://cloud.githubusercontent.com/assets/227713/22960991/812999bc-f37d-11e6-8bd5-a96ca37d0ff2.png)

### Initialization

First let's create the project directory and initialize its structure.

```bash
$ mkdir egg-example
$ cd egg-example
$ npm init
$ npm i egg --save
$ npm i egg-bin --save-dev
```

Then add `npm scripts` to `package.json`.

```json
{
  "name": "egg-example",
  "scripts": {
    "dev": "egg-bin dev"
  }
}
```

### Create a Controller

If you are familiar with the MVC architecture,
you might have already guessed that the first thing to create
is a [controller](../basics/controller.md) and [router](../basics/router.md).

```js
// app/controller/home.js
const Controller = require('egg').Controller;

class HomeController extends Controller {
  async index() {
    this.ctx.body = 'Hello world';
  }
}

module.exports = HomeController;
```

Then edit the router file and add a mapping.

```js
// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
};
```

Then add a [configuration](../basics/config.md) file:

```js
// config/config.default.js
exports.keys = <YOUR_SECURITY_COOKE_KEYS>;
```

The project directory looks like this:

```bash
egg-example
├── app
│   ├── controller
│   │   └── home.js
│   └── router.js
├── config
│   └── config.default.js
└── package.json
```

For more infomation about directory structure, see [Directory Structure](../basics/structure.md).

Now you can start up the Web Server and see your application in action.

```bash
$ npm run dev
$ open localhost:7001
```

> Note：
>
> - You could write `Controller` with `class` or `exports` style, see more detail at [Controller](../basics/controller.md).
> - And `Config` could write with `module.exports` or `exports` style, see more detail at [Node.js modules docs](https://nodejs.org/api/modules.html#modules_exports_shortcut).

### Add Static Assets

Egg has a built-in plugin called [static][egg-static].
In production, it is recommended that you deploy static assets to CDN instead of using this plugin.

[static][egg-static] maps `/public/*` to the directory `app/public/*` by default.

In this case, we just need to put our static assets into the directory `app/public`.

```bash
app/public
├── css
│   └── news.css
└── js
    ├── lib.js
    └── news.js
```

### Add Templates for Rendering

In most cases, data are usually read, processed and rendered by the templates before being presented to the user.
Thus we need to introduce corresponding template engines to handle it.

Egg does not force the use of any particular template engines,
but instead specifies the [View Plug-ins Specification](../advanced/view-plugin.md)
to allow the developers to use different plug-ins for their individual needs.

For more information, cf. [View](../core/view.md).

In this example, we will use [Nunjucks].

First install the corresponding plug-in [egg-view-nunjucks].

```bash
$ npm i egg-view-nunjucks --save
```

And enable it.

```js
// config/plugin.js
exports.nunjucks = {
  enable: true,
  package: 'egg-view-nunjucks'
};
```

```js
// config/config.default.js
exports.keys = <YOUR_SECURITY_COOKE_KEYS>;
// add view's configurations
exports.view = {
  defaultViewEngine: 'nunjucks',
  mapping: {
    '.tpl': 'nunjucks',
  },
};
```

**Carefull! `config` dir, not `app/config`!**

Then create a template for the index page.
This usually goes to the app/view directory.


```html
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
</html>
```

Then add a controller and router.

```js
// app/controller/news.js
const Controller = require('egg').Controller;

class NewsController extends Controller {
  async list() {
    const dataList = {
      list: [
        { id: 1, title: 'this is news 1', url: '/news/1' },
        { id: 2, title: 'this is news 2', url: '/news/2' }
      ]
    };
    await this.ctx.render('news/list.tpl', dataList);
  }
}

module.exports = NewsController;

// app/router.js
module.exports = app => {
  const { router, controller } = app;
  router.get('/', controller.home.index);
  router.get('/news', controller.news.list);
};
```

Open a browser window and navigate to http://localhost:7001/news.
You should be able to see the rendered page.

**Tip：In development, Egg enables the [development][egg-development] plug-in by default, which reloads your worker process when changes are made to your back-end code.**

### Create a Service

In practice, controllers usually won't generate data on their own,
neither will they contain complicated business logic.
Complicated business logic should instead be abstracted as
a busineess logic layer, i.e., [service](../basics/service.md).

Let's create a service to fetch data from the
[HackerNews](https://github.com/HackerNews/API).

```js
// app/service/news.js
const Service = require('egg').Service;

class NewsService extends app.Service {
  async list(page = 1) {
    // read config
    const { serverUrl, pageSize } = this.config.news;

    // use build-in http client to GET hacker-news api
    const { data: idList } = await this.ctx.curl(`${serverUrl}/topstories.json`, {
      data: {
        orderBy: '"$key"',
        startAt: `"${pageSize * (page - 1)}"`,
        endAt: `"${pageSize * page - 1}"`,
      },
      dataType: 'json',
    });

    // parallel GET detail
    const newsList = await Promise.all(
      Object.keys(idList).map(key => {
        const url = `${serverUrl}/item/${idList[key]}.json`;
        return this.ctx.curl(url, { dataType: 'json' });
      })
    );
    return newsList.map(res => res.data);
  }
}

module.exports = NewsService;
```

> Egg has [HttpClient](../core/httpclient.md) built in in order to help you make HTTP requests.

Then slightly modify our previous controller.

```js
// app/controller/news.js
const Controller = require('egg').Controller;

class NewsController extends Controller {
  async list() {
    const ctx = this.ctx;
    const page = ctx.query.page || 1;
    const newsList = await ctx.service.news.list(page);
    await ctx.render('news/list.tpl', { list: newsList });
  }
}

module.exports = NewsController;
```

And also add config.

```js
// config/config.default.js
// add news' configurations
exports.news = {
  pageSize: 5,
  serverUrl: 'https://hacker-news.firebaseio.com/v0',
};
```

### Add Extensions

We might encounter a small problem here.
The time that we fetched are in Unix Time,
whereas we want to present them in a more friendly way to read.

Egg provides us with a quick way to extend its functionalities.
We just need to add extension scripts to the `app/extend` directory.
For more information, cf. [Extensions](../basics/extend.md).

In the case of view, we can just write a helper as an extension.

```js
// app/extend/helper.js
const moment = require('moment');
exports.relativeTime = time => moment(new Date(time * 1000)).fromNow();
```

Then use it in the templates.

``` html
<!-- app/view/news/list.tpl -->
{{ helper.relativeTime(item.time) }}
```

### Add Middlewares

Suppose that we wanted to prohibit accesses from Baidu crawlers.

Smart developers might quickly guess that we can achieve it by adding a [middleware](../basics/middleware.md)
that checks the User-Agent.

```js
// app/middleware/robot.js
// options === app.config.robot
module.exports = (options, app) => {
  return async function robotMiddleware(ctx, next) {
    const source = ctx.get('user-agent') || '';
    const match = options.ua.some(ua => ua.test(source));
    if (match) {
      ctx.status = 403;
      ctx.message = 'Go away, robot.';
    } else {
      await next();
    }
  }
};

// config/config.default.js
// add middleware robot
exports.middleware = [
  'robot'
];
// robot's configurations
exports.robot = {
  ua: [
    /Baiduspider/i,
  ]
};
```

Now try it using `curl localhost:7001/news -A "Baiduspider"`.

**Note：both Koa1 and Koa2 style middleware is supported, see [Use Koa's Middleware](../basics/middleware.md#Use-Koa's-Middleware)。**


### Add Configurations

When writing business logic,
it is inevitable that we need to manage configurations.
Egg provides a powerful way to manage them in a merged configuration file.

- Environment-specific configuration files are well supported, e.g. config.local.js, config.prod.js, etc.
- Configurations could happen wherever convenient, e.g. near Applications/Plug-ins/Framesworks, and Egg will take care of merging and loading them.
- For more information on merging, see [Configurations](../basics/config.md).

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
const Service = require('egg').Service;

class SomeService extends Service {
  async list() {
    const rule = this.config.robot.ua;
  }
}

module.exports = SomeService;
```

### Add Unit Testing

Unit Testing is very important, and Egg also provide [egg-bin] to help you write tests painless.

All the test files should place at `{app_root}/test/**/*.test.js`.

```js
// test/app/middleware/robot.test.js
const { app, mock, assert } = require('egg-mock/bootstrap');

describe('test/app/middleware/robot.test.js', () => {
  it('should block robot', () => {
    return app.httpRequest()
      .get('/')
      .set('User-Agent', "Baiduspider")
      .expect(403);
  });
});
```

Then add `npm scripts`.

```json
{
  "scripts": {
    "test": "egg-bin test",
    "cov": "egg-bin cov"
  }
}
```

Also install dependencies.

```bash
$ npm i egg-mock --save-dev
```

Run it.

```bash
$ npm test
```

That is all of it, for more detail, see [Unit Testing](../core/unittest.md).

## Conclusions

We can only touch the tip of the iceberg of Egg with the above short sections.
Where to go from here? Browse our documentation to better understand the framework.
- Egg provides a powerful mechanism for extending features. See [Plugin](../basics/plugin.md).
- Egg framework allows small or large teams to work together as fast as possible under the well-documented conventions and coding best practices. In addition, the teams can build up logics on top of the framework to better suited their special needs. See more on [Frameworks].(../advanced/framework.md).
- Egg framework provides code reusabilities and modularities. See details at [Progressive](../tutorials/progressive.md).
- Egg framework enables developers to write painless unit testing with many plugins and community-powered toolings. The team should give it a try by using Egg unit testing without worrying about setting up the testing tooling but writing the testing logics. See [Unit Testing](../core/test.md).

[Node.js]: http://nodejs.org
[egg-init]: https://github.com/eggjs/egg-init
[egg-bin]: https://github.com/eggjs/egg-bin
[egg-static]: https://github.com/eggjs/egg-static
[egg-development]: https://github.com/eggjs/egg-development
[egg-view-nunjucks]: https://github.com/eggjs/egg-view-nunjucks
[urllib]: https://www.npmjs.com/package/urllib
[Nunjucks]: https://mozilla.github.io/nunjucks/
