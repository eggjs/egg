---
title: 常见问题
order: 3
---

如果下面的内容无法解决你的问题，请查看 [Egg issues](https://github.com/eggjs/egg/issues)。

## 如何高效地反馈问题？

感谢你向我们反馈问题。

1. 我们推荐如果是小问题（错别字修改、小的 bug 修复）直接提交 PR。
2. 如果是一个新需求，请提供：详细需求描述，最好是有伪代码示意。
3. 如果是一个 BUG，请提供：复现步骤、错误日志以及相关配置，并尽量填写下面的模板中的条目。
4. **如果可以，尽可能使用 `npm init egg --type=simple bug` 提供一个最小可复现的代码仓库，方便我们排查问题。**
5. 不要挤牙膏似的交流，扩展阅读：[如何向开源项目提交无法解答的问题](https://zhuanlan.zhihu.com/p/25795393)。

最重要的是，请明白一件事：开源项目的用户和维护者之间并不是甲方和乙方的关系；issue 也不是客服工单。在开 issue 的时候，请抱着一种『我们一起合作来解决这个问题』的心态，不要期待我们单方面地为你服务。

## 为什么我的配置不生效？

框架的配置功能比较强大，有不同环境变量，还有框架、插件、应用等多个配置。

如果你在分析问题时想知道当前运行时使用的最终配置，可以查看下 `${root}/run/application_config.json`（worker 进程配置）和 `${root}/run/agent_config.json`（agent 进程配置）这两个文件。(`root` 为应用根目录，只有在 local 和 unittest 环境下为项目所在目录，其他环境下为 HOME 目录)

也可以参见[配置文件](../basics/config.md#配置结果)。

PS：请确保没有写出以下代码：

```js
// config/config.default.js
exports.someKeys = 'abc';
module.exports = (appInfo) => {
  const config = {};
  config.keys = '123456';
  return config;
};
```

## 线上的日志打印去哪里了？

默认配置下，本地开发环境的日志都会打印在应用根目录的 `logs` 文件夹下 (`${baseDir}/logs`)，但在非开发期的环境（非 local 和 unittest 环境）中，所有日志都会打印到 `$HOME/logs` 文件夹下（例如 `/home/admin/logs`）。这样可以让本地开发时应用日志互不影响，服务器运行时又有统一的日志输出目录。

## 进程管理为什么没有选型 PM2？

1. PM2 模块本身复杂度很高，出了问题很难排查。我们认为框架使用的工具复杂度不应该过高，而 PM2 自身的复杂度超越了大部分应用本身。
2. 没法做非常深的优化。
3. 切实需要解决如：多个进程中有一个充当 leader，其他进程则通过代理的方式将请求转发给 leader 这种模式（[多进程模型](../core/cluster-and-ipc.md)），这在企业级开发中可以减少远端连接，降低数据通信压力。特别是当应用规模大到一定程度时，这就会是必需。egg 起源于蚂蚁金服和阿里，我们的起点就是大规模企业应用的构建，所以需要非常全面。这些特性通过 PM2 很难实现。

进程模型非常重要，会影响开发模式以及运行期间的深度优化等，我们认为可能由框架来控制比较合适。

**如何使用 PM2 启动应用？**

尽管我们不推荐使用 PM2 启动，你仍然可以这样做。

首先，在项目根目录定义启动文件：

```js
// server.js
const egg = require('egg');

const workers = Number(process.argv[2] || require('os').cpus().length);
egg.startCluster({
  workers,
  baseDir: __dirname,
});
```

接着，就可以通过 PM2 启动：

```bash
pm2 start server.js
```

## 为什么会有 csrf 报错？

通常有两种 csrf 报错：

- `missing csrf token`
- `invalid csrf token`

Egg 内置的 [@eggjs/security](https://github.com/eggjs/security/) 插件默认对所有“非安全”的方法，例如 `POST`、`PUT`、`DELETE`，都进行 CSRF 校验。

遇到 csrf 报错通常是因为没有加正确的 csrf token 导致的，具体实现方式，请阅读[安全威胁 CSRF 的防范](../core/security.md#安全威胁csrf的防范)。

## 本地开发时，修改代码后为什么 worker 进程没有自动重启？

worker 进程没有自动重启的情形通常发生在使用 Jetbrains 旗下软件（例如 IntelliJ IDEA、WebStorm 等），并且开启了 Safe Write 选项时。

Jetbrains [Safe Write 文档](https://www.jetbrains.com/help/webstorm/2016.3/system-settings.html) 中有提到（翻译如下）：

>“如果此复选框打钩，变更的文件将首先被存储在一个临时文件中。如果文件保存成功，则临时文件会替换原文件（从技术上讲，原文件被删除，临时文件被重命名）。”

由于使用了重命名，文件监听失效。解决方法是关闭 Safe Write 选项。（Settings | Appearance & Behavior | System Settings | Use "safe write"，路径可能因版本不同有所差异）
