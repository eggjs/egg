---
title: 启动自定义
order: 12
---

我们常常需要在应用启动期间进行一些初始化工作，待初始化完成后，应用才可以启动成功，并开始对外提供服务。

框架提供了统一的入口文件（`app.js`）进行启动过程自定义。这个文件需要返回一个 Boot 类。我们可以通过定义 Boot 类中的生命周期方法来执行启动应用过程中的初始化工作。

框架提供了以下 [生命周期函数](../advanced/loader.md#life-cycles) 供开发人员处理：
- 配置文件即将加载，这是最后动态修改配置的时机（`configWillLoad`）；
- 配置文件加载完成（`configDidLoad`）；
- 文件加载完成（`didLoad`）；
- 插件启动完毕（`willReady`）；
- worker 准备就绪（`didReady`）；
- 应用启动完成（`serverDidReady`）；
- 应用即将关闭（`beforeClose`）。

我们可以在 `app.js` 中定义这个 Boot 类。下面我们抽取几个在应用开发中常用的生命周期函数为例：

```js
// app.js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  configWillLoad() {
    // 此时 config 文件已经被读取并合并，但还并未生效
    // 这是应用层修改配置的最后机会
    // 注意：此函数只支持同步调用

    // 例如：参数中的密码是加密的，在此处进行解密
    this.app.config.mysql.password = decrypt(this.app.config.mysql.password);
    // 例如：插入一个中间件到框架的 coreMiddleware 之间
    const statusIdx = this.app.config.coreMiddleware.indexOf('status');
    this.app.config.coreMiddleware.splice(statusIdx + 1, 0, 'limit');
  }

  async didLoad() {
    // 所有配置已经加载完毕
    // 可以用来加载应用自定义的文件，启动自定义服务

    // 例如：创建自定义应用的实例
    this.app.queue = new Queue(this.app.config.queue);
    await this.app.queue.init();

    // 例如：加载自定义目录
    this.app.loader.loadToContext(path.join(__dirname, 'app/tasks'), 'tasks', {
      fieldClass: 'tasksClasses',
    });
  }

  async willReady() {
    // 所有插件已启动完毕，但应用整体尚未 ready
    // 可进行数据初始化等操作，这些操作成功后才启动应用

    // 例如：从数据库加载数据到内存缓存
    this.app.cacheData = await this.app.model.query(QUERY_CACHE_SQL);
  }

  async didReady() {
    // 应用已启动完毕

    const ctx = await this.app.createAnonymousContext();
    await ctx.service.Biz.request();
  }

  async serverDidReady() {
    // http/https 服务器已启动，开始接收外部请求
    // 此时可以从 app.server 获取 server 实例

    this.app.server.on('timeout', socket => {
      // 处理 socket 超时
    });
  }
}

module.exports = AppBootHook;
```

**注意：在自定义生命周期函数中，不建议进行耗时的操作，因为框架会有启动的超时检测。**

如果你的 Egg 框架的生命周期函数是旧版本的，建议你将其升级到类方法模式；详情请查看[升级你的生命周期事件函数](../advanced/loader-update.md)。