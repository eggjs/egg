[English](./README.md) | 简体中文

<div style="text-align:center">
	<img src="site/public/assets/egg-banner.png" />
</div>

[![NPM version](https://img.shields.io/npm/v/egg.svg?style=flat-square)](https://npmjs.org/package/egg)
[![NPM quality](http://npm.packagequality.com/shield/egg.svg?style=flat-square)](http://packagequality.com/#?package=egg)
[![NPM download](https://img.shields.io/npm/dm/egg.svg?style=flat-square)](https://npmjs.org/package/egg)
[![Node.js Version](https://img.shields.io/node/v/egg.svg?style=flat)](https://nodejs.org/en/download/)

[![Continuous Integration](https://github.com/eggjs/egg/actions/workflows/ci.yml/badge.svg)](https://github.com/eggjs/egg/actions?query=branch%3Amaster)
[![Test coverage](https://img.shields.io/codecov/c/github/eggjs/egg.svg?style=flat-square)](https://codecov.io/gh/eggjs/egg)
[![Known Vulnerabilities](https://snyk.io/test/npm/egg/badge.svg?style=flat-square)](https://snyk.io/test/npm/egg)
[![Open Collective backers and sponsors](https://img.shields.io/opencollective/all/eggjs?style=flat-square)](https://opencollective.com/eggjs)

## 特性

- 内置多进程管理
- 高度可扩展的插件机制
- 深度框架定制
- 丰富的[插件](https://github.com/search?q=topic%3Aegg-plugin&type=Repositories)

> 支持 Node.js >= 20.19.0 及以上版本，[默认支持 `require(esm)`](https://nodejs.org/en/blog/release/v20.19.0)。

## 快速开始

```bash
mkdir showcase && cd showcase
pnpm create egg@beta
pnpm install
pnpm run dev

open http://localhost:7001
```

## Monorepo 结构

本项目使用 pnpm monorepo 结构，包含以下包：

- `packages/egg` - Eggjs 主框架
- `examples/helloworld-commonjs` - CommonJS 示例应用
- `examples/helloworld-typescript` - TypeScript 示例应用
- `site` - 文档网站

该 monorepo 使用 **pnpm catalog mode** 进行集中式依赖管理，确保所有包之间的版本一致性。

### 开发命令

```bash
# 安装所有包的依赖
pnpm install

# 构建所有包
pnpm run build

# 测试所有包
pnpm run test

# 运行特定包的命令
pnpm --filter=egg run test
pnpm --filter=@examples/helloworld-typescript run dev
pnpm --filter=site run dev
```

### 版本管理

本 monorepo 使用 [changesets](https://github.com/changesets/changesets) 进行版本管理和发布。这带来了以下好处：

- **选择性发布**：只对变更的包进行版本升级和发布
- **自动生成变更日志**：从 changeset 摘要自动生成
- **更好的追踪**：清晰记录变更内容和原因

为你的更改添加 changeset：

```bash
pnpm changeset
```

详细信息请查看我们的 [Changeset 使用指南](docs/changeset-guide.zh-CN.md)。

## 文档

- [官方文档](https://eggjs.org/zh-CN/)
- [插件列表](https://github.com/search?q=topic%3Aegg-plugin&type=Repositories)
- [框架列表](https://github.com/search?q=topic%3Aegg-framework&type=Repositories)
- [官方示例](https://github.com/eggjs/examples)

## 贡献者

[![contributors](https://contrib.rocks/image?repo=eggjs/egg&max=240&columns=26)](https://github.com/eggjs/egg/graphs/contributors)

## 贡献代码

请告知我们可以为你做些什么，不过在此之前，请检查一下是否有[已经存在的Bug或者意见](https://github.com/eggjs/egg/issues)。

如果你是一个代码贡献者，请参考[代码贡献规范](CONTRIBUTING.md)。

## 项目赞助

[![sponsors](https://opencollective.com/eggjs/tiers/sponsors.svg?avatarHeight=48)](https://opencollective.com/eggjs#support)
[![backers](https://opencollective.com/eggjs/tiers/backers.svg?avatarHeight=48)](https://opencollective.com/eggjs#support)

## 开源协议

[MIT](LICENSE)
