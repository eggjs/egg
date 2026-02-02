---
name: egg
description: 本技能用于处理 EGG 框架。它提供基于用户意图在核心概念和控制器之间做选择的决策指导。作为所有 EGG 相关问题的入口点使用。
allowed-tools: Read
---

# EGG 决策指南

## 概述

本技能帮助根据用户意图和任务类型确定使用哪个专用的 EGG 技能。EGG 文档组织为两个主要领域：

1. **核心概念**（`@eggjs/skills-core`）：模块架构、依赖注入、对象生命周期
2. **控制器**（`@eggjs/skills-controller`）：用于 API 端点的各种协议特定控制器

## 技能选择逻辑

### 使用 @eggjs/skills-core 当用户询问：

**用户询问关于：**
- 模块架构和组织
- `@SingletonProto` vs `@ContextProto` 的使用
- 使用 `@Inject` 的依赖注入
- 对象生命周期和实例化
- 模块之间的访问控制（`AccessLevel`）
- 模块配置（`module.yml`、`package.json`）
- 使用限定符解决命名冲突

**触发关键词：**
- module、workspace、modules
- singleton、单例、@SingletonProto
- context、request context、@ContextProto
- inject、injection、dependency injection、@Inject
- prototype、lifecycle、实例化
- access level、private、public、@ModuleQualifier
- configuration、module config

**示例查询：**
- "如何在 EGG 中创建模块？"
- "SingletonProto 和 ContextProto 有什么区别？"
- "如何注入服务？"
- "如何访问其他模块的对象？"
- "TEGG 中的 AccessLevel 是什么？"

### 使用 @eggjs/skills-controller 当用户询问：

**用户询问关于：**
- 创建 API 端点或接口
- 实现特定协议处理器（HTTP、MCP 等）
- 连接到外部系统或客户端
- 处理传入的请求/响应
- 控制器级别的装饰器和模式

**触发关键词：**
- controller、控制器
- HTTP、API、REST、endpoint
- MCP、LLM、AI、tool
- schedule、timer、cron、scheduled、定时
- SSE、streaming、server-sent events

**示例查询：**
- "如何创建 HTTP controller？"
---

## 决策框架

### 步骤 1：识别意图类型

询问：**用户是在询问构建块/框架内部 OR 实现特定接口？**

**构建块/框架内部** → 使用 `@eggjs/skills-core`
- 理解 EGG 如何工作
- 组织代码结构
- 管理对象生命周期
- 设置模块

**实现特定接口** → 使用 `@eggjs/skills-controller`
- 创建 API/端点
- 处理不同协议
- 处理请求/响应

### 步骤 2：检查模糊意图

如果用户的意图可能是核心 OR 控制器（例如，"如何实现一个需要跨模块访问的服务？"）：

**决策优先级**：核心概念优先

理由：即使服务将在控制器中使用，关于跨模块访问（`AccessLevel`）的基本问题是一个核心概念。一旦理解了核心结构，用户就可以在控制器中应用它。

**行动**：
1. 加载 `@eggjs/skills-core`
2. 解释概念（例如，`AccessLevel.PUBLIC`）
3. 核心解释后，建议："如果你需要在特定控制器中使用它，请参阅 `@eggjs/skills-controller`"

### 步骤 3：协议/用例特定指示器

| 协议/用例 | 主要技能 | 次要技能 |
|---------|---------|---------|
| HTTP API | Controller | - |
| MCP | Controller | - |
| Scheduled Tasks | Controller | - |
| Cross-module injection | **Core** | - |
| Module structure | **Core** | - |
| Object lifecycle | **Core** | - |

---

## 冲突解决规则

### 规则 1：基础优先

当问题同时涉及核心概念 AND 控制器实现时：
- **示例**："如何实现一个 HTTP 控制器可以使用的单例服务？"
- **决策**：从 `@eggjs/skills-core` 开始解释 SingletonProto 和 AccessLevel
- **后续**："现在你理解了服务定义，使用 `@eggjs/skills-controller` 实现注入此服务的 HTTP 控制器。"

### 规则 2：显式覆盖

如果用户明确提及特定控制器类型：
- **示例**："如何使用 HTTPController 配合 ContextProto 服务？"
- **决策**：加载 `@eggjs/skills-controller`（HTTPController 是显式的）
- **后续**：解释 HTTPController 实现，如果需要简要提及来自核心概念的 ContextProto

### 规则 3：学习语境

如果用户问"什么是 X？"或"Y 如何工作？"：
- **核心概念问题** → `@eggjs/skills-core`
- **控制器类型问题** → `@eggjs/skills-controller`
- **一般 EGG 问题** → 使用本技能的决策框架

如果用户问"如何实现 X？"或"给我看 Y 的代码？"：
- **实现特定问题** → 根据决策框架加载特定技能

---

## 快速参考表

| 用户意图 | 关键词 | 使用技能 |
|---------|--------|---------|
| Module architecture | module、workspace、organization | @eggjs/skills-core |
| Object lifecycle | singleton、context、lifecycle | @eggjs/skills--core |
| Dependency injection | inject、@Inject、dependency | @eggjs/skills-core |
| Access control | private、public、cross-module | @eggjs/skills-core |
| HTTP endpoints | HTTP、API、REST | @eggjs/skills-controller |
| LLM/AI integration | MCP、tool、prompt | @eggjs/skills-controller |
| Scheduling | schedule、cron、timer | @eggjs/skills-controller |

---

## 示例

### 示例 1：明确的核心意图

**用户**："@SingletonProto 和 @ContextProto 有什么区别？"

**分析**：问题关于核心装饰器和对象生命周期
**决策**：加载 `@eggjs/skills-core`

**用户**："如何在 EGG 中创建模块？"

**分析**：问题关于模块架构（核心概念）
**决策**：加载 `@eggjs/skills-core`

### 示例 2：明确的控制器意图

**用户**："如何创建返回 JSON 的 HTTP controller？"

**分析**：问题关于实现特定协议（HTTP）
**决策**：加载 `@eggjs/skills-controller`

### 示例 3：模糊意图（核心 > 控制器）

**用户**："我需要创建一个可以被 HTTP 控制器使用的服务。如何实现？"

**分析**：用户需要理解核心概念（跨模块访问）AND 控制器实现
**决策**：首先加载 `@eggjs/skills-core`（基础）

**响应**：
1. 解释 `@SingletonProto` 配合 `AccessLevel.PUBLIC` 使服务可访问
2. 展示如何注入服务：`@Inject() myService: MyService`
3. 后续："现在你可以在 HTTPController 中注入此服务。实现详情请参阅 `@eggjs/skills-controller`。"

### 示例 4：显式控制器加上核心知识

**用户**："如何在 HTTPController 中使用 @Inject 访问用户服务？"

**分析**：用户明确提及 HTTPController（控制器类型）但询问 @Inject（核心概念）
**决策**：加载 `@eggjs/skills-controller`（HTTPController 是明确意图）

**响应**：
1. 展示配合 `@Inject` 的 HTTPController 实现
2. 简要解释 @Inject 如何工作（核心概念摘要）
3. 注意："包含限定符的详细 @Inject 使用，请参阅 `@eggjs/skills-core`"

---

## 路由最佳实践

1. **优先考虑显式控制器提及**：如果用户命名特定控制器（HTTP），即使涉及核心概念也使用控制器技能

2. **基础先行**：如果实现前需要理解核心概念，先解释核心概念

3. **简短上下文可以接受**：当路由到一个技能时，提及另一个技能的存在以供后续问题

4. **混合响应可接受**：当意图真正混合时，提供两个技能的简短上下文但专注于主要意图

5. **渐进式披露**：除非明确要求，不要同时加载两个技能。让用户引导探索

---

## 技能交互

本技能（`@eggjs/skills-tegg`）应该：
- 为框架内部概念路由到 `@eggjs/skills-core`
- 为协议特定实现路由到 `@eggjs/skills-controller`
- 当意图模糊时提供决策指导
- 当存在有用的上下文时交叉引用技能
