# Skills 编写与评测规范

`packages/skills/` 目录包含 AI agent skills — 纯 markdown 文档，指导 AI 助手使用 Egg 框架。以 `@eggjs/skills` npm 包发布，仅含 `.md` 文件。

> **Skill 编写基础知识**：SKILL.md 格式、frontmatter 规范、目录结构、progressive disclosure、写作风格等通用知识请使用 `/skill-creator` skill 获取指导。以下仅记录 Egg 项目特有的约定。

## Egg Skills 架构

Skills 采用分层路由模式：

- **入口 skill** (`egg/`) — 分析用户意图，通过关键词匹配和决策逻辑路由到专业 skill
- **专业 skills** — 提供特定领域的深度指导：
  - `egg-core/` — 核心概念：模块、依赖注入、生命周期、AccessLevel、后台任务
  - `egg-controller/` — 实现指导：HTTPController、MCPController、Schedule、Ajv 校验

## Egg Skill Frontmatter 约定

- **`name`**：入口 skill 使用 `egg`，专业 skill 以 `egg-` 为前缀（如 `egg-controller`、`egg-core`）
- **`allowed-tools`**：统一使用 `Read`（纯文档指导型，不修改文件）
- **`description`**：
  - 中文：以"本技能用于..."开头，包含触发关键词
  - 英文：以"Use when..."开头，包含触发关键词

## 专业 Skill 编写规范

**入口 Skill（如 `egg/`）编写要点：**

对应 /skill-creator 的 **Workflow-Based** 模式。

1. 决策框架包含明确步骤：识别意图 → 检查模糊意图 → 协议/用例特定指示
2. 为每个专业 skill 列出中英文触发关键词
3. 冲突解决规则：明确意图模糊时的优先级（如"基础优先"——核心概念优先于控制器实现）
4. 示例分析：多个完整示例，格式为 用户查询 → 分析 → 决策 → 响应策略
5. 快速参考表：用户意图 → 关键词 → 推荐 skill 映射
6. 交叉引用话术：回答完主问题后，附"如需了解 X，请参阅 `@eggjs/skills-xxx`"

**专业 Skill 两种组织模式：**

| 模式                               | /skill-creator 对应 | 适用场景           | SKILL.md 内容           | references/ 用途   |
| ---------------------------------- | ------------------- | ------------------ | ----------------------- | ------------------ |
| **概念型**（如 `egg-core/`）       | Reference-Based     | 概念解释、架构理解 | 自包含的深度内容        | 更深入的专题文档   |
| **索引型**（如 `egg-controller/`） | Workflow-Based      | 多种实现方式的选择 | 精简的决策树 + 快速参考 | 每种实现的详细指南 |

**概念型 Skill 内容结构：**

1. 概述（一段话说明覆盖范围）
2. 按概念分块，每个概念包含：定义 → 使用场景 → 装饰器/API 模式 → 代码示例
3. 重要约束（反模式、限制）
4. 快速决策指南表（场景 → 推荐方式）
5. 最佳实践
6. 参考资料链接

**索引型 Skill 内容结构：**

1. 决策树（根据需求选择实现方式）
2. 每种类型的快速参考（装饰器、参数、特点）
3. 最佳实践
4. 参考资料链接

## Reference 文档编写要点

Reference 文档（`references/*.md`）**不需要 YAML frontmatter**，只有 `SKILL.md` 才需要。

**核心原则：Skill 不是文档的重新排版，而是填补"文档到生产代码"之间的缝隙。**

Skill 的价值 = 文档 + 实践经验 - 重复内容。如果内容和 `site/docs/` 中的文档高度重复，说明 skill 写得不对。

| 内容类型            | 该放文档（site/docs/） | 该放 Skill（packages/skills/） |
| ------------------- | ---------------------- | ------------------------------ |
| API 签名、参数说明  | Yes                    | No（引用文档即可）             |
| 易错点 / 常见错误   | 部分                   | **Yes（重点）**                |
| 完整端到端模式      | No                     | **Yes**                        |
| 跨模块集成知识      | 散落各处               | **Yes（聚合）**                |
| 文件放置 / 命名约定 | 部分                   | **Yes**                        |
| 场景化决策树        | No                     | **Yes**                        |

**编写 Reference 文档的具体步骤：**

1. **先读对应的文档**（如 `site/docs/zh-CN/basics/mcpcontroller.md`），理解已有内容
2. **向维护者提问，收集文档未覆盖的知识**，重点关注：
   - 导入路径、命名约定等易错点（AI 最容易犯的错）
   - 文件应该放在哪个目录？命名规则是什么？
   - 和其他模块（Module、Service、DI）的集成关系
   - 哪些配置参数实际开发中需要关心，哪些用默认值即可
   - 哪些是内部扩展机制不需要暴露给应用开发者
3. **以常见错误表开头** — 把 AI 最容易写错的地方放在最醒目的位置（如错误的导入路径、错误的 API 用法）
4. **文件约定** — 目录结构、命名规则、配置文件位置，这些文档里通常不会详细说明
5. **场景化决策树** — 从用户意图出发（"让 AI 查数据"），而非从 API 出发（"@MCPTool"）
6. **端到端完整示例** — 从配置文件到控制器到 Service 到测试，展示所有相关文件和它们的关系
7. **精简的装饰器对照表放末尾** — 仅作为速查，不展开 API 详解

## 添加新 Skill

1. 在 `packages/skills/` 下创建目录：`packages/skills/<skill-name>/`
2. 创建 `SKILL.md`（格式规范参考 `/skill-creator`，frontmatter 遵循上述 Egg 约定）
3. 创建 `references/` 目录（初始为空时放置 `.gitkeep`）
4. 按需在 `references/*.md` 中添加详细参考文档
5. 更新入口 skill（`egg/SKILL.md`）的路由逻辑以包含新 skill
6. 如果 skill 涉及 controller 类型，同时更新 `egg-controller/SKILL.md` 决策树

## 添加新 Reference 文档

1. 在 skill 的 `references/` 目录中创建 `.md` 文件
2. 遵循命名规范（kebab-case，描述性命名：`http-controller.md`、`mcp-controller.md`）
3. 包含完整的代码示例和决策树
4. 更新父级 `SKILL.md` 引用新文档
5. 如果 `references/` 中已有文件，移除 `.gitkeep`

## Skill 评测

评测用例存放在 `packages/skills/eval/` 目录下，用于验证 AI 使用 skill 后的回答质量。

**评测文件结构：**

```text
packages/skills/eval/
├── evals-egg-core.json        # egg-core skill 评测用例
├── evals-egg-controller.json  # egg-controller skill 评测用例
├── evals-routing.json         # 入口路由评测用例
├── .gitignore                 # 忽略 *-workspace/ 目录
└── <skill-name>-workspace/    # 评测输出（gitignored），由 /skill-creator 管理
    └── iteration-N/
        ├── REPORT.md          # 对比评分报告
        ├── GRADING.md         # with-skill 通过率报告
        └── {prefix}-{id}/     # 每个用例一个目录
            ├── eval_metadata.json
            ├── with_skill/outputs/
            └── without_skill/outputs/
```

**评测用例 JSON 格式：**

```json
{
  "skill_name": "egg-controller",
  "description": "控制器评测：覆盖 http-controller、mcp-controller、schedule、ajv-validate",
  "evals": [
    {
      "id": 1,
      "prompt": "用户的任务描述",
      "expected_output": "期望输出的关键要素描述",
      "files": [
        { "path": "相对路径", "content": "文件内容（可选，用于提供上下文或有 bug 的代码）" }
      ]
    }
  ]
}
```

**评测流程：**

使用 `/skill-creator` skill 运行评测和生成结果展示。评测流程概述：

1. **编写评测用例** — 在对应的 `evals-*.json` 中添加用例
2. **运行评测** — 通过 `/skill-creator` 为每个用例启动两个并行 subagent（with-skill 和 site-docs），使用下方 prompt 模板
3. **评分和展示** — `/skill-creator` 负责评分、生成对比报告、启动可视化 viewer 供人工 review
4. **改进 skill** — 根据评分结果和人工 feedback 改进 skill 内容，开启新的 iteration

**评测对比的两组环境：**

每个评测用例需要在两种环境下分别运行，对比 skill 是否有效。Prompt 中不应包含任何流程指引（如"先判断使用哪个 skill"），只提供参考资料和访问约束，让 AI 自然行动。

| 环境           | system prompt                                                                         | 可访问范围（prompt 约束）  |
| -------------- | ------------------------------------------------------------------------------------- | -------------------------- |
| **with-skill** | `egg/SKILL.md`（入口 skill）的完整内容                                                | 仅 `packages/skills/` 目录 |
| **site-docs**  | 角色声明 + `site/docs/` 的完整文件目录列表（通过 `find site/docs -name '*.md'` 生成） | 仅 `site/docs/` 目录       |

**Prompt 模板：**

with-skill 环境：

```text
你是 EGG 框架开发专家。你只能通过 Read 工具读取 packages/skills/ 目录下的文件，不能访问 site/docs/ 或项目源码。

{egg/SKILL.md 的完整内容}

---
{eval prompt}
```

site-docs 环境：

```text
你是 EGG 框架开发专家。你只能通过 Read 工具读取 site/docs/ 目录下的文件，不能访问 packages/skills/ 或项目源码。项目文档目录如下：

{完整的 site/docs/ 文件列表，通过 find site/docs -name '*.md' | sort 生成}

---
{eval prompt}
```

两组 prompt 的差异仅在于参考资料不同，不包含额外的流程提示。subagent 均具备 Read 工具权限。访问范围通过 prompt 约束（软限制，非技术硬限制）。

两组使用相同的 eval prompt，对比输出质量差异。如果 with-skill 没有明显优于 site-docs，说明 skill 内容需要改进——要么缺少文档未覆盖的知识，要么存在与文档的不必要重复。

**输出目录：**

评测结果保存到 `packages/skills/eval/<skill-name>-workspace/iteration-N/` 目录下（已在 `.gitignore` 中通过 `*-workspace/` 忽略），具体目录结构由 `/skill-creator` 管理。

**评测用例设计原则：**

每个 reference 文档至少覆盖 5 个以上评测用例，需覆盖以下场景类型：

| 场景类型             | 说明                                    | 示例                                                     |
| -------------------- | --------------------------------------- | -------------------------------------------------------- |
| **泛化需求描述**     | 不了解框架术语，用口语化描述需求        | "帮我加个参数校验"                                       |
| **精确需求描述**     | 明确指定技术方案和约束                  | "用 TypeBox 定义 Schema，email 用 format: email"         |
| **使用咨询**         | 询问用法、区别、选型                    | "Optional 和 Null 有什么区别"                            |
| **问题排查**         | 提供有 bug 的代码（附 files），要求诊断 | "校验跑不起来，帮我看看"                                 |
| **新项目代码生成**   | 在全新项目中从零开始生成功能代码        | "帮我写一个创建订单的接口，需要做参数校验"               |
| **存量项目代码生成** | 在包含老 egg 代码的项目中生成或迁移代码 | "帮我把这个老的 egg controller 改成 HTTPController 写法" |
| **不常用 API**       | 需要查外部文档链接才能回答              | "用 Tuple 定义元组校验"                                  |
