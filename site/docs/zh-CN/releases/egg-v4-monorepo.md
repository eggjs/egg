---
title: 'Monorepo 协作'
description: 'Egg 4 的研发体验与生态维护实践：Monorepo 协作'
---

# Monorepo 协作

Egg 的一次框架修复，往往会穿过多个包。Loader 改变加载规则，插件要验证目录约定，Mock 要能复现启动过程，开发工具还要把同一套规则交给应用。包分散在不同仓库时，贡献者除了修改代码，还要协调依赖版本、临时链接和发布顺序。Egg 4 的 Monorepo，把这些相互依赖的工作放进同一[工作区](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/pnpm-workspace.yaml#L1-L10)，让跨包修改可以作为一次完整变更接受检查。

应用开发者、插件作者和框架贡献者可以在这套工作区中联调源码、验证跨包改动，并在真实应用中试用修复。

## 跨包修改需要共同的验证现场

设想我们要修复一个只有特定插件启动后才会出现的加载问题。在多仓结构下，核心仓库中的回归测试通过，只能证明核心当前掌握的场景成立。要确认真实影响，仍需让插件使用尚未发布的核心，再让应用或测试工具消费这组临时版本。跨仓链接本身容易掩盖问题：本地恰好解析到的依赖，不一定就是另一位贡献者或 CI 使用的依赖。

Monorepo 将相关实现、测试夹具和文档放到同一个提交中。评审者可以同时看到接口变化及其调用方的适配，测试失败也有共同的源码位置可查。核心、插件、工具和 Tegg 共用工作区依赖，维护者可以一次修改相关包，并直接验证它们之间的协作。

这减少了协作中的版本拼装和中间发布成本。各包的接口与兼容性仍由测试保障。一个跨包修改能否合并，仍取决于接口是否清晰、调用方是否更新、回归测试是否覆盖实际行为。

## 目录统一之后仍保留包的职责

工作区有几条容易辨认的边界。packages 放置 egg、core、koa 等框架与基础库；plugins 放置插件及测试辅助包；tools 承载 CLI、脚手架和应用打包工具；tegg 按 core、plugin、standalone 继续分层。examples 提供真实用法，site 则保存文档站。贡献者先判断问题属于哪层，再沿依赖关系寻找受影响的调用方，比从仓库名称猜归属直接得多。

共享目录没有取消 npm 包边界。根包 @eggjs/monorepo 标记为 private，用户仍然安装 egg 或需要的 @eggjs 包，各包保留自己的 package.json、入口和发布产物。各包延续自己的版本线，由仓库脚本统一编排版本提升和发布。

应用升级时，按实际依赖选择包名。例如 packages/logger 已经提供 @eggjs/logger，但 egg、core 等包仍依赖 egg-logger。维护者可以在同一仓库推进新包，并保留调用方的过渡安排；应用开发者则应以实际依赖与发布说明为准，避免看到目录迁入就批量替换包名。下面是工作区的真实目录声明。

```typescript
packages:
  - packages/*
  - plugins/*
  - examples/*
  - tools/*
  - site
  - tegg/core/*
  - tegg/plugin/*
  - tegg/standalone/*
```

## 用 workspace 和 catalog 表达依赖关系

工作区内部依赖与共用外部依赖，解决的是两类问题。workspace:\* 让一个包明确使用同仓中的另一个包；catalog: 则把外部依赖版本集中到 pnpm-workspace.yaml 的 catalog 中。修改公共外部依赖时，维护者可以在集中声明处调整范围，再通过各消费包的测试确认兼容性，而不用在多个 manifest 中逐一同步同一版本。

[@eggjs/core](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/core/package.json) 的依赖就是一个实际例子：@eggjs/router、@eggjs/utils 等使用 workspace:\*，egg-logger、globby 等使用 catalog:。这一声明既保留了包之间的方向，也让跨包联调无需先向 npm 发布中间版本。需要注意，共用版本目录只统一声明来源，兼容性仍要靠测试验证；若公共升级影响广泛，评审和回归范围也会相应扩大。

这些协议是仓库内部的开发写法。发布脚本会把 workspace: 与 catalog: 解析为普通版本范围，并应用 publishConfig 中的发布入口，再调用 npm publish。完成后恢复源码 manifest。用户安装已发布包时不需要复制工作区协议，也不必为了消费 Egg 而搭建同样规模的工作区。以下片段节选自 core 的 package.json。

```typescript
"dependencies": {
  "@eggjs/router": "workspace:*",
  "@eggjs/utils": "workspace:*",
  "egg-logger": "catalog:",
  "globby": "catalog:"
}
```

## 源码联调与发布产物各有一套检查

core 的 package.json 中，开发态 exports 指向 src/index.ts，而 publishConfig.exports 指向 dist/index.js。这个区分让工作区测试直接连接源码，发布时仍交付构建后的 JavaScript。改完一个底层包后，相关消费者可以在同一工作区验证最新实现，不必反复构建并手动替换本地安装包。

库构建统一由根目录的 [tsdown workspace](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tsdown.config.ts) 配置承接。默认入口覆盖 `src/**/*.ts`，采用 unbundle，并将 @eggjs/\* 与 egg 外置；配置包和纯 Markdown 包会排除，个别工具还可覆盖默认规则。这样的构建组织保留包入口和依赖关系，统一的是构建约定，而不是把整个生态压成一个文件。

贡献者需要分别验证源码行为和发布产物。源码测试回答修改后的行为是否成立，构建与发布检查回答用户最终拿到的入口、类型和依赖是否完整。发布脚本逐包处理，遇到已发布版本会跳过，对失败包重试并再次确认结果。这有助于恢复部分发布失败，源码联调通过后，还需检查发布包。

## 贡献流程围绕受影响的包展开

开始贡献时，准备 Node.js 22.18.0 或更高版本。使用 utoo 的 ut 命令安装依赖和调度任务，工作区与共用依赖版本由 pnpm-workspace.yaml 和 catalog 定义。

日常修改宜先找到最小可复现场景，在目标包附近补充测试，再扩展到真正受影响的消费者。以 Redis 插件为例，其 README 给出了直接运行该插件测试文件的命令；涉及真实 Redis 的夹具还需要本地服务。仓库提供 MySQL 8 与 Redis 7 的[开发服务脚本](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/README.md)，但是否需要启动，应由本次测试范围决定。统一仓库使依赖容易获得，也让一次不加区分的全量测试可能启动比预期更多的工作。

测试之前不应先做一次全仓构建。测试使用源码，遗留 dist 可能使 Tegg 的文件发现同时加载源码和产物，引发重复元数据问题；根 pretest 会清理构建产物。先完成源码回归与类型检查，再验证构建产物，符合仓库现行流程。以下命令依次安装依赖、验证源码与类型，再检查发布构建。

```typescript
# 安装工作区依赖
corepack enable utoo
ut install --from pnpm

# 先验证源码与类型
ut run test
ut run typecheck
ut run lint

# 再验证发布构建
ut run build
```

## 应用也能参与跨包验证

应用开发者通常不需要克隆整个工作区。一个修复只有在自己的业务中才能确认时，可以使用 [PR 预览包](../releases/pr-preview-packages.md)：维护者为 PR 添加 pkg.pr.new 标签，工作流成功后，机器人评论会提供安装 URL。使用应用原来的包管理器即可，包名和导入方式保持不变，只把对应依赖暂时指向预览构建。

跨包测试尤其需要确认构建身份。应使用同一次发布提供的关联包 URL，并在反馈中带上 commit SHA。预览构建会把已发布工作区包之间的运行时依赖指向同一提交，但应用中其他直接依赖的声明不会自动改变。测试新的提交时，还应检查锁文件是否仍保留旧 PR URL 的解析结果。预览包有保留期限，适合短期验证；完成后恢复正常发布版本及锁文件。

这样，Monorepo 的协作范围从维护者延伸到真实应用：维护者在一个提交中修复关联包，使用者在业务上下文中验证同一构建，再把可复现结果反馈到原 PR。对框架而言，统一工作区最实际的价值，是让实现、使用和验证能够指向同一组代码。
