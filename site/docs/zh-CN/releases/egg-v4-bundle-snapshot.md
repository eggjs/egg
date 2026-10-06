---
title: 'Bundle 与启动快照'
description: 'Egg 4 的研发体验与生态维护实践：Bundle 与启动快照'
---

# Bundle 与启动快照

一个依赖众多、插件丰富的 Egg 应用，冷启动要完成文件发现、模块解析、JavaScript 编译与求值，再进入运行期初始化。扩大实例数或频繁拉起短生命周期进程时，这些固定成本会反复出现。Egg 4 的启动优化沿着这条执行链逐层推进：Manifest 复用发现结果，compile cache 复用编译结果，Bundle 提前组织可部署的模块图，V8 snapshot 则保存一段已经执行过的启动状态。

Bundle 与 snapshot 需要显式启用。可以先验证普通 bundle 的部署行为，再测量快照在自己应用中的冷启动收益。

## 四层优化对应四类启动成本

Manifest 缓存框架已经发现的文件、模块解析结果和 Tegg 元数据，默认文件为 .egg/manifest.json。下一次启动可以用已知列表替代重复的文件系统查询和 glob 扫描。加载前，框架检查版本、serverEnv、serverScope、TypeScript 状态、lockfile fingerprint 与配置目录 fingerprint；缓存缺失、损坏或失效时，回到正常发现流程。这些指纹不包含任意业务源码的完整内容哈希。

local 环境默认跳过 Manifest，需要 EGG_MANIFEST=true 才启用；非 local 环境在未命中有效 Manifest 时，会在 ready 后异步生成。构建工具还可通过 metadataOnly 模式收集清单：此时运行 loadMetadata()，跳过 agent 与正常启动生命周期，生成完成后退出，beforeClose 也不会运行。因此，专门用于清单生成的入口不应依赖正常启动或关闭 hook 来完成额外工作。

缓存的发布策略需要与构建流程配合。如果生成清单后又修改模块布局，或构建与运行环境使用不同配置，应重新生成并验证。缓存未命中时，先核对环境和指纹；遗漏文件时，对照清单与普通扫描结果定位。保留正常发现作为回退，有利于逐步投入使用。

Node compile cache 处理另一类成本。Egg 将它接入普通启动入口，默认落在 .egg/compile-cache，并尊重已有 NODE_COMPILE_CACHE 或 NODE_DISABLE_COMPILE_CACHE 设置。它让可复用的编译结果留在磁盘，ready 与 close 时刷新缓存。模块求值和应用初始化仍然要执行，snapshot 构建则跳过这一 enable 路径。

Bundle 再往前一步，把文件发现与模块组织移到构建期，运行时从内联模块映射加载。Snapshot 建立在 bundle 之上，把模块预加载后、生命周期运行到 configWillLoad 的堆状态写入 blob。四层之间可以配合，但部署时应分别记录启用情况，否则很难知道收益来自哪一步，也很难定位失效原因。

## Bundle 固化模块发现并保留资源边界

[@eggjs/egg-bundler](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bundler/README.md) 使用 @utoo/pack 构建部署产物。默认单进程入口为 CommonJS 的 worker.js，除 external 外的依赖默认内联为单文件，输出 package.json 标明 type 为 commonjs。运行时先安装 bundle 模块映射，再启动应用。应用整体采用 ESM 与部署入口输出 CJS 可以同时成立，构建产物的格式由部署工具决定。

最小普通部署流程如下。它适合先验证打包是否保留了应用行为，再进入快照实验。框架通过 Manifest 完成文件发现，并不限制业务代码使用 fs；模板、静态资源和自定义动态路径仍然要在产物中存在。[bundle-manifest.json](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bundler/docs/output-structure.md) 记录构建结果，主要用于检查和调试，实际运行依赖的是安装到入口中的模块映射。

```bash
egg-bin bundle
cd dist-bundle
node worker.js
```

默认资源扫描从 app 开始，app/public、app/assets 和 app/static 会强制复制，包含其中的前端 JavaScript。复制后的资源保留相对路径，运行时 baseDir 指向输出目录，因此按 baseDir 拼接的资源读取可以继续工作。若文件放在其他目录，应通过 module.yml 中的 bundle.runtimeAssets 配置 roots 或 forceCopyDirs；显式填写这些列表会替换对应默认值。

```yaml
bundle:
  runtimeAssets:
    roots:
      - app
      - templates
    forceCopyDirs:
      - app/public
      - app/assets
      - app/static
```

原生 addon、显式 external，以及部分自动识别的 peer、optional 或原生依赖仍要能在部署环境被解析。动态 require 和运行时拼接出来的路径，也需要单独验证。实践中应检查真实产物并在精简部署目录中启动，而不要仅凭“单文件”判断已经不需要任何 node_modules。

## 快照停在运行资源初始化之前

V8 启动快照保存的是进程堆中的状态。对于 Egg，安全的暂停点选在 configWillLoad 完成后。configDidLoad、didLoad、willReady、didReady 和 serverDidReady 等阶段延后执行，数据库连接、socket、watcher 和后台 timer 等运行资源也应放在恢复后的适当阶段创建。这样构建得到的是可恢复的启动状态，而不是把开发机上的活跃连接带到服务器。

这一点对 Tegg 尤其重要。Tegg 插件在 configDidLoad 中创建 ModuleHandler，随后在 didLoad 中初始化依赖图与实例。快照中尚未创建完整的 DI 实例堆。Bundle 模块的预加载和早期框架状态得以复用，业务对象装配仍会在恢复后的生命周期继续。

如果框架或插件在更早阶段持有不可序列化资源，可以实现 snapshotWillSerialize 与 snapshotDidDeserialize。序列化前 hook 按注册逆序执行，恢复后按正序执行，便于先拆除后建立相应依赖。清理与重建应对称，关闭阶段也应能处理真实资源。对普通业务代码而言，把外部连接推迟到正常运行期，通常比添加复杂快照 hook 更容易维护。

网络相关内置模块以及 undici、urllib 默认保持 external 并延迟加载，避免在构建阶段拉起不可序列化的原生绑定。若其他模块在 import 时就初始化原生状态，可先定位具体依赖，再使用 force-external、egg.snapshot.lazyModules 或生命周期 hook 处理。单纯把错误模块外置，也仍需验证它是否真正推迟到了恢复后才求值。

## 分别构建单进程与 Cluster 产物

Egg Bundler 与快照能力处于预发布阶段，部署前需验证插件和依赖的兼容性。

Egg 的基础运行环境最低为 Node.js 22.18.0，快照恢复要求 Node.js 24 或以上。Node 22 恢复非平凡 Egg 堆可能发生原生 fatal 错误，启动器会提前拒绝。构建和恢复都应使用 Node 24 或更高版本，并保持构建与部署的运行时一致。

单进程构建使用 [egg-bin snapshot build](../advanced/snapshot.md)，默认输出 dist-bundle/worker.js 与 snapshot.blob；生产恢复由 egg-scripts start --snapshot-blob 负责，没有 snapshot start 子命令。恢复入口继续生命周期至 didReady，然后启动监听。下方第一组命令使用端口 7001。

```bash
egg-bin snapshot build
egg-scripts start \
  --snapshot-blob ./dist-bundle/snapshot.blob \
  --port 7001
```

Cluster 则按 app 与 agent 分别生成 worker 和 blob，每个角色拥有独立堆。第二组命令会生成 app_worker.js、agent_worker.js 及各自的快照，再由 --bundle 路径启动。也可以只提供一个角色的 blob，另一个角色从普通 bundle JavaScript 启动。含 blob 的 worker 必须使用 process 模式；没有 blob 的普通 cluster bundle 才同时支持 worker_threads。

```bash
egg-bin snapshot build --cluster
egg-scripts start --bundle \
  --app-snapshot-blob ./dist-bundle/app.snapshot.blob \
  --agent-snapshot-blob ./dist-bundle/agent.snapshot.blob
```

Snapshot 启动与 cluster bundle 启动不支持 options.require，启动器会在创建 worker 前报错。若现有发布脚本通过该入口加载监控或引导模块，需要在试点前核对替代接入方式，不能假定原来的启动参数会被照常执行。

## cnpmcore 的冷启动实测

[cnpmcore 4.32.1](../advanced/snapshot.md) 的冷启动实验使用 Node.js 24.18.1、Apple M1 Pro、prod 环境，对比同一份生成 JavaScript 的普通 bundle 启动与 snapshot restore。每种模式预热一次，然后交错测量十次，报告中位数。这样的比较尽量把代码与构建差异排除在外，测的是快照恢复这一步的影响。

单进程中位数由 947 ms 降至 379 ms，耗时减少 60.0%；process 模式下的一个 agent 加两个 app worker，启动中位数由 1356 ms 降至 591 ms，减少 56.4%。这里有两个不同的计时范围：单进程从直接 spawn Node 到开始监听；Cluster 从 master 内部编排到 ready，排除了 launcher 和 master 引导开销。两行数字不宜用来直接比较两种进程模型的完整启动成本。

这些结果表明，在该应用和硬件条件下，预执行的启动工作占比可观。这组数据衡量同一应用启用快照前后的冷启动耗时，比较范围不含框架版本升级和请求吞吐。应用若把大部分启动时间花在外部服务连接、远程配置或恢复后的对象装配，最终收益会不同。自己的实验应保留相同代码、环境和计时边界，同时观察启动失败率、内存及首个真实请求。

## 把依赖兼容和回退纳入发布验证

最容易遗漏的是[模块顶层副作用](../advanced/snapshot-troubleshooting.md)。打开 socket、读取环境后创建长寿命对象、注册后台 timer，或持有文件和原生句柄，都可能破坏构建或恢复。第三方包同样需要检查。当前 Leoric 有针对性的快照兼容处理，但其他 ORM 或 SDK 是否兼容，仍取决于它们的求值行为和驱动加载方式。

Web 全局对象还有一个具体陷阱。构建期的 fetch、Request、Response 等可能被替换为桩，恢复时再重新安装。在函数实际执行时读取 globalThis.fetch 可以使用恢复后的实现；模块顶层 const f = fetch，或 class X extends globalThis.Request，则可能把构建期绑定固化进 blob。遇到这类代码，要调整绑定时机，不能只确认名称在运行时存在。

建议按普通启动、普通 bundle、snapshot 三步逐级验证。先确认全部业务路由、定时任务、静态资源与关闭逻辑在 bundle 中正常，再检查快照构建和恢复，最后做真实部署环境的重复冷启动测量。发布物应记录代码版本、Node 版本、external 依赖和资源清单，并保留普通 bundle 启动方式用于回退。

回退演练也应包含外部依赖。可把发布目录复制到与生产相同的环境，移除开发工作区的隐式路径，再分别启动普通 bundle 与快照。开发机成功还不足以证明资源、动态依赖和环境配置已完整交付。多进程应用还应验证 agent 通信、worker 退出与重新拉起。

对于扩展作者，测试矩阵还应覆盖 metadataOnly、普通启动和 snapshot 恢复的生命周期差异。清单生成不运行正常 boot hook，快照构建运行到 configWillLoad，而恢复才进入后续初始化。将每项资源的创建与释放对应到明确阶段，才能让插件在这些模式下保持一致行为。
