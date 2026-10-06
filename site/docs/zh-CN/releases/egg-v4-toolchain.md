---
title: '开发工具链'
description: 'Egg 4 的研发体验与生态维护实践：开发工具链'
---

# 开发工具链

Egg 4 的工具链变化，对应用作者最直接的影响是测试入口，对贡献者则贯穿依赖安装、库构建、测试和文档发布。把这些环节分清，升级时就能沿用业务结构，把注意力放在真正改变的命令、配置和生命周期上。

Egg 把 Vitest、[VitePress](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/site/.vitepress/config.mts)、rolldown-vite、tsdown 与 utoo 组合到同一工作区。它们各有职责：测试执行、文档站构建、底层构建依赖、库产物生成和依赖管理。应用交付还提供基于 @utoo/pack 的 Egg Bundler。理解这张分工图，比直接把所有工具配置搬进应用更有用。

## Vite 生态进入日常开发的哪些环节

测试是变化最明显的一环。Egg 自身和多个基础包先逐步迁移到 Vitest，后来 @eggjs/bin v8 的 test 与 cov 也切换到 Vitest 和 V8 coverage。共用依赖目录中的 Vitest、覆盖率和 UI 包均采用 ^5.0.1，应用 CLI 的现行集成也要求 Vitest 5。升级工具包时，应把测试运行器作为一组兼容依赖检查。

文档站从 Dumi 迁到 VitePress，当前版本为 2.0.0-alpha.15。它承接中英双语、本地搜索和文档页面构建；LLM 文本输出与 Markdown 复制下载让同一份技术内容也能用于编辑器和 AI 辅助开发。对于贡献者，文档和代码可以在同一变更中评审，减少文档版本与实现脱节的机会。

工作区还通过 overrides 把 vite 替换为 rolldown-vite。这个入口位于仓库开发依赖层，服务于使用 Vite 的工具。Egg 应用仍由 Egg 的启动、加载和请求处理机制运行，因此应用作者无需为了升级框架而额外搭一个 Vite 开发服务器。

## 库构建与应用打包各自解决什么问题

框架仓库的库构建由 [tsdown workspace](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tsdown.config.ts) 模式统一执行。根配置遍历核心包、插件、工具及 tegg 的多个工作区，默认入口是 `src/**/*.ts`，并同时设置 unbundle 和 external。这样生成的仍是便于按模块消费的包产物，egg 与 @eggjs/\* 等依赖保持外置；配置包和纯 Markdown 包被排除，create-egg 则有自己的 bundle 覆盖配置。贡献者修改跨包类型或导出后，可以从根目录统一构建并检查发布结构。

应用侧的 Egg Bundler 处理另一件事：把约定式加载的应用整理成可部署产物，其 PackRunner 调用 @utoo/pack 的 build 实现。它与安装依赖的 utoo 共享品牌，但属于不同包、不同执行阶段。前者面对应用模块和部署入口，后者面对依赖树与工作区命令。决定采用 bundle 部署时，应单独验证应用插件和动态加载行为，而不必把更换包管理器设为前提。

统一构建还改变了排查问题的顺序。仓库开发时可以通过源码导出引用相邻工作区，发布时则消费 dist 下的 JavaScript 和声明文件。如果某个改动在仓库测试中通过、安装后却失败，应同时检查入口是否被构建、子路径是否出现在发布导出中，以及外部依赖是否完整声明。根配置中的 publint 正是在这一层帮助发现包结构问题，单纯补一个运行测试往往覆盖不到。

## 贡献者如何使用新的工作区命令

仓库主 CI 已采用 [utoo 的 ut 命令](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/README.md#L45-L64)安装和执行任务。现有 pnpm-workspace.yaml 继续定义工作区与 catalog，内部包通过 workspace:\* 关联；根 packageManager 字段也仍保留 pnpm 版本信息。准备好 utoo 后，可执行以下命令：

```bash
ut install --from pnpm
ut run test
ut run typecheck
ut run build
```

这些命令对应独立的检查目标。test 验证运行行为，typecheck 负责类型，build 验证发布产物。源码测试无需先构建；遗留 dist 可能造成重复扫描，根 pretest 会先清理产物，因此把构建放在检查之后更省事。根 lint 使用 oxlint，格式化使用 oxfmt；分别执行可以更快定位失败层次。正式发布仍由脚本调用 npm publish，期间处理 workspace 与 catalog 版本，并应用 publishConfig；发布步骤与依赖安装独立执行。

普通 Egg 应用可以继续使用既有包管理器和 npm scripts。工具链演进带来的收益主要是降低整个仓库的重复安装与跨包验证成本，应用是否同步采用 utoo，可以依据团队环境另行决定。历史 PR 中的安装和测试耗时属于特定 CI 测量，评估自己的项目时仍应测量冷安装、缓存命中和完整流水线。

## 把现有应用测试迁到 Vitest

已有应用若继续使用 [egg-bin test](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md#L110-L185)，可以保留熟悉的命令入口，先升级匹配版本的 @eggjs/bin、@eggjs/mock 与 Vitest。CLI 自动查找 test/.setup.ts 或 .js，并在识别为 Egg 应用且能解析 @eggjs/mock 时注入 setup_vitest。这个 setup 等待 app.ready，在用例结束后恢复 mock，并结合 worker 模式处理应用清理。Tegg 项目还会接入相应 runner 和上下文 setup。

以下 package.json 片段适用于选择 egg-bin 测试入口的应用。测试文件则沿用TypeScript 模板的 HTTP 断言写法；其中响应文本对应模板自带的首页，迁入自己的项目时换成实际接口契约。

```typescript
"scripts": {
  "test": "egg-bin test",
  "cov": "egg-bin cov"
}
```

```typescript
import { app } from '@eggjs/mock/bootstrap';
import { test, expect } from 'vitest';

test('should GET / status 200', async () => {
  const res = await app.httpRequest().get('/').expect(200);
  expect(res.text).toBe('hi, egg, TypeScript');
});
```

先跑一个文件，再逐步扩大到全套用例，可以把启动失败和断言差异分开定位。grep、timeout、bail、changed 等常用选项仍有对应入口，watch 可用于开发时反复运行。覆盖率报告写入 coverage，支持摘要、JSON、LCOV 和 Cobertura 等格式；排除规则按应用根目录相对路径核对。

迁移中也可能遇到“测试导入的类和应用加载的类明明同名，却无法匹配”的问题。测试运行器和原生动态导入若创建了不同模块实例，会影响 Tegg 的对象查找。测试集成针对模块图身份做了适配；出现此类错误时，应先确认 runner、mock 与 CLI 的版本和入口一致，再检查自定义加载器，避免通过放宽业务断言掩盖问题。

```bash
npm test -- test/app/controller/home.test.ts
npm test -- --grep "GET /"
npm run cov
```

## 先选清测试入口再调整配置

新 TypeScript 模板直接以 vitest run 执行测试，并自带 [vitest.config.ts](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/create-egg/src/templates/simple-ts/vitest.config.ts) 和 test/setup.ts。它与 egg-bin test 是两条明确的入口：直接运行 Vitest 时，应用维护配置和 setup；使用 egg-bin 时，CLI 生成内联配置，并传入 config:false 关闭配置发现。已有 vitest.config.ts 不会因此自动被 egg-bin 合并。迁移前先查看 package.json 中真正执行的命令，再决定配置应放在哪里。

生命周期也应按入口确认。新测试推荐从 vitest 显式导入 beforeAll、afterAll 等 hook，便于类型检查和阅读。当前 @eggjs/mock/setup_vitest 对全局 before、after 提供兼容别名，所以通过自动 setup 运行的部分旧测试仍可工作；自行运行 Vitest 或使用自定义启动流程时，不应假设这层兼容必然存在。更要避免一边依赖自动 setup，一边重复注册 app.close，导致共享应用提前关闭。

测试并行度值得单独验证。egg-bin 默认采用 threads，isolate 默认 false；文件级并行只有 EGG_FILE_PARALLELISM=true 时才开启。共享数据库、端口、文件和全局 mock 的旧测试，适合先按默认设置确认正确性，再有控制地提高并行度。需要 forks 时可以使用 --pool forks。框架仓库自己的 Vitest 项目配置与这些应用默认值应分别阅读。

状态恢复是另一个常见边界。测试结束后的 mock 恢复并不等于清空业务数据库，也不会自动删除测试自己创建的临时文件。跨文件共享状态、后台任务尚未完成、端口未释放，都可能只在整套测试或线程模式中暴露。迁移时保留清晰的资源所有权，按用例准备数据，并在相应 hook 中完成回收，通常比先增加重试次数更容易找到原因。

## 迁移结束前检查自动化脚本

[Mocha 与 c8 的旧参数](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md#L242-L273)需要逐项清理，特别是 --parallel、--jobs、--auto-agent、--prerequire 和 --c8。依赖 MOCHA_FILE 或从日志中寻找 “N passing” 的 CI 脚本也应改造。当前 TEST_REPORTER=json 的报告位于应用目录 .vitest/json/output.json；监控和上传步骤最好读结构化结果，并同时保留进程退出码检查。

覆盖率迁移也应重新核对报告范围。编译产物与源码同时存在时，确认统计对象与发布代码的关系；把测试夹具、生成文件和真正需要验证的业务分支区分开。历史覆盖率数字可能因运行器和排除规则变化而变动，宜先固定统计口径，再比较趋势，避免把报告格式变化直接当成质量提升或退步。

建议把验收分成四步：确认 Node.js 达到 22.18.0；让一个真实接口测试和应用启动成功；再跑全量测试与覆盖率；最后演练 CI 的失败分支，确保失败能阻止发布。对于框架贡献者，再补上工作区类型检查和构建。这样处理，工具升级的风险就落到可观察的测试契约，而不是一次性修改所有开发习惯。
