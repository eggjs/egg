title: Configuration
---
This framework provides powerful and extensible configuration function, including automatically merging applications, plugins, and framework's configuration. In addition, it allows users to overwrite configuration in sequence and maintain different configs depending on different environments. The result (i.e. merged config) can be accessed from `app.config `.

Here are some common control tactics:

1. Using platform to manage configurations: while building a new application, you can put the current environment configuration into package and trigger the configuration as long as you run this application. But this certain application won't be able to build several deployments at once, and you will get into trouble whenever you want to use the configuration in localhost.
2. Using platform to manage configurations: you can pass the current environment configuration via environment variables while starting. This is a relatively elegant approach with higher requirement on operation and support from configuration platform. Moreover, The configuration environment has same flaws as first method.
3. Using code to manage configurations: you can add some environment configurations in codes and pass them  to current environment arguments while starting. However, it doesn't allow you to configurate globally and you need to alter your code whenever you want to change the configuration.

we choose the last strategy, namely **configurate with code**, The change of configuration should be also released after review. The application package itself is capable to be deployed in several environments, only by specifing the running environment.

### Multiple environment configuration

This framework suppports loading configuration according to the environment and defining configuration files of multiple enviroments. For more details, please check [env](../basics/env.md).

```
config
|- config.default.js
|- config.test.js
|- config.prod.js
|- config.unittest.js
|- config.local.js
```
`config.default.js` is the default file for configuration, and all environments will load this file. Besides, this is usually used as default configuration file for development environment.

The corresponding configuration file will be loaded simultaneously when you set up env and the default configuration with the same name will be overwritten. For example, `prod` environment will load `config.prod.js` and `config.default.js`. As a result, `config.prod.js` will overwrite the configuration with identical name in `config.default.js`.

### How to write configuration

The configuration file returns an object which could overwrite some configurations in the framework. Application can put its own business configuration into it for convenient management.

```js
// configurate the catalog of logger，the default configuration of logger is provided by framework
module.exports = {
  logger: {
    dir: '/home/admin/logs/demoapp',
  },
};
```
The configuration file can also return a function which could receive a parameter called `appInfo`

```js
// put the catelog of logger to the catalog of codes
const path = require('path');
module.exports = appInfo => {
  return {
    logger: {
      dir: path.join(appInfo.baseDir, 'logs'),
    },
  };
};
```
The build-in appInfo contains:

appInfo | elaboration
---      | ---
pkg      | package.json
name     | Application name, same as pkg.name
baseDir   | The directory of codes
HOME       | User directory, e.g, the account of admin is /home/admin
root       | The application root directory, if the environment is local or unittest, it is baseDir. Otherwise, it is HOME

`appInfo.root` is an elegant adaption. for example, we tend to use ``/home/admin/logs`` as the catalog of log in the server environment, while we don't want to pollute the user catalog in local development. This adaptation is very good at solving this problem.

### Sequence of loading configurations

Applications, plugin components and framework are able to define those config. Even though the structure of catalog is identical but there is priority (application > framework > plugin). Besides, the running environment has the highest priority.

Here is one sequence of loading configurations under "prod" environment, in which the following configuration will overwrite the previous configuration with the same name.

	-> plugin config.default.js
	-> framework config.default.js
	-> application config.default.js
	-> plugin config.prod.js
	-> framework config.prod.js
	-> application config.prod.js
	
**Note: there will be plugin loading sequence, but the approximate order is similar. For specific logic, please check the [loader](../advanced/loader.md) .**

### Merging rule

Configs are merged using deep copy from [extend2] module, which is forked from [extend] and process array in a different way.

```js
const a = {
  arr: [ 1, 2 ],
};
const b = {
  arr: [ 3 ],
};
extend(true, a, b);
// => { arr: [ 3 ] }
```
As demonstrated above, the framework overwirte arrays instead of merging them.

## plugin Configuration

In the application, we can control some options of plugins via `config/plugin.js`.

### Enable/Disable

The framework has some bulid-in plugins which can be enabled or disabed via the configuration. Once the plugin is disabled, all files of this plugin won't be loaderd any more.

```js
// disable the built-in i18n plugin
module.exports = {
  i18n: {
    enable: false,
  },
};
```

Or we can simply set a boolean value

```js
module.exports = {
  i18n: false,
};
```

### How to load plugins

The framework builds in [some plugins](https://github.com/eggjs/egg/blob/master/config/plugin.js) that is commonly used for enterprise applications.

And application developers can load other plugins to Meet business needs just by specifying the `package` configuration

```js
// use mysql plugin
module.exports = {
  mysql: {
    enable: true,
    package: 'egg-mysql',
  },
};
```

As a npm module, `package` must add dependency to `pkg.dependencies`. The framework will search this module in node_modules directory and find it as the plugin entry.

```
{
  "dependencies": {
    "egg-mysql": "^1.0.0"
  }
}
```

**Note: use dependencies rather than devDependencies to config plugins even used in the development phase in case `npm -i --production` fails.**

Alternatively, we can use path to replace package.

```js
const path = require('path');
module.exports = {
  mysql: {
    enable: true,
    path: path.join(__dirname, '../app/plugin/egg-mysql'),
  },
};
```

path is an absolute path so that the application can put self developed plugins in the application directory, such as `app/plugin`.

## Configuration result

The final merged config will be dumped to `run/application_config.json`(for worker process) and `run/agent_config.json`(for agent process) when the framework starts, which can help analyzing problems.

Some fields are hidden in the config file, mainly including 2 types:

- like passwords, secret keys and other security related fields which can be configured in `config.dump.ignore` and only [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) type is accepted. See [Default Configs](https://github.com/eggjs/egg/blob/master/config/config.default.js)
- like Function, Buffer, etc. whose content converted by `JSON.stringify` will be specially large.
