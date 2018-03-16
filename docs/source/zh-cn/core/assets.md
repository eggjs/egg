title: 静态资源
---

[egg-view-assets] 提供了通用的静态资源管理和本地开发方案，有如下功能

1. 一体化本地开发方案
2. 生产环境静态资源映射
3. 和模板引擎集成
4. 在[约定下](#构建工具约定)可使用多种构建工具，如 [webpack]、[roadhog]、[umi] 等

## 页面渲染

可通过自动或手动的方式添加静态资源，以下有两种方式

### 使用 assets 模板引擎

assets 模板引擎并非服务端渲染，而是以一个静态资源文件作为入口，使用基础模板渲染出 html，并将这个文件插入到 html 的一种方式，可以先查看[使用 roadhog 的例子](https://github.com/eggjs/examples/tree/master/assets-with-roadhog)。

配置插件

```javascript
// config/plugin.js
exports.assets = {
  enable: true,
  package: 'egg-view-assets',
}
```

配置 assets 模板引擎

```javascript
// config/config.default.js
exports.view = {
  mapping: {
    '.js': 'assets',
  },
};
```

添加静态资源入口文件 `app/view/index.js`，然后调用 render 方法进行渲染

```javascript
// app/controller/home.js
module.exports = class HomeController extends Controller {
  async render() {
    await this.ctx.render('index.js');
  }
}
```

渲染的结果如下

```html
<!doctype html>
<html>
  <head>
    <link rel="stylesheet" href="http://127.0.0.1:8000/index.css"></link>
  </head>
  <body>
    <div id="root"></div>
    <script src="http://127.0.0.1:8000/index.js"></script>
  </body>
</html>

```

**注意：这个路径生成规则是有映射的，如 `index.js` -> `http://127.0.0.1:8000/index.js`。如果本地开发工具不支持这层映射，比如自定义了 entry 配置，可以使用其他模板引擎。**

#### 全局自定义 html 模板

一般默认的 html 无法满足需求，可以指定模板路径和模板引擎。

```javascript
// config/config.default.js
module.exports = appInfo => ({
  assets: {
    templatePath: path.join(appInfo.baseDir, 'app/view/template.html'),
    templateViewEngine: 'nunjucks',
  },
});
```

添加模板文件

```jinja2
<!doctype html>
<html>
  <head>
    {{ helper.assets.getStyle() | safe }}
  </head>
  <body>
    <div id="root"></div>
    {{ helper.assets.getScript() | safe }}
  </body>
</html>
```

[egg-view-assets] 插件提供了 `helper.assets` 根据自己的场景调用，`helper.assets.getScript()` 可以不用传参，会将 `render` 函数的参数透传。

#### 页面自定义 html 模板

支持根据不同页面指定模板

```javascript
// app/controller/home.js
module.exports = class HomeController extends Controller {
  async render() {
    await this.ctx.render('index.js', {}, {
      templatePath: path.join(this.app.config.baseDir, 'app/view/template.html'),
      templateViewEngine: 'nunjucks',
    });
  }
}
```



### 使用其他模板引擎

### 上下文数据

## 本地开发工具

### 构建工具约定

## 部署





[webpack]:

[roadhog]:

[umi]:

[egg-view-assets]: