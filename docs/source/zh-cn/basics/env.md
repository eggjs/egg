title: 运行环境
---

一个 web 应用在流程的各个阶段可能存在各种差异，而应用本身应该是无状态的，所以提供环境变量可以让应用不感知差异，只需要定义不同的配置。

框架提供了 env 这个变量来决定此次的运行环境，可以通过这个来决定使用哪些配置，或直接判断。

## 如何指定环境

框架有多种方式指定环境变量

1. 在 `config/env` 文件指定，一般通过构建工具来生成这个文件，该文件的内容就是环境变量的值，如 `prod`。
1. 通过 `EGG_SERVER_ENV` 环境变量指定。

EGG_SERVER_ENV 会比较常用，在应用启动的时候指定是最简单的方式，比如在生产环境启动应用。

```shell
EGG_SERVER_ENV=prod npm start
```

## 如何使用

可以通过 `app.config.env` 来获取这个环境变量直接判断环境。

也可以通过环境加载不同的配置，比如增加 `config/config.{env}.js` 这样的配置，可以在指定环境加载指定配置，具体看 [config 配置](./config.md)

## 与 NODE_ENV 的区别

很多 node 应用会使用 `NODE_ENV` 来区分环境，但 `EGG_SERVER_ENV` 会区分的更加精细。一般的项目开发流程包括本地开发环境、测试环境、生产环境，除了本地开发环境和单元测试环境外都为**服务器环境**，该环境的 `NODE_ENV` 都应该为 production。而且 npm 也会使用这个变量，在应用部署的时候一般不会安装 devDependencies，所以这个值也应该为 production。

框架默认支持的环境及映射关系。

EGG_SERVER_ENV | NODE_ENV | 说明
--- | --- | ---
local | | 本地开发环境
unittest | test | 单元测试
test | production | 服务器测试环境
prod | production | 生产环境

## 与 koa 的区别

在 koa 中我们通过 `app.env` 来进行环境判断，`app.env` 默认的值是 `process.env.NODE_ENV`。但是在 egg（和基于 egg 的框架）中，配置统一都放置在 `app.config` 上，所以我们需要通过 `app.config.env` 来区分环境，`app.env` 不再使用。
