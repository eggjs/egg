---
title: Config 配置
order: 4
---

框架提供了强大且可扩展的配置功能，可以自动合并应用、插件、框架的配置，按顺序覆盖，且可以根据环境维护不同的配置。合并后的配置可直接从 `app.config` 获取。

配置的管理有多种方案，以下列举一些常见的方案：

1. 使用平台管理配置，应用构建时将当前环境的配置放入包内，启动时指定该配置。但应用就无法一次构建多次部署，而且本地开发环境想使用配置会变得很麻烦。
2. 使用平台管理配置，在启动时将当前环境的配置通过环境变量传入，这是比较优雅的方式，但框架对运维的要求会比较高，需要部署平台支持，同时开发环境也有相同的痛点。
3. 使用代码管理配置，在代码中添加多个环境的配置，在启动时传入当前环境的参数即可。但无法全局配置，必须修改代码。

我们选择了最后一种配置方案，**配置即代码**，配置的变更也应该经过审核后才能发布。应用包本身是可以部署在多个环境的，只需要指定运行环境即可。
### 多环境配置

框架支持根据环境来加载配置，定义多个环境的配置文件，具体环境请查看[运行环境配置](./env.md)。

```
config
|- config.default.js
|- config.prod.js
|- config.unittest.js
`- config.local.js
```

`config.default.js` 为默认的配置文件，所有环境都会加载这个配置文件，一般也会作为开发环境的默认配置文件。

当指定 `env` 时，会同时加载默认配置和对应的配置（具名配置）文件。具名配置和默认配置将合并（使用 [extend2](https://www.npmjs.com/package/extend2) 深拷贝）成最终配置，具名配置项会覆盖默认配置文件的同名配置。例如，`prod` 环境会加载 `config.prod.js` 和 `config.default.js` 文件，`config.prod.js` 会覆盖 `config.default.js` 的同名配置。
### 配置写法

配置文件返回的是一个对象，可以覆盖框架的一些配置，应用也可以将自己业务的配置放到这里方便管理。

```js
// 配置 logger 文件的目录，logger 默认配置由框架提供
module.exports = {
  logger: {
    dir: '/home/admin/logs/demoapp',
  },
};
```

配置文件也可以简化地写成 `exports.key = value` 形式：

```js
exports.keys = 'my-cookie-secret-key';
exports.logger = {
  level: 'DEBUG',
};
```

配置文件也可以返回一个函数，该函数可以接受 `appInfo` 参数：

```js
// 将 logger 目录放到代码目录下
const path = require('path');
module.exports = (appInfo) => {
  return {
    logger: {
      dir: path.join(appInfo.baseDir, 'logs'),
    },
  };
};
```

内置的 `appInfo` 属性包括：

| appInfo | 说明                                                         |
| ------- | ------------------------------------------------------------ |
| pkg     | `package.json` 文件                                           |
| name    | 应用名称，同 `pkg.name`                                      |
| baseDir | 应用代码的目录                                               |
| HOME    | 用户目录，如 admin 账户为 `/home/admin`                      |
| root    | 应用根目录，在 `local` 和 `unittest` 环境下为 `baseDir`，其他都为 `HOME`。 |

`appInfo.root` 是一个优雅的适配方案。例如，在服务器环境我们通常使用 `/home/admin/logs` 作为日志目录，而在本地开发时为了避免污染用户目录，我们需要一种优雅的适配方案，`appInfo.root` 正好解决了这个问题。

请根据具体场合选择合适的写法。但请确保没有完成以下代码：

```js
// 配置文件 config/config.default.js
exports.someKeys = 'abc';
module.exports = (appInfo) => {
  const config = {};
  config.keys = '123456';
  return config;
};
```

### 配置加载顺序

应用、插件、框架都可以定义这些配置，且目录结构都是一致的，但存在优先级（应用 > 框架 > 插件），相对于此运行环境的优先级会更高。

比如在 prod 环境中加载一个配置的加载顺序如下，后加载的会覆盖前面的同名配置。

```
-> 插件 config.default.js
-> 框架 config.default.js
-> 应用 config.default.js
-> 插件 config.prod.js
-> 框架 config.prod.js
-> 应用 config.prod.js
```

**注意**：插件之间也会有加载顺序，但大致顺序类似。具体逻辑可[查看加载器](../advanced/loader.md)。
### 合并规则

配置的合并使用 `extend2` 模块进行深度拷贝，`extend2` 来源于 `extend`，但是在处理数组时的表现会有所不同。

```js
const a = {
  arr: [1, 2],
};
const b = {
  arr: [3],
};
extend(true, a, b);
// => { arr: [ 3 ] }
```

根据上面的例子，框架直接覆盖数组而不是进行合并。

### 配置结果

框架在启动时会把合并后的最终配置输出到 `run/application_config.json`（worker 进程）和 `run/agent_config.json`（agent 进程）中，以供问题分析。

配置文件中会隐藏以下两类字段：

1. 安全字段，如密码、密钥等。这些字段通过 `config.dump.ignore` 属性进行配置，其类型必须是 [Set]。可参见[默认配置](https://github.com/eggjs/egg/blob/master/config/config.default.js)。
2. 非字符串化字段，如函数、Buffer 等。这些字段在 `JSON.stringify` 后所生成的内容容量很大。

此外，框架还会生成 `run/application_config_meta.json`（worker 进程）和 `run/agent_config_meta.json`（agent 进程）文件。这些文件用于排查配置属性的来源，例如：

```json
{
  "logger": {
    "dir": "/path/to/config/config.default.js"
  }
}
```

[Set]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set
[extend]: https://github.com/justmoon/node-extend
[extend2]: https://github.com/eggjs/extend2
