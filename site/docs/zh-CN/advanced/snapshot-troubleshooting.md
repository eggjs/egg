---
title: 快照故障排查
order: 9
---

# 快照故障排查

构建 [V8 启动快照](./snapshot.md) 会加载整个模块图并序列化堆。硬性约束是
**写入堆的所有内容都必须是可序列化的纯 JavaScript**。只要有一个依赖在模块求值阶段
打开了 socket、启动了 timer，或初始化了原生绑定，就可能导致整个 blob 无法构建——
或者构建成功，但在恢复时崩溃。

本页说明如何定位罪魁祸首模块，以及如何修复。

## 唯一的规则：堆里不能有「活的」资源

快照在构建期冻结堆、在恢复期解冻。有三类值无法通过这个往返过程：

- **原生（C++ 支撑的）绑定**——llhttp `HTTPParser`、`nghttp2`、TLS
  `SecureContext`、DNS `ChannelWrap`、原生 addon 等。
- **libuv 句柄**——打开的 socket、监听中的 server、timer、文件句柄、watcher、
  以及 IPC channel。
- **Node 的惰性 web 全局 getter**——`fetch`、`Headers`、`Request`、`Response`、
  `FormData`、`WebSocket`、`EventSource`、`MessageEvent`、`CloseEvent`，以及
  `Blob`/`File`（还有 `node:buffer` 自身的 `File`/`Blob` getter）都是访问器属性，
  首次触碰时会初始化 Node 内建 undici（→ 原生 http/http2）。访问器本身不可序列化。

当一个包在**模块求值阶段**、或在 `configWillLoad`（构建停止点）**之前**创建了上述
任意一种资源，它就是**快照不安全**的。同一个包如果把这些工作推迟到只在请求期运行的
函数里，通常就没问题。

::: tip Egg 已经替你处理了什么
bundler 默认把 Node 网络栈保持为 external 且惰性加载（`http`、`https`、`http2`、
`tls`、`dns`、`inspector` 和 `cluster`，以及它们的 `node:` 形式），同时让 `undici`、
`urllib` 保持 external 且惰性加载，并把 undici 支撑的 web 全局对象替换为构建期桩。只有
当某个**第三方依赖**或**不在该列表上的 builtin**触发了约束时，你才需要本页。机制细节见
[工作原理](./snapshot.md#工作原理)。
:::

## 第 1 步——确定失败发生面

快照可能在两个不同的点失败，错误特征会告诉你是哪一个。

### 构建期失败

`egg-bin snapshot build` 先打包应用，然后包裹执行
`node --snapshot-blob <blob> --build-snapshot worker.js`。当 V8 序列化器遇到不可
序列化的值时，会**以原生方式中止进程**——没有可捕获的 JS 错误。你会看到下列之一：

```text
# 子进程在序列化某个原生绑定时被杀
Error: <path>/node --snapshot-blob … --build-snapshot worker.js was killed by signal SIGSEGV

# 或非零退出
Error: <path>/node … exited with code 1

# 并且因为没有产出 blob：
snapshot build finished but no blob was written at <output>/snapshot.blob
```

如果是应用在加载元数据时抛出了普通错误（错误的配置、缺失的文件），worker 会在退出前
打印出来：

```text
[egg-bundler] failed to build snapshot: <message>
```

第一类意味着**某个模块捕获了不可序列化的东西**；第二类是普通的启动错误——按修复普通
启动失败的方式处理即可。

还有第三类、更少见的错误来自 bundler 自身，在 `node` 运行之前就发生：

```text
snapshot prelude: an externalRequire helper was emitted but the lazy hook
could not be injected (its signature did not match). …
```

这意味着 `@utoo/pack` 为 external require 生成的代码形态变了（通常是版本升级），导致
惰性 external 派发无法注入。bundler **故意 fail closed**，而不是产出一个会在构建期加载
网络栈的 blob——这不是应用 bug。请对齐 `@eggjs/egg-bundler` / `@utoo/pack` 的版本，
或提个 issue。

### 恢复期失败

`egg-scripts start --snapshot-blob <blob>`（或 `node --snapshot-blob`）会恢复堆。
常见特征：

| 现象                                                                               | 含义                                                                                                                                                                  |
| ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 反序列化中途原生 fatal `Check failed: current == end_slot_index`                   | 在 **Node.js < 24** 上恢复。请始终在 Node.js >= 24 上恢复。`egg-scripts` 在能判定目标 < 24 时会拒绝启动；若自定义 `--node` 的版本无法读取，则会落到下面的快照内守卫。 |
| `[egg-bundler] V8 snapshot restore requires Node.js >= 24, but this process is vX` | 快照自带的守卫触发了（你绕过了 `egg-scripts`，或它的版本探测 fail-open 了）。                                                                                         |
| `Error: Cannot find module '<pkg>'`                                                | 某个 **external** 依赖缺失。external 在恢复时会被 `require()` 真实加载，并从 worker 目录按 Node 的普通父目录规则解析——请把它安装到可解析到的 `node_modules` 中。      |
| `Aop Advice(X) not found in loadUnits`                                             | 某个 tegg 装饰类在 bundle 里保留了错误的源码路径（见 [tegg 装饰器](#tegg-aop-advice)）。                                                                              |
| 某个「打包前还好好的」库内部深处抛 `TypeError`                                     | 该库错误地处理了构建期的成员代理桩（见 [惰性 external 边界情况](#lazy-external-edge-cases)）。                                                                        |
| 模块求值期捕获的 `fetch`/`Request` 引用恢复后仍像桩                                | 捕获的是构建期引用。web 全局对象本身会重新安装，应在调用处读取（见 [已知限制](./snapshot.md#已知限制)）。                                                             |
| `[egg-bundler] failed to restore snapshot: <err>`                                  | 在完成延后生命周期（`snapshotDidDeserialize` → `didReady` → `listen`）时抛出的任何其他错误。                                                                          |

## 第 2 步——定位罪魁祸首模块（构建失败）

### 先检查构建环境

`egg-bin snapshot build` 在 spawn `node --build-snapshot` 前会剥离它**自己**注入的
TypeScript loader，但会继承你 shell 环境的其余部分。如果 `NODE_OPTIONS` 装入了自定义
loader 或 hook（`--require ts-node/register`、`--loader …`、`--import …`），它会随快照
构建子进程一起进入，并可能把不可序列化状态拉进堆——此时构建会以原生方式中止，
**且没有任何应用层面的原因**。请先在干净环境里构建：

```bash
$ unset NODE_OPTIONS   # 去掉任何继承来的 --require / --loader / --import
$ egg-bin snapshot build
```

### 打开调试日志

bundler 和启动器的每个阶段都通过 `util.debuglog` 打日志。用 `NODE_DEBUG` 打开相关
命名空间：

```bash
# bundler 流水线（manifest → entry → pack → prelude）
$ NODE_DEBUG='egg/bundler/*,egg/bin/commands/snapshot' egg-bin snapshot build

# 启动器（恢复守卫、spawn）
$ NODE_DEBUG='egg/scripts/commands/start' egg-scripts start --snapshot-blob ./dist-bundle/snapshot.blob
```

常用命名空间：

| 命名空间                       | 追踪内容                                                 |
| ------------------------------ | -------------------------------------------------------- |
| `egg/bundler/bundler`          | 打包开始、externals 解析结果、prelude/惰性 hook 注入计数 |
| `egg/bundler/entry-generator`  | 收集到的 bundle 入口、生成的 worker 入口路径             |
| `egg/bundler/manifest-loader`  | 发现并 externalize 了哪些内容                            |
| `egg/bundler/snapshot-prelude` | 哪些 external 的导出名无法读取                           |
| `egg/bin/commands/snapshot`    | 实际 spawn 的 `node --build-snapshot …` 命令             |

### 直接读原生中止信息

构建会以继承 stdio 的方式 spawn 子进程，因此 V8 序列化器的中止信息已经打印到你的
终端。为了更快迭代，可以从输出目录手动执行被包裹的命令——这正是 `egg-bin` 所运行的：

```bash
$ cd ./dist-bundle
$ node --snapshot-blob ./snapshot.blob --build-snapshot ./worker.js
```

序列化器中止时通常会指出它无法编码的对象类型（例如某个原生句柄），其周边栈会指向
创建该对象的模块。那就是你的首要嫌疑。

如果只想**打印**这条命令（含全局 exec 参数）而不运行它，用
`egg-bin snapshot build --dry-run`——它会先打包，然后把精确的
`node --snapshot-blob … --build-snapshot worker.js` 命令打印出来，而不 spawn。

### 用 `--skip-bundle` 二分

`--skip-bundle` 只对之前由 `egg-bin snapshot build` 生成的 snapshot-ready worker 入口
**重跑快照步骤**，跳过（缓慢的）打包；它不能把任意普通 bundle 直接转换成快照产物。
由于每个角色 bundle 都是单一自包含文件，你可以在 `worker.js` 里注释掉某个
`import`/`require`，几秒钟内重跑快照步骤：

```bash
# 1. 打包一次
$ egg-bin snapshot build --output ./dist-bundle
# 2. 编辑 ./dist-bundle/worker.js——注释掉某个嫌疑模块的求值
# 3. 只重跑快照构建
$ egg-bin snapshot build --output ./dist-bundle --skip-bundle
```

如果去掉某个模块的求值后 blob 能构建成功，那这个模块就是元凶。使用 `--cluster` 时，
同一个参数会复用 `app_worker.js` 和 `agent_worker.js`，重新构建两个角色的 blob。

### 用 `--force-external` 确认

把嫌疑包推**出** bundle 既是诊断手段也是修复手段。external 包自身的实现不会在构建期
被求值；快照 prelude 会给 bundle 内的调用方提供成员代理桩，并在恢复时真实加载该包。
所以如果 `--force-external <pkg>` 让构建成功了，说明该包自身的实现会在 import 时捕获
不可序列化状态：

```bash
$ egg-bin snapshot build --force-external some-native-client
```

## 第 3 步——修复

按下面的大致顺序，选用最轻量的可行修复。

### 1. 让包保持 external

最适合在 import 时打开连接、启动 timer 或加载原生 addon 的第三方包。它会留在快照
之外，并在恢复时被真实 require：

```bash
$ egg-bin snapshot build \
    --force-external undici \
    --force-external some-native-driver
```

该包（及其自身依赖）必须**安装在部署目标上**，因为它是在运行期加载的，并没有被烤进
blob。反向标志 `--inline-external <pkg>` 会把解析器自动 externalize 的包强制塞回
bundle。

### 2. 把 builtin 加入 `egg.snapshot.lazyModules`

对于在 import 时初始化原生状态、但不在默认惰性列表里的 **builtin**（或类 builtin 的
id），在 `package.json` 里添加。它会被合并到默认值之上，在构建期被打桩，在恢复时被
真实加载：

```json
{
  "egg": {
    "snapshot": {
      "lazyModules": ["node:zlib", "node:perf_hooks"]
    }
  }
}
```

内建默认值已经覆盖了 `http`、`https`、`http2`、`tls`、`dns`、`inspector` 和 `cluster`
（含它们的 `node:` 形式），以及 `undici`、`urllib` 两个包——这些无需自行列出。

### 3. 实现快照生命周期钩子

当**你自己的** Boot 代码持有不可序列化的资源（timer、socket、logger 流、连接池），
在序列化前释放、在恢复后重建：

```js
class AppBootHook {
  constructor(app) {
    this.app = app;
  }

  async snapshotWillSerialize() {
    // 在写入 blob 前关闭/解绑不可序列化资源
    clearInterval(this.timer);
    this.timer = null;
  }

  async snapshotDidDeserialize() {
    // 在恢复后的真实进程里重建
    this.timer = setInterval(() => this.app.doWork(), 1000);
  }
}

module.exports = AppBootHook;
```

完整约定见 [快照生命周期钩子](./snapshot.md#快照生命周期钩子)。在单进程快照模式下，
`agent.js` Boot 类的钩子也会运行——agent 的 `snapshotWillSerialize`/
`snapshotDidDeserialize` 在 app 的**之前**触发——因此 `agent.js` 持有的资源需要同样的
处理，且 `failed to restore snapshot` 错误也可能来自 agent 钩子。
cluster 模式下 app 与 agent 有各自的 bundle 和 blob，因此每个角色只围绕自己的堆运行
对应钩子。

### 4. 把工作移出模块作用域

最干净的修复往往就在你自己的代码里：把资源创建从顶层模块体移到一个在请求期运行的
函数中（或放进 `didReady`/`snapshotDidDeserialize`）。一个在求值期只**定义**类和函数的
模块永远是快照安全的；而一个在求值期就**建立连接**或**启动 timer** 的模块则不是。

```js
// ✗ 在模块求值期运行 → 被写入快照
const client = new SomeClient({ keepAlive: true });

// ✓ 首次使用时、在真实进程里创建
let client;
function getClient() {
  return (client ??= new SomeClient({ keepAlive: true }));
}
```

### 5. 在调用处引用 web 全局对象

Egg 会在恢复后重新安装 `globalThis.fetch` 和其他 undici 支撑的全局对象。但在模块求值期
捕获的引用仍会指向固化进 blob 的构建期桩。请在使用处读取全局对象，或者按需加载保持
external 的 `urllib`、`undici` 等 HTTP 客户端：

```js
// ✗ 捕获构建期桩
const request = globalThis.fetch;
await request(url);

// ✓ 在调用处读取恢复后的全局对象
await globalThis.fetch(url);
```

## 失败模式详解

### tegg 装饰器：「Aop Advice not found」 {#tegg-aop-advice}

tegg 装饰器（`@SingletonProto`、`@HTTPController`、`@Advice` 等）会在模块求值时
从调用栈用硬编码的栈深度捕获类的源码路径。在 bundle 里所有用户栈帧都坍缩到
`worker.js` 上，因此一个读取比常规**更深**栈帧的装饰器（典型是 `@Advice`）会捕获到
`worker.js` 而非自己的文件，于是 tegg 在恢复时无法把 proto 匹配到对应的 load unit。

bundler 会自动纠正这一点：它在序列化前根据 manifest 里 tegg 的 `decoratedFiles`
为每个装饰导出重新打上 `filePath`。如果你写了**自定义装饰器**、在非常规深度捕获栈帧
并撞上这个错误，请确认该装饰文件属于某个 tegg module（这样它才会出现在 `decoratedFiles`
里），或带上装饰器的栈深度提个 issue。

### 惰性 external 边界情况 {#lazy-external-edge-cases}

external 模块在构建期由一个**成员代理**表示：一个会记录对它执行的属性/调用/构造路径的
桩（这样 `class X extends pkg.Base {}` 和 `DataTypes.INTEGER(11).UNSIGNED` 仍能工作），
并在恢复时把该路径重放到真实模块上。

代理对常见模式是忠实的，但如果某个库对它在构建期拿到的值做了不寻常的处理——例如在错误
模板里把它强转成字符串，或基于某种奇特的 `typeof` 分支——就可能错误处理这个桩并抛出
令人困惑的 `TypeError`。如果你看到类似 `String.prototype.toString requires that 'this'
be a String` 的错误、源头在某个依赖内部且发生在恢复期，说明该依赖在期望具体值的地方
收到了成员代理。把该依赖保持 `--force-external`（使其自身实现不再对构建期代理求值）是
可靠的修复；bundle 内的调用方在恢复前仍会拿到这个 external 包的成员代理。

### 请求期文件缺失（运行期资源） {#runtime-assets}

一个能干净恢复的快照，仍可能在某个处理器读取文件时 `ENOENT`。在 `app/` 下，manifest
已知模块文件和源码类代码文件（`.ts`、`.js`、`.mjs`、`.cjs` 及其变体）会被排除，其他
资源会被拷贝；强制拷贝目录 `app/public`、`app/assets`、`app/static` 则会原样复制。配置的
roots 之外的资源和符号链接资源不会被拷贝。而且由于 bundle 把 `__dirname` 和
`import.meta.url` 重写成了输出目录，一个执行
`fs.readFileSync(path.join(__dirname, 'tpl.html'))` 或
`new URL('./x', import.meta.url)` 的模块会相对 bundle 输出目录解析——如果该文件从未
被拷贝过去，就会在请求期（而非构建或恢复期）失败。

在 `module.yml` 里声明这些额外资源，它们就会被拷贝进 bundle：

```yaml
bundle:
  runtimeAssets:
    roots: ['app', 'resources']
    forceCopyDirs: ['app/public', 'app/assets', 'app/static', 'resources/templates']
```

### 构建成功，但 blob 缺失

`node --build-snapshot` 可能在没写出 blob 的情况下以 `0` 退出——例如入口在
`snapshotWillSerialize` 钩子之后、`setDeserializeMainFunction` 之前抛了错。
`egg-bin snapshot build` 会检查 blob 是否存在，并以
`snapshot build finished but no blob was written at <path>` 显式失败。请带上
`NODE_DEBUG` 重跑，并检查 worker 自己的输出找到底层错误。

## 配置参考

| 机制                                                   | 位置                                    | 用途                                                                                            |
| ------------------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `--force-external <pkg>`                               | `egg-bin snapshot build` 标志（可重复） | 把包留在 bundle 外，恢复时真实加载。                                                            |
| `--inline-external <pkg>`                              | `egg-bin snapshot build` 标志（可重复） | 把被自动 externalize 的包强制塞回 bundle。                                                      |
| `egg.snapshot.lazyModules`                             | 应用 `package.json`                     | 向惰性 external 集合添加 builtin/类 builtin 的 id（合并到默认值之上）。                         |
| `snapshotWillSerialize()` / `snapshotDidDeserialize()` | `app.js` / `agent.js` Boot 类           | 释放并重建你自己代码持有的资源。                                                                |
| `--pack-alias <spec>=<target>`                         | `egg-bin snapshot build` 标志（可重复） | 打包期重定向某个模块说明符。                                                                    |
| `--skip-bundle`                                        | `egg-bin snapshot build` 标志           | 只对已有的 snapshot-ready worker 入口重跑快照步骤。                                             |
| `--dry-run`                                            | `egg-bin snapshot build` 标志           | 打印 `node --build-snapshot` 命令但不 spawn。                                                   |
| `bundle.runtimeAssets.roots` / `forceCopyDirs`         | 应用 `module.yml`                       | 把额外的非源码文件拷进 bundle，使其在请求期存在。                                               |
| `--no-sourcemap`                                       | `egg-scripts start` 标志                | 当自动注入的 `--import source-map-support/register` 干扰恢复启动时（TypeScript 应用）将其去掉。 |
| `NODE_OPTIONS`                                         | 环境变量                                | 构建前必须不含自定义 `--loader`/`--require`/`--import`（它们会随快照子进程一起进入）。          |
| `NODE_DEBUG=egg/bundler/*`                             | 环境变量                                | 追踪 bundler/启动器流水线。                                                                     |

构建/恢复流程与支持范围见主页 [V8 启动快照](./snapshot.md)。
