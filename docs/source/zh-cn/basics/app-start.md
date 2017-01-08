# 应用启动自定义

我们常常需要在应用启动期间进行一些初始化工作，等初始化完成后应用才可以启动成功，并开始对外提供服务。

## 文件入口

框架提供了统一的入口进行启动过程自定义：根目录下的 `app.js`。

## 示例

例如，我们需要在应用启动期从远程 city json 接口加载一份全国城市列表，以便于后续 controller 中使用：

```js
// app.js
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
