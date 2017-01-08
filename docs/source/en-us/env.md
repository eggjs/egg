title: Runtime Enviroment
---

# runtime enviroments

There could be all kinds of difference during various stages of a web application development, but the application itself should be stateless, so EGG provide enviromental variables to cope with such difference.

EGG framework provides the variable named `serverEnv` for setting up runtime Enviroment. The `serverEnv` could be used to determine which configuration file should be applied, or any oprations by detect the `serverEnv` directly. 

## How to defined the enviroments

There are several ways:

1. use `config/serverEnv` file, usually we use the build tools to generate this file.
2. specify the `EGG_SERVER_ENV` enviromental variable.


`EGG_SERVER_ENV` will be more commonly used, defined the enviromental variabe when you start the application is the simplest way, for example, use the code below to start the application in the production environment.

```shell
EGG_SERVER_ENV=prod npm start
```

## Difference with NODE_ENV

Lot of node application use `NODE_ENV` for enviromental setting, but `EGG_SERVER_ENV`  distinguish the enviroments much more specific; General speaking, there are local enviroment, unit test enviroment, test enviroment, production enviroment during the application development. Test and production enviroment are **Server Enviroment** and their `NODE_ENV` should be set to `production` , just like how npm make use of `NODE_ENV`. when you depoly applications in test and production enviroment, you don't install the devDependencies, so `production` should be applied.

Default mapping of EGG_SERVER_ENV and NODE_ENV

EGG_SERVER_ENV | NODE_ENV | remarks
--- | --- | ---
local | | local development enviroment
unittest | test | unit test enviroment
test | production | test enviroment on server
prod | production | production enviroment

## How to use
You can use `app.config.serverEnv` to get the enviromental variabe.
You can also load different configuration file for different enviroment by adding a file like  `config/config.{serverEnv}.js` with specified configs, please refer to  [config 配置](./config.md) for details.
