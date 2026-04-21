---
title: V8 启动快照
order: 8
---

# V8 启动快照

Egg 内置了 V8 startup snapshot 的构建与恢复能力。对于需要在启动前预加载框架元数据、插件、Service、Router 和 tegg 模块的应用，这可以减少冷启动阶段的开销。

## 对外 API

Egg 从 `egg` 导出两个公开方法：

```ts
import { buildSnapshot, restoreSnapshot } from 'egg';
```

- `buildSnapshot()` 会以快照模式启动 Egg，加载元数据，触发非可序列化资源的清理钩子，并把应用对象写入 V8 快照负载。
- `restoreSnapshot()` 会从快照中恢复应用，重建运行期资源，并继续执行剩余的 Egg 生命周期。

## 构建快照

先创建一个构建入口文件：

```ts
import { buildSnapshot } from 'egg';

await buildSnapshot({
  baseDir: import.meta.dirname,
});
```

然后使用 Node.js 生成快照 blob：

```bash
node --snapshot-blob=snapshot.blob --build-snapshot snapshot-entry.mjs
```

在构建阶段，Egg 会以 `snapshot: true` 运行。此时 Egg 会加载应用元数据，但在 `configWillLoad` 之后停止，因此 `configDidLoad`、`didLoad`、`willReady`、`didReady` 和 `serverDidReady` 等钩子都会延后到恢复阶段执行。

## 恢复快照

从生成的 blob 启动进程后，调用恢复方法：

```ts
import { restoreSnapshot } from 'egg';

const app = await restoreSnapshot();
await app.listen(7001);
```

`restoreSnapshot()` 会从 `configDidLoad` 继续执行正常启动流程直到 `didReady`，因此返回的 `app` 已经可以继续执行运行期初始化逻辑，例如启动服务或建立外部连接。

## 快照生命周期钩子

如果你的 `app.js` 或 `agent.js` Boot 类管理了不能直接写入 V8 快照的资源，可以实现下面两个钩子：

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

这两个钩子适合处理 timer、socket、process listener、logger 等需要在真实运行期重新建立的资源。
