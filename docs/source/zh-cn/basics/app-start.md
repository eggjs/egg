# 启动自定义

我们常常需要在应用启动期间进行一些初始化工作，等初始化完成后应用才可以启动成功，并开始对外提供服务。

## 应用自定义

框架提供了统一的入口进行启动过程自定义 `app/init.js`，在所有文件同步加载完毕后才会加载这个文件，文件运行完成后服务才会启动。

例如，我们需要在应用启动期间从远程接口加载一份全国城市列表，以便于后续在 controller 中使用：

```js
// app/init.js
module.exports = function*(app) {
  app.cities = yield app.curl('http://example.com/city.json', {
    method: 'GET',
    dataType: 'json',
  });
};
```

在 controller 中就可以使用了：

```js
// app/controller/city.js
module.exports = function*() {
  // this.app.cities 在上面启动期间已经加载，可以直接使用
}
```

## 插件自定义

框架还提供了 `app.js` 这个文件进行初始化，常用于插件自定义启动，使用方式和 `init.js` 类似，只是加载的时机不同。`app.js` 加载时间会早于 `init.js`，具体加载顺序请查看 [Loader 文档](../advanced/loader.md)。
