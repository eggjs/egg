---
title: Upgrade your event functions in your lifecycle
order: 6
---

We've simplified the functions of our lifecycle for your convenience to control when to load application or plugins. Generally speaking, the lifecycle events can be divided into two forms:

1. Function (already deprecated, just for compatibility).
2. Class Method (recommanded).

## Replacer for `beforeStart`

We usually handle `beforeStart` through `module.export` with the input parameter `app` in the app.js.
Take this as an example below:

```js
module.exports = (app) => {
  app.beforeStart(async () => {
    // Here's where your codes were before
  });
};
```

Now we've got some changes after upgration: We can use methods in a class in `app.js`. For application, we should write in the `WillReady`, for plugins, `didLoad` is our choice. They look like below:

```js
// app.js or agent.js:
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async didLoad() {
    // Please put your codes of `app.beforeStart` here for your plugin
  }

  async willReady() {
    // Please put your codes of `app.beforeStart` here for your application
  }
}

module.exports = AppBootHook;
```

## Replacer for `ready`

We used to process our logic in `app.ready`:

```js
module.exports = (app) => {
  app.ready(async () => {
    // Here's where your codes were before
  });
};
```

Now `didReady` takes the place of it:

```js
// app.js or agent.js:
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async didReady() {
    // Please put your codes of `app.ready` here
  }
}

module.exports = AppBootHook;
```

## Replacer for `beforeClose`

We used to handle `app.beforeClose` like this following:

```js
module.exports = (app) => {
  app.beforeClose(async () => {
    // Here's where your codes were before
  });
};
```

Now we can use `beforeClose` instead of it:

```js
// app.js or agent.js:
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async beforeClose() {
    // Please put your codes of `app.beforeClose` here
  }
}
```

## Others

In order to let you pick up quickly to replace your old functions, this torturial only tells you how to replace item by item. So if you want to know more about the whole principle of `Loader`, as well as all the functions of Egg's lifecycle, Please refer to [Loader](./loader.md) and [Application Startup Configuration](../basics/app-start.md).
