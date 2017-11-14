title: 目录结构
---

在[快速入门](../intro/quickstart.md)中，大家对框架应该有了初步的印象，接下来我们简单了解下目录约定规范。

```bash
egg-project
├── package.json
├── app.js (可选)
├── agent.js (可选)
├── app
|   ├── router.js
│   ├── controller
│   |   └── home.js
│   ├── service (可选)
│   |   └── user.js
│   ├── middleware (可选)
│   |   └── response_time.js
│   ├── schedule (可选)
│   |   └── my_task.js
│   ├── public (可选)
│   |   └── reset.css
│   ├── view (可选)
│   |   └── home.tpl
│   └── extend (可选)
│       ├── helper.js (可选)
│       ├── request.js (可选)
│       ├── response.js (可选)
│       ├── context.js (可选)
│       ├── application.js (可选)
│       └── agent.js (可选)
├── config
|   ├── plugin.js
|   ├── config.default.js
│   ├── config.prod.js
|   ├── config.test.js (可选)
|   ├── config.local.js (可选)
|   └── config.unittest.js (可选)
└── test
    ├── middleware
    |   └── response_time.test.js
    └── controller
        └── home.test.js
```

如上，由框架约定的目录：

- `app/router.js` 用于配置 URL 路由规则，具体参见 [Router](./router.md)。
- `app/controller/**` 用于解析用户的输入，处理后返回相应的结果，具体参见 [Controller](./controller.md)。
- `app/service/**` 用于编写业务逻辑层，可选，建议使用，具体参见 [Service](./service.md)。
- `app/middleware/**` 用于编写中间件，可选，具体参见 [Middleware](./middleware.md)。
- `app/public/**` 用于放置静态资源，可选，具体参见内置插件 [egg-static](https://github.com/eggjs/egg-static)。
- `app/extend/**` 用于框架的扩展，可选，具体参见[框架扩展](./extend.md)。
- `config/config.{env}.js` 用于编写配置文件，具体参见[配置](./config.md)。
- `config/plugin.js` 用于配置需要加载的插件，具体参见[插件](./plugin.md)。
- `test/**` 用于单元测试，具体参见[单元测试](../core/unittest.md)。
- `app.js` 和 `agent.js` 用于自定义启动时的初始化工作，可选，具体参见[启动自定义](./app-start.md)。关于`agent.js`的作用参见[Agent机制](../core/cluster-and-ipc.md#agent-机制)。

由内置插件约定的目录：

- `app/public/**` 用于放置静态资源，可选，具体参见内置插件 [egg-static](https://github.com/eggjs/egg-static)。
- `app/schedule/**` 用于定时任务，可选，具体参见[定时任务](./schedule.md)。

**若需自定义自己的目录规范，参见 [Loader API](https://eggjs.org/zh-cn/advanced/loader.html)**
- `app/view/**` 用于放置模板文件，可选，由模板插件约定，具体参见[模板渲染](../core/view.md)。
- `app/model/**` 用于放置领域模型，可选，由领域类相关插件约定，如 [egg-sequelize](https://github.com/eggjs/egg-sequelize)。
