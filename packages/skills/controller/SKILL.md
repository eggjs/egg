---
name: egg-controller
description: Use when creating API endpoints, implementing protocol handlers, or exposing interfaces for specific clients. Covers HTTP, MCP and Schedule controllers for EGG framework applications.
allowed-tools: Read
---

# EGG 控制器

---

## 控制器选择决策树

```
需要暴露什么接口/客户端协议？

1. HTTP 接口？例如 HTML/JSON/SSR/SSE，可以使用 HTTPController，参考 `references/http-controller.md`

2. 定时任务，可以使用 Schedule，参考 `references/schedule.md`

3. AI集成 MCP，可以使用 MCPController，参考 `refercens/mcp-controller.md`
```
---

## 控制器快速参考

### HTTPController
- **装饰器**：`@HTTPController`、`@HTTPMethod`
- **参数**：`@HTTPParam`、`@HTTPQuery`、`@HTTPBody`、`@HTTPHeaders`、`@Cookies`、`@Request`、`@Context`
- **详细文档**：`references/httpcontroller.md`

### MCPController
- **装饰器**：`@MCPController`、`@MCPTool`、`@MCPPrompt`、`@MCPResource`
- **特点**：集成 LLM、Zod 验证、登录态支持

### Schedule
- **装饰器**：`@Schedule<T>`、配置
- **模式**：Worker/All

---

## 最佳实践

- **控制器精简**：业务逻辑委托给 Service 层
- **参数验证**：使用装饰器和类型定义
- **错误处理**：根据协议转换错误和响应码
- **RESTful 设计**：遵循 HTTP 方法和资源命名
- **响应一致性**：统一响应格式

---

## 参考资料

详细的控制器开发文档：
- `references/http-controller.md` - HTTP 接口完整指南
- `references/mcp-controller.md` - MCP/LLM 集成
- `references/schedule.md` - 定时任务

核心概念（@eggjs/skills-core）：模块、依赖注入、对象生命周期
