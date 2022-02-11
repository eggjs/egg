---
title: Application Startup Configuration
order: 12
---

When the application starts up, we often need to set up some initialization logic. The application bootstraps with those specific configurations. It is in a healthy state and be able to take external service requests after those configurations successfully applied. Otherwise, it failed.

The framework provides a unified entry file (`app.js`) for boot process customization. This file need returns a Boot class. We can define the initialization process in the startup application by defining the lifecycle method in the Boot class.

The framework has provided you several functions to handle during the whole [life cycle](../advanced/loader.md#life-cycles):

- `configWillLoad`: All the config files are ready to load, so this is the LAST chance to modify them.
- `configDidLoad`: When all the config files have been loaded.
- `didLoad`: When all the files have been loaded.
- `willReady`: When all the plug-ins are ready.
- `didReady`: When all the workers are ready.
- `serverDidReady`: When the server is ready.
- `beforeClose`: Before the application is closed.

We can defined Boot class in `app.js`. Below we take a few examples of lifecycle functions commonly used in application development:

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    // The config file has been read and merged, but it has not yet taken effect
    // This is the last time the application layer modifies the configuration
    // Note: This function only supports synchronous calls.

    // For example: the password in the parameter is encrypted, decrypt it here
    this.app.config.mysql.password = decrypt(this.app.config.mysql.password);
    // For example: insert a middleware into the framework's coreMiddleware
    const statusIdx = this.app.config.coreMiddleware.indexOf('status');
    this.app.config.coreMiddleware.splice(statusIdx + 1, 0, 'limit');
  }

  async didLoad() {
    // All configurations have been loaded
    // Can be used to load the application custom file, start a custom service

    // Example: Creating a custom app example
    this.app.queue = new Queue(this.app.config.queue);
    await this.app.queue.init();

    // For example: load a custom directory
    this.app.loader.loadToContext(path.join(__dirname, 'app/tasks'), 'tasks', {
      fieldClass: 'tasksClasses',
    });
  }

  async willReady() {
    // All plugins have been started, but the application is not yet ready
    // Can do some data initialization and other operations
    // Application will start after these operations executed succcessfully

    // For example: loading data from the database into the in-memory cache
    this.app.cacheData = await this.app.model.query(QUERY_CACHE_SQL);
  }

  async didReady() {
    // Application already ready

    const ctx = await this.app.createAnonymousContext();
    await ctx.service.Biz.request();
  }

  async serverDidReady() {
    // http / https server has started and begins accepting external requests
    // At this point you can get an instance of server from app.server

    this.app.server.on('timeout', (socket) => {
      // handle socket timeout
    });
  }
}

module.exports = AppBootHook;
```

**Note: It is not recommended to do long-time operations in the custom lifecycle function, because the framework has a startup timeout detection.**

If your Egg's life-cycle functions are old, we suggest you upgrading to the "class-method" mode. For more you can refer to [Upgrade your event functions in your lifecycle](../advanced/loader-update.md).
