title: Runtime Environment
---

# Runtime Environment

There could be all kinds of difference during various stages of a Web application development, but the application itself should be stateless, so EGG provide environment variables to cope with such difference.

EGG framework provides a variable named `env` for setting up the runtime environment. The `env` could be used to determine which configuration file should be applied, or you can perform any operations by detecting the `env` directly.

## How to Configure Runtime Environment

There are several ways:

1. Use `config/env` file, usually we use the build tools to generate this file, the content of this file is just the env value, such as `prod`.
2. Specify the `EGG_SERVER_ENV` environment variable.


`EGG_SERVER_ENV` will be more commonly used, defining the environment variable when you start the application is the simplest way, for example, use the code below to start the application in the production environment.

```shell
EGG_SERVER_ENV=prod npm start
```

## How to Use
You can use `app.config.env` to get the environment variable.
You can also load different configuration file for different environment by adding a file like  `config/config.{env}.js` with specified configs, please refer to  [config](./config.md) for details.

## Difference with NODE_ENV

Lots of Node.js applications use `NODE_ENV` for environment setting, but `EGG_SERVER_ENV`  distinguishes the environments much more specific. Generally speaking, there are local environment, unit test environment, test environment, production environment during the application development. Test and production environment are **Server Environment** and their `NODE_ENV` should be set to `production` , just like how npm make use of `NODE_ENV`. when you depoly applications in test and production environment, you don't install the devDependencies, so `production` should be applied.

Default mapping of `EGG_SERVER_ENV` and `NODE_ENV` (will generate `EGG_SERVER_ENV` from `NODE_ENV` setting if `EGG_SERVER_ENV` is not specified)

NODE_ENV   | EGG_SERVER_ENV | remarks
---------- | -------------- | ------------
           | local          | local development environment
test       | unittest       | unit test environment
production | prod           | production environment

For example, `EGG_SERVER_ENV` will be set to prod when `NODE_ENV` is production and `EGG_SERVER_ENV` is not specified.

## Customize environment

In normal development process, it's not limit to these environments mentioned above. So you can customize environment for you development process, such as SIT (System integration testing).

Set `EGG_SERVER_ENV` to `sit` (also set `NODE_ENV = production` as recommend), the framework will load `config/config.sit.js` when lanching, and the runtime environment `app.config.env` will be `sit`.

## Difference with Koa

We are using `app.env` to distinguishes the environments in Koa, and `app.env` defualt to `process.env.NODE_ENV`. But in Egg (and frameworks base on Egg), we put all the configurations in `app.config`, so we should use `app.config.env` to distinguishes the environments, `app.env` is no logger used.
