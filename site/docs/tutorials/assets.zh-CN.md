---
title: 静态资源
---

[`egg-view-assets`](https://github.com/eggjs/egg-view-assets) 提供了通用的静态资源管理和本地开发方案，具有以下功能：

1. 一体化的本地开发方案
2. 生产环境下的静态资源映射
3. 与模板引擎集成
4. 根据[约定](#构建工具约定)可以使用多种构建工具，例如 [`webpack`](https://webpack.js.org/)、[`roadhog`](https://github.com/sorrycc/roadhog)、[`umi`](https://umijs.org/) 等

您可以参考以下示例了解详情：

- [`roadhog` 工具示例](https://github.com/eggjs/examples/tree/master/assets-with-roadhog)
- [`umi` 工具示例](https://github.com/eggjs/examples/tree/master/assets-with-umi)
- [Ant Design Pro 示例](https://github.com/eggjs/egg-ant-design-pro)
## 页面渲染

可通过自动或手动方式添加静态资源，以下有两种方法：

### 使用 assets 模板引擎

assets 模板引擎并非服务端渲染，而是以一个静态资源文件作为入口，使用基础模板渲染出 HTML，并将这个文件插入到 HTML 的一种方法，查看 [使用 roadhog 的例子](https://github.com/eggjs/examples/tree/master/assets-with-roadhog)。

**配置插件：**

```js
// config/plugin.js
exports.assets = {
  enable: true,
  package: 'egg-view-assets',
};
```

**配置 assets 模板引擎：**

```js
// config/config.default.js
exports.view = {
  mapping: {
    '.js': 'assets',
  },
};
```

添加静态资源入口文件 `app/view/index.js`，然后调用 `render` 方法进行渲染：

```js
// app/controller/home.js
module.exports = class HomeController extends Controller {
  async render() {
    await this.ctx.render('index.js');
  }
};
```

**渲染的结果如下：**

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

一般默认的 HTML 无法满足需求，可以指定模板路径和模板引擎：

```js
// config/config.default.js
module.exports = appInfo => ({
  assets: {
    templatePath: path.join(appInfo.baseDir, 'app/view/template.html'),
    templateViewEngine: 'nunjucks',
  },
});
```

添加模板文件：

```html
<!DOCTYPE html>
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

支持根据不同页面指定模板，可以在 `render` 方法传参：

```js
// app/controller/home.js
module.exports = class HomeController extends Controller {
  async render() {
    await this.ctx.render(
      'index.js',
      {},
      {
        templatePath: path.join(
          this.app.config.baseDir,
          'app/view/template.html'
        ),
        templateViewEngine: 'nunjucks',
      }
    );
  }
};
```

#### 修改静态资源目录

以上例子是将静态资源放到 `app/view` 目录下，但大部分情况希望将它们放到独立目录，如 `app/assets`。因为 assets 模板引擎使用 `egg-view` 的加载器，所以直接修改其配置：

```js
// config/config.default.js
module.exports = appInfo => ({
  view: {
    // 如果还有其他模板引擎，需要合并多个目录
    root: path.join(appInfo.baseDir, 'app/assets'),
  },
});
```
### 使用其他模板引擎

如果默认的 assets 模板引擎无法满足需求，你可以考虑结合其他模板引擎使用。这种情况下不需要配置 assets 模板引擎，你可以参考 [使用 umi 的例子](https://github.com/eggjs/examples/tree/master/assets-with-umi)。

```js
// config/config.default.js
exports.view = {
  mapping: {
    '.html': 'nunjucks',
  },
};
```

渲染模板

```js
// app/controller/home.js
module.exports = class HomeController extends Controller {
  async render() {
    await this.ctx.render('index.html');
  }
};
```

添加模板文件（这里简化了 umi 的模板）

```html
<!DOCTYPE html>
<html>
  <head>
    {{ helper.assets.getStyle('umi.css') | safe }}
  </head>
  <body>
    <div id="root"></div>
    {{ helper.assets.getScript('umi.js') | safe }}
  </body>
</html>
```

**在其他模板中，必须添加参数以生成所需的静态资源路径。**

### 上下文数据

有时前端需要获取服务端数据。因此，在渲染页面时，我们通常会向 `window` 全局对象设置数据。

如果使用 assets 模板引擎，默认的前端代码可以从 `window.context` 获取数据。

```js
// app/controller/home.js
module.exports = class HomeController extends Controller {
  async render() {
    await this.ctx.render('index.js', { data: 1 });
  }
};
```

使用其他模板引擎时，你需要调用 `helper.assets.getContext(__context__)` 函数，并传入相应的上下文参数。

```js
// app/controller/home.js
module.exports = class HomeController extends Controller {
  async render() {
    await this.ctx.render('index.html', {
      __context__: { data: 1 },
    });
  }
};
```

默认的属性名为 `context`，但你可以通过以下配置来修改它：

```js
exports.assets = {
  contextKey: '__context__',
};
```
## 构建工具

这种模式最重要的是和构建工具整合，保证本地开发体验及自动部署，所以构建工具和框架需要有一层约定。

下面以 roadhog 为例。

### 映射关系

构建工具的 entry 配置决定了映射关系，如基于 webpack 封装的 roadhog、umi 等工具内置了映射关系。如果单独使用 webpack，则需要根据这层映射来选择使用哪种方式：

- 文件源码 `app/assets/index.js`，对应的 entry 为 `index.js`。
- 本地静态服务接收以此为 entry，如请求 `http://127.0.0.1:8000/index.js`。
- 构建生成的文件需要有这层映射关系，如生成 `index.{hash}.js` 并生成 manifest 文件描述关系，例如：

  ```json
  {
    "index.js": "index.{hash}.js"
  }
  ```

roadhog 完全满足这个映射关系，可使用 [assets 模板引擎](#使用-assets-模板引擎)。而 umi 不满足文件映射，因为它只有一个入口文件 `umi.js`。因此，可以选择[其他模板引擎](#使用其他模板引擎)的方案。

**其他构建工具接入需要满足这层映射关系。**

### 本地开发

查看[示例配置](https://github.com/eggjs/examples/blob/master/assets-with-roadhog/config/config.default.js)，本地服务配置为 `roadhog dev`，配置 `port` 来检查服务是否启动完成。因为 roadhog 默认启动端口为 8000，所以这里配置为 8000：

```js
exports.assets = {
  devServer: {
    command: 'roadhog dev',
    port: 8000
  }
};
```

### 部署

静态资源部署之前需要构建，配置 `roadhog build` 命令，并执行 `npm run build`：

```json
{
  "scripts": {
    "build": "SET_PUBLIC_PATH=true roadhog build"
  }
}
```

**注意**：此处添加了 `SET_PUBLIC_PATH` 变量，因为 roadhog 这样才能开启 publicPath。

构建的结果根据 `.webpackrc` 配置的 output 决定，示例中是放到 `app/public` 目录下，由 `egg-static` 提供服务。

同时根据 `.webpackrc` 配置的 manifest 生成一个 `manifest.json` 文件到 `config` 目录下（Egg 读取此文件作为映射关系）。

#### 应用提供服务

现在，应用启动后可以通过 `http://127.0.0.1:7001/public/index.{hash}.js` 访问静态资源。这里多了一层 public 路径，所以需要添加 publicPath 配置：

```js
// config/config.prod.js
exports.assets = {
  publicPath: '/public/'
};
```

#### 使用 CDN

通常情况下，静态资源会部署到 CDN 上。因此，在构建完成后，平台需要将构建产物发布到 CDN，例如 `https://cdn/myapp/index.{hash}.js`。

此时，除了 publicPath 还需修改静态资源地址：

```js
// config/config.prod.js
exports.assets = {
  url: 'https://cdn',
  publicPath: '/myapp/'
};
```

[webpack]: https://webpack.js.org/
[roadhog]: https://github.com/sorrycc/roadhog
[umi]: https://umijs.org/
[egg-view-assets]: https://github.com/eggjs/egg-view-assets
