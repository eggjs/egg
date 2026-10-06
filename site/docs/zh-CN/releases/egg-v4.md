---
title: 'Egg 4 发布说明'
description: 'Egg 4 的研发体验与生态维护实践：Egg 4 发布说明'
---

# Egg 4 发布说明

Egg 4 把升级重点放在日常开发体验上。我们持续跟进社区工具，让 TypeScript 配置与模块加载更顺手，将测试接入 Vitest，并为需要更快冷启动的应用提供 bundle 和 V8 启动快照。开发者可以从自己最常遇到的问题开始，逐步采用这些变化。

## 更自然的 TypeScript 与 ESM 体验

写配置、声明插件和组织模块，是每个 Egg 应用都会遇到的工作。Egg 4 延续 TypeScript 重构，补齐类型入口与 ESM、CommonJS 加载支持，让编辑器能更早发现配置错误，也让应用更容易使用现代 Node.js 生态中的模块。

例如，配置可以通过 [defineConfig](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/lib/define.ts) 获得类型检查，而不必为每份配置手动补充类型声明：

```typescript
import { defineConfig } from 'egg';

export default defineConfig({
  middleware: [],
});
```

需要使用应用信息时，可以改用配置工厂；插件也有对应的类型化声明入口。这些改进服务于现有开发流程，模块后缀、编译目录和第三方依赖仍需在升级时一起检查。

## 把测试接上现代工具链

测试迁移到 Vitest 后，TypeScript 用例、watch 模式和覆盖率可以通过同一套工具运行。应用继续使用 [egg-bin](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md) 的 test 与 cov 入口；需要边改边验证时，可以运行 egg-bin test --watch。安装 @eggjs/mock 的应用还会自动接入测试生命周期处理。

工具链的更新也让后续优化更容易落地。[PR #5541](https://github.com/eggjs/egg/pull/5541) 在已采用 Vitest 的基础上切换到 rolldown-vite，记录的总耗时从 38.98 秒降到 28.56 秒，减少约 26.7%。这项收益来自已采用 Vitest 后的底层构建优化。

框架仓库同时使用 utoo 管理工作区安装和命令执行，并更新构建与检查工具。应用侧可以继续使用自己的包管理器；迁移测试时，应重点调整 hooks、旧并行参数和依赖报告格式的脚本。

## 让应用更快进入可服务状态

对于频繁冷启动的服务，模块加载和初始化会直接影响等待时间。Egg 4 提供可选的 bundle 与 V8 启动快照：先在构建期整理模块和资源，再把应用的一部分初始化状态保存下来，恢复时继续完成运行期工作。

[PR #6042](https://github.com/eggjs/egg/pull/6042) 给出了 cnpmcore 的实测结果：同一份 JavaScript bundle 在单进程模式下启用快照后，启动耗时中位数从 947 ms 降到 379 ms，减少约 60%。 这为评估冷启动优化提供了具体参照，实际收益需要在自己的应用中复测。

快照需要显式采用，恢复要求 Node.js 24 或以上。连接、计时器等运行期资源也需要按快照生命周期处理；动态加载、原生模块和外部资源的适配方式见 [启动快照指南](../advanced/snapshot.md)。

## cnpmcore 的实际升级

cnpmcore 的迁移提供了一个应用侧参照。[PR #747](https://github.com/cnpm/cnpmcore/pull/747) 将 Egg 依赖从 ^3.29.0 升到 ^4.0.8，并同步调整 Redis、Mock 和开发工具的包入口。后续 [PR #855](https://github.com/cnpm/cnpmcore/pull/855) 跟进整合后的 Egg 4：Controller、Inject 等改从 egg 导入，ORM 能力改从 egg/orm 导入，同时删去应用直接声明的多项 Tegg 依赖和插件启用配置，减少应用侧的组装工作。

测试迁移也包含具体的业务适配。[PR #979](https://github.com/cnpm/cnpmcore/pull/979) 接入 Vitest 时，按 worker 隔离数据库、Redis 和数据目录，避免并行用例共用状态。结合前面的启动快照验证，可以看到一条逐步推进的路径：先完成依赖与入口迁移，再整理测试隔离，最后按部署需求验证启动优化。

## 让 Egg 生态更容易共同维护

过去，一次核心接口调整可能需要在多个仓库同步依赖、发布中间版本，再逐个验证插件。合入 Monorepo 后，核心、插件与 Tegg 可以通过工作区依赖直接联调，跨包改动也能在同一个 PR 中修改、测试和审查，减少反复协调的成本。

Tegg 的模块、依赖注入和生命周期能力也随之一起维护，为规模较大的应用提供更清楚的业务边界。各包仍有独立职责，业务项目无需跟着改成 Monorepo，可以按需要使用这些能力。

## 从一个项目开始

运行环境要求 Node.js 22.18.0 或以上。想先体验开发流程，可以按 [快速入门](../intro/quickstart.md) 使用 beta 脚手架创建示例：

```bash
npx create-egg@beta --template tegg hackernews-tegg
cd hackernews-tegg
npm install
npm run dev
```

已有应用建议先确认 Egg、插件与测试工具版本，跑通普通启动和测试，再尝试 bundle 或快照。第一轮重点检查 generator 旧代码、插件入口、ESM 与 CommonJS 混用，以及 Mocha hooks 和参数的迁移；测试工具的具体调整可查阅 [egg-bin 迁移说明](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md#breaking-changes-v8)。

## 继续深入

可按下面的问题选择阅读六篇深入文章。

- [Monorepo 协作](./egg-v4-monorepo.md)：核心、插件和 Tegg 如何联调，workspace 与 catalog 怎样减少跨包维护成本。

- [开发工具链](./egg-v4-toolchain.md)：Vitest 迁移、测试生命周期与并行边界，以及 utoo 工作区命令的用法。

- [插件升级](./egg-v4-plugins.md)：内置与可选插件如何配置，类型化工厂、安全行为和快照适配怎样检查。

- [TypeScript 与 ESM](./egg-v4-typescript-esm.md)：类型化配置、模块格式、开发期转译与生产构建目录如何配合。

- [Tegg 模块化](./egg-v4-tegg.md)：模块边界、依赖注入和生命周期的实际用法，以及 HTTP、MCP 与 Worker 的使用条件。

- [Bundle 与启动快照](./egg-v4-bundle-snapshot.md)：构建与恢复命令、cluster 部署、冷启动测试口径和回退验证。

感谢参与代码、文档、插件维护和测试反馈的贡献者。欢迎带着真实项目的问题与结果参与 Egg 的后续改进。
