---
title: PR 预览包
description: 在 npm 正式发布前，安装和测试 Egg Pull Request 中的改动。
---

# PR 预览包

预览包可以让你在 npm 正式发布前，测试 Egg Pull Request 中的修复或新功能。
使用应用当前的包管理器，通过 `pkg.pr.new` URL 即可安装。

## 获取预览包

1. 打开包含待测试改动的 Pull Request。
2. 如果还没有预览包，请维护者添加 `pkg.pr.new` 标签。
3. 等待 `Publish PR Preview` 执行成功，然后在 `pkg.pr.new` 机器人的评论中找到包的安装 URL。

保留标签期间，新提交会再次发布预览包。
在应用目录中执行安装命令，无需安装发布用的 CLI。

## 安装依赖

使用应用当前的包管理器，并将下面的 `<ref>` 替换为已发布预览包的 PR 编号或 commit SHA。

使用 npm：

```bash
npm install "https://pkg.pr.new/eggjs/egg/egg@<ref>"
npm install --save-dev "https://pkg.pr.new/eggjs/egg/@eggjs/mock@<ref>"
```

使用 pnpm：

```bash
pnpm add "https://pkg.pr.new/eggjs/egg/egg@<ref>"
pnpm add --save-dev "https://pkg.pr.new/eggjs/egg/@eggjs/mock@<ref>"
```

按需安装包，运行时依赖放在 `dependencies`，测试工具放在 `devDependencies`。
包名和导入方式保持不变，依赖声明会改为预览 URL。
安装后运行应用的测试。

## 选择 PR 或提交

- PR 编号 URL 指向该 PR 最近一次成功发布的预览包。
- commit SHA URL 指向指定的已发布提交。需要复现测试时，可从工作流的 `Publish previews` 日志复制该 URL。

锁文件可能保留 PR 编号 URL 之前解析到的包。测试新提交时，请安装对应的 SHA URL 并更新锁文件。
共享测试环境时，应同时保留依赖声明和锁文件。
在 Pull Request 中反馈测试结果时，请附上 commit SHA。

预览包保留源码中的版本号，因此应通过 URL 和 commit SHA 确认实际测试的构建。
更多细节见 [pkg.pr.new URL 和版本选项](https://github.com/stackblitz-labs/pkg.pr.new#url-and-version-options)。

## 使用关联包

如需使用 `@eggjs/bin`、`@eggjs/tegg` 等其他包，请复制同一次发布中对应包的 URL。
已发布工作区包之间的运行时依赖会自动指向同一个提交的预览包。
应用中其他直接依赖的声明不会自动改变，需要使用预览版时应一并更新。

## 恢复常规版本

测试完成后，将依赖声明和锁文件中的相关记录恢复到安装预览包之前的状态。
执行应用常用的依赖安装命令，并检查两个文件中已移除本次添加的预览 URL。
