title: 应用部署
---

在[本地开发](./development.md)时，我们使用 `egg-bin dev` 来启动服务，但是在部署应用的时候不可以这样使用。因为 `egg-bin dev` 会针对本地开发做很多处理，而生产运行需要一个更加简单稳定的方式。所以本章主要讲解如何部署你的应用。

一般从源码代码到真正运行，我们会拆分成构建和部署两步，可以做到**一次构建多次部署**。

## 构建

Javascript 语言本身不需要编译的，构建过程主要是下载依赖。但如果使用 Typscript 或者 Babel 支持 ES6 以上的特性，那就必须要这一步了。

一般安装依赖会指定 `NODE_ENV=production` 或 `npm install --production` 只安装 dependencies 的依赖。因为 devDependencies 中的模块过大而且在生产环境不会使用，安装后也可能遇到未知问题。

```bash
$ cd baseDir
$ npm install --production
$ tar -zcvf ../release.tgz .
```

构建完成后打包成 tgz 文件，部署的时候解压启动就可以了。

增加构建环节才能做到真正的**一次构建多次部署**，理论上代码没有改动的时候是不需要再次构建的，可以用原来的包进行部署，这有着不少好处：

- 构建依赖的环境和运行时是有差异的，所以不要污染运行时环境。
- 可以减少发布的时间，而且易回滚，只需要把原来的包重新启动即可。

## 部署

服务器需要预装 Node.js，框架支持的 Node 版本为 `>= 6.0.0`。

框架使用 [egg-cluster] 来启动 [Master 进程](./cluster-and-ipc.md#master)，Master 有足够的稳定性，不再需要使用 [pm2] 等进程守护模块。[egg-cluster] 已集成到框架中，只需要调用 `egg.startCluster` 方法。

更多参数可参考 [egg-cluster](https://github.com/eggjs/egg-cluster#options)

### 创建启动文件

在应用根目录创建一个启动文件，比如 `dispatch.js`

```js
// dispatch.js
const egg = require('egg');

egg.startCluster({
  baseDir: __dirname,
});
```

### 后台运行

然后运行这个文件，将标准输出重定向到 `stdout.log`，错误输出重定向到 `stderr.log`，便于排查问题。

```bash
EGG_SERVER_ENV=prod nohup node dispacth.js > stdout.log 2> stderr.log &
```

注意：

- **生产环境使用的 EGG_SERVER_ENV 必须为 prod**，可查看[运行环境](./basics/env.md)获取更多内容。
- 如果使用 Docker，可直接前台运行。
- 默认情况框架会创建和 CPU 核数相当的 app worker 数，可以充分的利用 CPU 资源。

### 自定义框架启动

如果应用使用了[自定义框架](./advanced/framework.md)，还需要指定额外的参数，比如框架为 `yadan`。

```js
// dispatch.js
const path = require('path');
const egg = require('egg');

egg.startCluster({
  baseDir: __dirname,
  customEgg: path.join(__dirname, 'node_modules/yadan'),
});
```

[egg-cluster]: https://github.com/eggjs/egg-cluster
[pm2]: https://github.com/Unitech/pm2
