# Egg.js Monorepo Changeset 使用指南

本文档说明如何使用 changesets 管理 Egg.js monorepo 的版本和发布包。

## 什么是 Changesets？

Changesets 是为多包仓库（monorepos）设计的版本管理和变更日志工具。它能够：

- 跟踪哪些包需要发布
- 独立管理包版本而非批量发布
- 自动生成变更日志
- 只发布有变更的包

## 基本工作流程

### 1. 进行代码变更

当你对 monorepo 中的包进行需要发布的更改时：

```bash
# 创建一个 changeset 描述你的更改
pnpm changeset
```

这将会：

1. 提示你选择哪些包发生了变更
2. 询问每个包的版本升级类型（major、minor 或 patch）
3. 提示你编写变更摘要
4. 在 `.changeset/` 目录中创建一个包含你的 changeset 信息的 markdown 文件

### 2. Changeset 类型

创建 changeset 时，需要指定版本升级类型：

- **major**: 破坏性变更（例如 `1.0.0` → `2.0.0`）
- **minor**: 新功能，向后兼容（例如 `1.0.0` → `1.1.0`）
- **patch**: Bug 修复，向后兼容（例如 `1.0.0` → `1.0.1`）

### 3. 提交 Changesets

将生成的 changeset 文件与代码更改一起提交：

```bash
git add .changeset/
git commit -m "feat: 添加新功能"
```

### 4. 自动发布流程

一旦你的 PR 合并到 `next` 分支：

1. GitHub Actions 工作流会自动运行
2. 如果存在 changesets，它会创建一个 "Version Packages" PR
3. Version Packages PR 会：
   - 根据 changesets 更新包版本
   - 更新 CHANGELOG.md 文件
   - 删除已处理的 changesets
4. 当你合并 Version Packages PR 时，包会自动发布到 npm

## 手动命令

### 创建 Changeset

```bash
pnpm changeset
```

### 版本升级（本地测试）

```bash
# 这会更新 package.json 版本和 CHANGELOGs
pnpm run changeset:version
```

### 发布包（手动）

```bash
# 构建并发布变更的包
pnpm run changeset:publish
```

## 高级用法

### 快照版本

用于测试目的，可以创建快照版本：

```bash
pnpm changeset version --snapshot
pnpm changeset publish --tag snapshot
```

### 预发布版本

创建预发布版本：

```bash
# 进入预发布模式
pnpm changeset pre enter beta

# 像往常一样创建 changesets
pnpm changeset

# 版本升级和发布
pnpm run changeset:version
pnpm run changeset:publish

# 退出预发布模式
pnpm changeset pre exit
```

## 配置

changeset 配置在 `.changeset/config.json` 中：

```json
{
  "baseBranch": "next",
  "access": "public",
  "ignore": ["helloworld-*", "site"]
}
```

- `baseBranch`: 发布的主分支（设为 `next`）
- `access`: 包发布访问级别（设为 `public`）
- `ignore`: 永不发布的包

## 最佳实践

1. **在 PR 中创建 changesets**：当进行需要发布的更改时，始终创建 changeset
2. **编写清晰的摘要**：changeset 摘要会成为变更日志的一部分
3. **选择正确的升级类型**：遵循语义化版本原则
4. **审查 Version PR**：合并前检查 Version Packages PR 以确保版本正确
5. **一个功能一个 changeset**：为不同的功能或修复创建单独的 changesets

## 与旧版本脚本的对比

### 旧方法 (scripts/version.js)

- 一次性升级**所有**包的版本
- 需要手动执行
- 没有自动变更日志生成
- 全部发布或全部不发布

### 新方法 (Changesets)

- 只升级**变更的**包版本
- 自动创建 PR
- 自动生成变更日志
- 选择性发布包
- 更好地跟踪变更内容和原因

## 故障排除

### 未检测到 changeset

如果你忘记创建 changeset：

```bash
pnpm changeset
```

### 版本升级类型错误

如果需要更改 changeset：

1. 删除 `.changeset/` 中的 changeset 文件
2. 用 `pnpm changeset` 创建新的

### 发布失败

检查 GitHub Actions 日志获取详情。常见问题：

- NPM 认证问题
- 构建失败
- 网络问题

## 迁移说明

旧的版本管理脚本（`scripts/version.js`）保留用于向后兼容和紧急使用。但是，**changesets 应该是版本管理的主要方法**。

逐步迁移：

1. 开始为新的变更使用 changesets
2. 在所有新 PR 中创建 changesets
3. 让自动化工作流处理版本升级和发布
4. 一旦团队熟悉 changesets，最终废弃旧脚本

## 参考资料

- [Changesets 文档](https://github.com/changesets/changesets)
- [添加 Changeset](https://github.com/changesets/changesets/blob/main/docs/adding-a-changeset.md)
- [Changesets CLI](https://github.com/changesets/changesets/blob/main/packages/cli/README.md)
