---
title: 升级你的生命周期事件函数
order: 6
---

为了使得大家更方便地控制加载应用和插件的时机，我们对 Loader 的生命周期函数进行了精简处理。概括地说，生命周期事件目前总共可以分成两种形式：

1. 函数形式（已经作废，仅为兼容保留）。
2. 类形式（推荐使用）。

## beforeStart 函数替代

我们通常在 app.js 中通过 `module.export` 中传入的 `app` 参数进行此函数的操作，一个典型的例子：

```js
module.exports = (app) => {
  app.beforeStart(async () => {
    // 此处是你原来的逻辑代码
  });
};
```

现在升级之后的写法略有改变 —— 我们可以直接在 `app.js` 中用类方法的形式体现出来：对于应用开发而言，我们应该写在 `willReady` 方法中；对于插件则写在 `didLoad` 中。形式如下：

```js
// app.js 或 agent.js 文件：
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async didLoad() {
    // 请将你的插件项目中 app.beforeStart 中的代码置于此处。
  }

  async willReady() {
    // 请将你的应用项目中 app.beforeStart 中的代码置于此处。
  }
}

module.exports = AppBootHook;
```

## ready 函数替代

同样地，我们之前在 `app.ready` 中处理我们的逻辑：

```js
module.exports = (app) => {
  app.ready(async () => {
    // 此处是你原来的逻辑代码
  });
};
```

现在直接用 `didReady` 进行替换：

```js
// app.js 或 agent.js 文件：
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async didReady() {
    // 请将您的 app.ready 中的代码置于此处。
  }
}

module.exports = AppBootHook;
```

## beforeClose 函数替代

原先的 `app.beforeClose` 如以下形式：

```js
module.exports = (app) => {
  app.beforeClose(async () => {
    // 此处是你原来的逻辑代码
  });
};
```

现在我们只需使用类方法 `beforeClose` 替代即可：

```js
// app.js 或 agent.js 文件：
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async beforeClose() {
    // 请将您的 app.beforeClose 中的代码置于此处。
  }
}
```

## 其它说明

本教程只是一对一地讲了替换方法，便于开发者们快速上手进行替换；若想要具体了解整个 Loader 原理以及生命周期的完整函数版本，请参考[加载器](./loader.md)和[启动自定义](../basics/app-start.md)两篇文章。
