---
title: 运行环境
order: 3
---

一个 Web 应用本身应该是无状态的，并拥有根据运行环境设置自身的能力。

## 指定运行环境

框架有两种方式指定运行环境：

1. 通过 `config/env` 文件指定，该文件的内容就是运行环境，如 `prod`。一般通过构建工具来生成这个文件。

```plaintext
// config/env
prod
```

2. 通过 `EGG_SERVER_ENV` 环境变量指定运行环境更加方便，比如在生产环境启动应用：

```shell
EGG_SERVER_ENV=prod npm start
```

## 应用内获取运行环境

框架提供了变量 `app.config.env`，来表示应用当前的运行环境。
## 运行环境相关配置

不同的运行环境会对应不同的配置，具体请阅读 [Config 配置](./config.md)。
## 与 `NODE_ENV` 的区别

很多 Node.js 应用会使用 `NODE_ENV` 来区分运行环境，但 `EGG_SERVER_ENV` 区分得更加精细。一般的项目开发流程包括本地开发环境、测试环境、生产环境等，除了本地开发环境和测试环境外，其他环境可统称为**服务器环境**。服务器环境的 `NODE_ENV` 应该为 `production`。而且 npm 也会使用这个变量，在应用部署时，一般不会安装 devDependencies，所以这个值也应该为 `production`。

框架默认支持的运行环境及映射关系（如果未指定 `EGG_SERVER_ENV`，会根据 `NODE_ENV` 来匹配）如下表所示：

| `NODE_ENV`   | `EGG_SERVER_ENV` | 说明         |
|--------------|------------------|--------------|
| （不设置）   | local            | 本地开发环境 |
| test         | unittest         | 单元测试     |
| production   | prod             | 生产环境     |

例如，当 `NODE_ENV` 为 `production` 而 `EGG_SERVER_ENV` 未指定时，框架会将 `EGG_SERVER_ENV` 设置成 `prod`。
## 自定义环境

Egg 框架支持开发者根据实际需要自定义开发环境。

假如你需要在开发流程中加入 SIT 集成测试环境，只需将环境变量 `EGG_SERVER_ENV` 设为 `sit`。同时，建议设置 `NODE_ENV` 为 `production`，这样在启动项目时，Egg 会加载 `config/config.sit.js` 配置文件，并将运行时环境的 `app.config.env` 设为 `sit`。

## 与 Koa 的区别

在 Koa 中，我们通过 `app.env` 来判断运行环境，其默认值为 `process.env.NODE_ENV`。然而在 Egg（及基于 Egg 的框架）中，配置统一放置于 `app.config`，因此需要通过 `app.config.env` 来区分环境。不再使用 `app.env`。
