---
title: Runtime Environment
order: 3
---

An web application itself should be stateless and has the ability to set its own according to the runtime environment.

## Configure Runtime Environment

Egg has two ways to configure runtime environment:

1. Use `config/env` file, usually we use the build tools to generate this file, the content of this file is just an env value, such as `prod`.

```
// config/env
prod
```

2. Defining the runtime environment via `EGG_SERVER_ENV` when you start the application is more convenient, for example, use the code below to start the application in the production environment.

```shell
EGG_SERVER_ENV=prod npm start
```

## Access to the Runtime Environment in Application

Egg provides a variable `app.config.env` to represent the current runtime environment of application.

## Configurations of Runtime Environment

Different running environment corresponds to different configurations, read [Configuration of Config](./config.md) in detail.

## Difference from `NODE_ENV`

Lots of Node.js applications use `NODE_ENV` to distinguish the runtime environment, but `EGG_SERVER_ENV` distinguishes the environments much more specific. Generally speaking, there are local environment, test environment, production environment during the application development. In addition to the local development environment and the test environment, other environments are collectively referred to as the **Server Environment** and their `NODE_ENV` should be set to `production`. What's more, npm will use this variable and will not install the devDependencies when you deploy applications, so `production` should also be applied.

Default mapping of `EGG_SERVER_ENV` and `NODE_ENV` (will generate `EGG_SERVER_ENV` from `NODE_ENV` setting if `EGG_SERVER_ENV` is not specified)

| NODE_ENV   | EGG_SERVER_ENV | remarks                       |
| ---------- | -------------- | ----------------------------- |
|            | local          | local development environment |
| test       | unittest       | unit test environment         |
| production | prod           | production environment        |

For example, `EGG_SERVER_ENV` will be set to prod when `NODE_ENV` is set as `production` and `EGG_SERVER_ENV` is not specified.

## Environment Customization

In normal development process, it's not limit to these environments mentioned above. So you can customize environment for your development process.

For example, if you want to add SIT (System integration testing) to development process, you can set `EGG_SERVER_ENV` to `sit` (also recommend to set `NODE_ENV = production`), the framework will load `config/config.sit.js` when launching, and the runtime environment `app.config.env` will be `sit`.

## Difference from Koa

We are using `app.env` to distinguish the environments in Koa, and the default value for `app.env` is `process.env.NODE_ENV`. But in Egg (and frameworks base on Egg), we put all the configurations in `app.config`, so we should use `app.config.env` to distinguish the environments, `app.env` is no longer used.
