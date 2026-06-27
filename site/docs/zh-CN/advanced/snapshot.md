---
title: V8 启动快照
order: 8
---

# V8 启动快照

Egg 可以把一个完全加载好的应用固化成 [V8 启动快照](https://nodejs.org/api/cli.html#--build-snapshot)，
从而让冷启动跳过绝大部分启动开销。构建快照时会加载整个模块图——框架元数据、
插件、Service、Router 和 tegg 模块——并把生命周期跑到 `configWillLoad`，再把此时的
堆序列化成一个 blob。恢复 blob 时只需继续执行剩余生命周期（`didReady`）并开始监听，
进程几乎可以立即对外服务。

它构建在 [Bundle 部署](../core/bundle.md) 之上：快照是从单文件自包含 bundle 产出的，
因此可以把快照理解为「预启动好的 bundle」。

## Node.js 版本要求

| 阶段             | 命令                                | Node.js |
| ---------------- | ----------------------------------- | ------- |
| **构建**快照     | `egg-bin snapshot build`            | >= 22   |
| **恢复**（运行） | `egg-scripts start --snapshot-blob` | >= 24   |

::: warning 恢复必须使用 Node.js >= 24
快照可以在 Node.js >= 22 上**构建**，但在 Node.js 22 上**恢复**一个非平凡的 Egg 堆时，
进程会在反序列化阶段以原生 fatal 错误崩溃（`Check failed: current == end_slot_index`，
属于 V8 的 bug）。请始终在 Node.js **>= 24** 上恢复。

受支持的启动方式会强制拦截：`egg-scripts start --snapshot-blob` 在 Node.js < 24 时会在
启动任何进程前直接报清晰错误并拒绝启动。如果你绕过它、在 Node.js 22 上直接运行
`node --snapshot-blob`，进程仍会在反序列化阶段以上面的原生 fatal 崩溃——快照自带的运行时
拦截只能在「能完成反序列化但仍低于 24」的版本上打印友好提示。因此请始终通过 `egg-scripts`
在 Node.js >= 24 上恢复。
:::

## 使用 CLI 构建与恢复

推荐使用 bundler CLI。注意没有 `egg-bin snapshot start`：构建属于构建期（`egg-bin`），
恢复属于生产运行期（`egg-scripts`）。

### 构建 blob

```bash
# 以快照模式打包（单文件自包含 worker.js + prelude），并自动执行
# `node --snapshot-blob <blob> --build-snapshot worker.js`
$ egg-bin snapshot build
```

默认会把 bundle 写到 `./dist-bundle`，blob 写到 `./dist-bundle/snapshot.blob`。常用参数：

| 参数               | 说明                                               |
| ------------------ | -------------------------------------------------- |
| `--output <dir>`   | bundle 输出目录（`worker.js` 所在目录）。          |
| `--blob <path>`    | 快照 blob 路径，默认 `<output>/snapshot.blob`。    |
| `--force-external` | 始终保持 external 的包，可重复（见「已知限制」）。 |
| `--skip-bundle`    | 从已有的 `worker.js` 构建 blob（跳过打包）。       |

### 恢复并提供服务

直接用 `egg-scripts` 从 blob 启动进程（Node.js >= 24）：

```bash
$ egg-scripts start --snapshot-blob ./dist-bundle/snapshot.blob --port 7001
```

它会启动一个单文件自包含的 `node --snapshot-blob <blob>` 进程（没有 egg-cluster，也
不做框架解析）。快照主函数从 `PORT`（或 `--port`）读取监听端口，执行
`snapshotDidDeserialize` 钩子，然后调用 `app.listen()`。

## 对外 API

如果需要自定义入口文件，Egg 也从 `egg` 导出两个方法：

```ts
import { buildSnapshot, restoreSnapshot } from 'egg';
```

- `buildSnapshot()` 会以快照模式启动 Egg，加载元数据，触发非可序列化资源的清理钩子，
  并把应用对象写入 V8 快照负载。
- `restoreSnapshot()` 会从快照中恢复应用，重建运行期资源，并继续执行剩余的 Egg 生命周期。

构建入口：

```ts
import { buildSnapshot } from 'egg';

await buildSnapshot({
  baseDir: import.meta.dirname,
});
```

```bash
node --snapshot-blob=snapshot.blob --build-snapshot snapshot-entry.mjs
```

恢复入口（Node.js >= 24）：

```ts
import { restoreSnapshot } from 'egg';

const app = await restoreSnapshot();
await app.listen(7001);
```

`restoreSnapshot()` 会从 `configDidLoad` 继续执行正常启动流程直到 `didReady`，因此返回的
`app` 已经可以继续执行运行期初始化逻辑，例如启动服务或建立外部连接。

## 工作原理

在构建阶段，Egg 会以 `snapshot: true` 运行。此时 Egg 会加载应用元数据，但在
`configWillLoad` **之后停止**，因此 `configDidLoad`、`didLoad`、`willReady`、`didReady`
和 `serverDidReady` 等钩子都会延后到恢复阶段执行。在序列化堆之前，Egg 会运行
`snapshotWillSerialize` 钩子，释放不可序列化的资源（timer、socket、原生句柄、logger
流）。网络栈（`node:http`、`node:https`、TLS/DNS、HTTP client）会保持 **external 且
惰性加载**，因此它们不可序列化的原生绑定不会被写进 blob，而是在恢复后首次使用时重建。

恢复阶段，V8 先反序列化堆，随后快照主函数运行 `snapshotDidDeserialize` 钩子重建这些
运行期资源，跑完延后的生命周期直到 `didReady`，然后开始监听。

## 快照生命周期钩子

如果你的 `app.js` 或 `agent.js` Boot 类管理了不能直接写入 V8 快照的资源，可以实现下面
两个钩子：

```js
class AppBootHook {
  async snapshotWillSerialize() {
    // 在写入快照前关闭或解绑不可序列化资源
  }

  async snapshotDidDeserialize() {
    // 在恢复后重新创建这些资源
  }
}

module.exports = AppBootHook;
```

- `snapshotWillSerialize()` 会在写入快照前执行。
- `snapshotDidDeserialize()` 会在进程从快照启动后执行。

这两个钩子适合处理 timer、socket、process listener、logger 等需要在真实运行期重新建立
的资源。

## 性能

由于模块图已经加载、应用也已启动到 `configWillLoad`，恢复阶段只需要付出 `didReady` 与
连接/监听的成本。在 [cnpmcore](https://github.com/cnpm/cnpmcore) 上实测：

| 启动方式         | 恢复 → 监听          |
| ---------------- | -------------------- |
| 普通 bundle 启动 | ~942 ms              |
| 快照恢复         | ~233 ms（快约 4 倍） |

模块图越大（插件、tegg 模块、Router 越多），收益越明显——这正是快照在构建期提前承担的
开销。

## 已知限制

- **恢复需要 Node.js >= 24**（见上文）。
- **仅单进程**：快照以单个自包含进程运行（`mode: 'single'`），与 bundle 一致，不支持
  cluster 模式。
- **原生 addon 为 external**，必须在部署目标上存在。
- **第三方依赖受限**：任何在模块求值阶段就打开活跃资源或捕获不可序列化状态的依赖
  （打开的 socket、原生 HTTP/2 绑定、后台 timer、文件句柄）都必须要么保持 external
  （`--force-external`），要么实现快照生命周期钩子，在序列化前释放、在恢复后重建。并不是
  每个包都开箱即可被快照化。

支持范围仍在演进中；完整的已知限制与设计取舍记录在项目的 V8 快照 RFC 中。
