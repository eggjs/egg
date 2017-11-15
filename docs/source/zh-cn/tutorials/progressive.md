title: 渐进式开发
---

在 Egg 里面，有[插件](../basics/plugin.md)，也有[框架](../advanced/framework.md)，前者还包括了 `path` 和 `package` 两种加载模式，那我们应该如何选择呢？

本文将以实例的方式，一步步给大家演示下，如何渐进式地进行代码演进。

全部的示例代码可以参见 [eggjs/examples/progressive](https://github.com/eggjs/examples/tree/master/progressive)。

## 最初始的状态

假设我们有一段分析 UA 的代码，实现以下功能：

- `ctx.isAndroid`
- `ctx.isIOS`

通过之前的教程，大家一定可以很快的写出来，我们快速回顾下：

对应的代码参见 [step1](https://github.com/eggjs/examples/tree/master/progressive/step1)。

目录结构：

```bash
example-app
├── app
│   ├── extend
│   │   └── context.js
│   └── router.js
├── test
│   └── index.test.js
└── package.json
```

核心代码：

```js
// app/extend/context.js
module.exports = {
  get isIOS() {
    const iosReg = /iphone|ipad|ipod/i;
    return iosReg.test(this.get('user-agent'));
  },
};
```

## 插件的雏形

我们很明显能感知到，这段逻辑是具备通用性的，可以写成插件。

但一开始的时候，功能还没完善，直接独立插件，维护起来比较麻烦。

此时，我们可以把代码写成插件的形式，但并不独立出去。

对应的代码参见 [step2](https://github.com/eggjs/examples/tree/master/progressive/step2)。

新的目录结构：

```bash
example-app
├── app
│   └── router.js
├── config
│   └── plugin.js
├── lib
│   └── plugin
│       └── egg-ua
│           ├── app
│           │   └── extend
│           │       └── context.js
│           └── package.json
├── test
│   └── index.test.js
└── package.json
```

核心代码：

- `app/extend/context.js` 移动到 `lib/plugin/egg-ua/app/extend/context.js`。

- `lib/plugin/egg-ua/package.json` 声明插件。

```json
{
  "eggPlugin": {
    "name": "ua"
  }
}
```

- `config/plugin.js` 中通过 `path` 来挂载插件。

```js
// config/plugin.js
const path = require('path');
exports.ua = {
  enable: true,
  path: path.join(__dirname, '../lib/plugin/egg-ua'),
};
```

## 抽成独立插件

经过一段时间开发后，该模块的功能成熟，此时可以考虑抽出来成为独立的插件。

首先，我们抽出一个 egg-ua 插件，看过[插件文档](../advanced/plugin.md)的同学应该都比较熟悉，我们这里只简单过一下：

目录结构：

```bash
egg-ua
├── app
│   └── extend
│       └── context.js
├── test
│   ├── fixtures
│   │   └── test-app
│   │       ├── app
│   │       │   └── router.js
│   │       └── package.json
│   └── ua.test.js
└── package.json
```

对应的代码参见 [step3/egg-ua](https://github.com/eggjs/examples/tree/master/progressive/step3/egg-ua)。

然后改造原有的应用，对应的代码参见 [step3/example-app](https://github.com/eggjs/examples/tree/master/progressive/step3/example-app)。

- 移除 `lib/plugin/egg-ua` 目录。
- `package.json` 中声明对 `egg-ua` 的依赖。
- `config/plugin.js` 中修改依赖声明为 `package` 方式。

```js
// config/plugin.js
exports.ua = {
  enable: true,
  package: 'egg-ua',
};
```

**注意：在插件还没发布前，可以通过 `npm link` 的方式进行本地测试，具体参见 [npm-link](https://docs.npmjs.com/cli/link)。**

```bash
$ cd example-app
$ npm link ../egg-ua
$ npm i
$ npm test
```

## 沉淀到框架

重复上述的过程，很快我们会积累了好几个插件和配置，并且我们会发现，在团队的大部分项目中，都会用到这些插件。

此时，就可以考虑抽象出一个适合团队业务场景的框架。

首先，抽象出 example-framework 框架，如上看过[框架文档](../advanced/framework.md)的同学应该都比较熟悉，我们这里只简单过一下：

目录结构：

```bash
example-framework
├── config
│   ├── config.default.js
│   └── plugin.js
├── lib
│   ├── agent.js
│   └── application.js
├── test
│   ├── fixtures
│   │   └── test-app
│   └── framework.test.js
├── README.md
├── index.js
└── package.json
```

- 对应的代码参见 [example-framework](https://github.com/eggjs/examples/tree/master/progressive/step4/example-framework)。
- 把原来的 `egg-ua` 等插件的依赖，从 example-app 中移除，配置到该框架的 `package.json` 和 `config/plugin.js` 中。

然后改造原有的应用，对应的代码参见 [step4/example-app](https://github.com/eggjs/examples/tree/master/progressive/step4/example-app)。

- 移除 `config/plugin.js` 中对 `egg-ua` 的依赖。
- `package.json` 中移除对 `egg-ua` 的依赖。
- `package.json` 中声明对 `example-framework` 的依赖，并配置 `egg.framework`。

```json
{
  "name": "progressive",
  "version": "1.0.0",
  "private": true,
  "egg": {
    "framework": "example-framework"
  },
  "dependencies": {
    "example-framework": "*"
  }
}
```

**注意：在框架还没发布前，可以通过 `npm link` 的方式进行本地测试，具体参见 [npm-link](https://docs.npmjs.com/cli/link)。**

```bash
$ cd example-app
$ npm link ../egg-framework
$ npm i
$ npm test
```

## 写在最后

综上所述，大家可以看到，我们是如何一步步渐进的去进行框架演进，得益于 Egg 强大的插件机制，代码的共建，复用和下沉，竟然可以这么的无痛。

- 一般来说，当应用中有可能会复用到的代码时，直接放到 `lib/plugin` 目录去，如例子中的 `egg-ua`。
- 当该插件功能稳定后，即可独立出来作为一个 `node module` 。
- 如此以往，应用中相对复用性较强的代码都会逐渐独立为单独的插件。
- 当你的应用逐渐进化到针对某类业务场景的解决方案时，将其抽象为独立的 framework 进行发布。
- 当在新项目中抽象出的插件，下沉集成到框架后，其他项目只需要简单的重新 `npm install` 下就可以使用上，对整个团队的效率有极大的提升。
- **注意：不管是应用/插件/框架，都必须编写单元测试，并尽量实现 100% 覆盖率。**
