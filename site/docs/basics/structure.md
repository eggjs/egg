# Directory Structure

In the [Quick Start](../intro/quickstart.md), you should have gained a preliminary impression of the framework. Next, let's briefly understand the directory conventions.

```bash
egg-project
├── package.json
├── app.ts (optional)
├── agent.ts (optional)
├── app
│   ├── controller
│   │   ├── http
│   │   │   ├── HomeController.ts
│   │   │   └── UserController.ts
│   │   ├── rpc
│   │   │   └── UserRPCController.ts
│   │   ├── mcp
│   │   │   └── MyMCPController.ts
│   │   └── schedule
│   │       └── MyTaskController.ts
│   ├── service (optional)
│   │   └── UserService.ts
│   ├── middleware (optional)
│   │   └── ResponseTimeMiddleware.ts
│   ├── public (optional)
│   │   └── reset.css
│   ├── view (optional)
│   │   └── home.tpl
│   └── extend (optional)
│       ├── helper.ts (optional)
│       ├── request.ts (optional)
│       ├── response.ts (optional)
│       ├── context.ts (optional)
│       ├── application.ts (optional)
│       └── agent.ts (optional)
├── config
|   ├── plugin.ts
|   ├── config.default.ts
│   ├── config.prod.ts
|   ├── config.test.ts (optional)
|   ├── config.local.ts (optional)
|   └── config.unittest.ts (optional)
└── test
    ├── middleware
    |   └── ResponseTimeMiddleware.test.ts
    └── controller
           ├── http
           │   └── HomeController.test.ts
           ├── mcp
           │   └── MyMCPController.test.ts
           └── schedule
               └── MyTaskController.test.ts
```

As shown above, directories defined by framework conventions:

- `app/controller/**` - Used to parse user input, process it, and return corresponding results. See [Controller](./controller.md) for details.
- `app/service/**` - Used to write business logic layer. Recommended for use. See [Service](./service.md) for details.
- `app/middleware/**` - Used to write middleware. See [Middleware](./middleware.md) for details.
- `app/public/**` - Used to place static resources. See the built-in plugin [@eggjs/static](https://github.com/eggjs/egg/tree/next/plugins/static) for details.
- `app/extend/**` - Used for framework extensions. See [Framework Extension](./extend.md) for details.
- `config/config.{env}.ts` - Used to write configuration files. See [Configuration](./config.md) for details.
- `config/plugin.ts` - Used to configure plugins to be loaded. See [Plugin](./plugin.md) for details.
- `test/**` - Used for unit testing. See [Unit Testing](../core/unittest.md) for details.
- `app.ts` and `agent.ts` - Used to customize initialization work at startup. See [Startup Customization](./app-start.md) for details. For the role of `agent.ts`, see [Agent Mechanism](../core/cluster-and-ipc.md#agent-mechanism).

Directories defined by built-in plugin conventions:

- `app/public/**` - Used to place static resources. See the built-in plugin [@eggjs/static](https://github.com/eggjs/egg/tree/next/plugins/static) for details.

**To customize your own directory conventions, see [Loader](../advanced/loader.md)**

- `app/view/**` - Used to place template files. See [Template Rendering](../core/view.md) for details.
- `app/model/**` - Used to place domain models, such as domain-related plugins like [`egg-sequelize`](https://github.com/eggjs/egg-sequelize).
