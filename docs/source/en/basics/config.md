title: Configuration
---
This framework provides powerful and extensible configuration function, including automatically merging applications, plugins, and framework's configuration. In addition, it allows users to overwrite configuration in sequence and maintain different configs depending on different environments. The result (i.e. merged config) can be accessed from `app.config `.

Here are some common control tactics:

1. Using platform to manage configurations: while building a new application, you can put the current environment configuration into package and trigger the configuration as long as you run this application. But this certain application won't be able to build several deployments at once, and you will get into trouble whenever you want to use the configuration in localhost.
2. Using platform to manage configurations: you can pass the current environment configuration via environment variables while starting. This is a relatively elegant approach with higher requirement on operation and support from configuration platform. Moreover, The configuration environment has same flaws as first method.
3. Using code to manage configurations: you can add some environment configurations in codes and pass them  to current environment arguments while starting. However, it doesn't allow you to configure globally and you need to alter your code whenever you want to change the configuration.

we choose the last strategy, namely **configure with code**, The change of configuration should be also released after reviewing. The application package itself is capable to be deployed in several environments, only need to specify the running environment.

### Multiple environment configuration

This framework supports loading configuration according to the environment and defining configuration files of multiple environments. For more details, please check [env](../basics/env.md).

```
config
|- config.default.js
|- config.prod.js
|- config.unittest.js
|- config.local.js
```
`config.default.js` is the default file for configuration, and all environments will load this file. Besides, this is usually used as default configuration file for development environment.

The corresponding configuration file will be loaded simultaneously when you set up env and the default configuration with the same name will be overwritten. For example, `prod` environment will load `config.prod.js` and `config.default.js`. As a result, `config.prod.js` will overwrite the configuration with identical name in `config.default.js`.

### How to write configuration

The configuration file returns an object which could overwrite some configurations in the framework. Application can put its own business configuration into it for convenient management.

```js
// configure the catalog of logger，the default configuration of logger is provided by framework
module.exports = {
  logger: {
    dir: '/home/admin/logs/demoapp',
  },
};
```

The configuration file can simplify to `exports.key = value` format

```js
exports.keys = 'my-cookie-secret-key';
exports.logger = {
  level: 'DEBUG',
};
```

The configuration file can also return a function which could receive a parameter called `appInfo`

```js
// put the catalog of logger to the catalog of codes
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

Choose the appropriate style according to the specific situation, but please make sure you don't make mistake like the code below:

```js
// config/config.default.js
exports.someKeys = 'abc';
module.exports = appInfo => {
  const config = {};
  config.keys = '123456';
  return config;
};
```

### Sequence of loading configurations

Applications, plugin components and framework are able to define those configs. Even though the structure of catalog is identical but there is priority (application > framework > plugin). Besides, the running environment has the higher priority.

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
As demonstrated above, the framework will overwrite arrays instead of merging them.

## Configuration result

The final merged config will be dumped to `run/application_config.json`(for worker process) and `run/agent_config.json`(for agent process) when the framework started, which can help analyzing problems.

Some fields are hidden in the config file, mainly including 2 types:

- like passwords, secret keys and other security related fields which can be configured in `config.dump.ignore` and only [Set](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set) type is accepted. See [Default Configs](https://github.com/eggjs/egg/blob/master/config/config.default.js)
- like Function, Buffer, etc. whose content converted by `JSON.stringify` will be specially large.

`run/application_config_meta.json` (for worker process）and `run/agent_config_meta.json` (for agent process) will also be dumped in order to check which file defines the property, see below

```json
{
  "logger": {
    "dir": "/path/to/config/config.default.js"
  }
}
```
