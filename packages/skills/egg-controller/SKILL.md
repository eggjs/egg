---
name: egg-controller
description: Use when creating API endpoints, implementing protocol handlers, exposing interfaces for specific clients, adding parameter validation, or applying middleware to controllers. Covers HTTP, MCP and Schedule controllers, Ajv/TypeBox parameter validation, and Middleware (function-style and AOP) for EGG framework applications.
allowed-tools: Read
---

# EGG 控制器

---

## 控制器选择决策树

```
需要暴露什么接口/客户端协议？

1. HTTP 接口？例如 HTML/JSON/SSR/SSE，可以使用 HTTPController，参考 `references/http-controller.md`

2. 定时任务，可以使用 Schedule，参考 `references/schedule.md`

3. MCP 接口，可以使用 MCPController，参考 `references/mcp-controller.md`

需要做参数校验？

4. 使用 Ajv + TypeBox 做入参校验，参考 `references/ajv-validate.md`

需要给控制器加中间件（日志、鉴权、耗时统计等横切逻辑）？

5. 使用 Middleware，支持函数式写法和 AOP 写法，参考 `references/middleware.md`
```

---

## 控制器快速参考

### HTTPController

- **装饰器**：`@HTTPController`、`@HTTPMethod`
- **参数**：`@HTTPParam`、`@HTTPQuery`、`@HTTPBody`、`@HTTPHeaders`、`@Cookies`、`@Request`、`@Context`
- **详细文档**：`references/http-controller.md`

### MCPController

- **装饰器**：`@MCPController`、`@MCPTool`、`@MCPPrompt`、`@MCPResource`
- **特点**：集成 LLM、Zod 验证、登录态支持
- **详细文档**：`references/mcp-controller.md`

### Schedule

- **装饰器**：`@Schedule<T>`
- **模式**：Worker/All
- **详细文档**：`references/schedule.md`

### Ajv 参数校验

- **导入**：`import { Ajv, Type, Static } from 'egg/ajv'`
- **方式**：`@Inject() ajv: Ajv`，调用 `ajv.validate(schema, data)`
- **特点**：TypeBox 定义一次 Schema，同时获得校验和 TypeScript 类型
- **详细文档**：`references/ajv-validate.md`

### Middleware 中间件

- **导入**：`import { Middleware } from 'egg'`（AOP 类从 `import { Advice } from 'egg/aop'`）
- **写法**：函数式（Koa 中间件函数）和 AOP（@Advice 类），通过 `@Middleware()` 应用
- **特点**：支持类级别和方法级别，函数式和 AOP 不能在同一个 `@Middleware()` 中混用
- **详细文档**：`references/middleware.md`

---

## 常见问题排查

| 现象                   | 原因                                     | 解决方案                                                           |
| ---------------------- | ---------------------------------------- | ------------------------------------------------------------------ |
| MCP 装饰器 import 报错 | 从 `'egg'` 导入                          | MCP 装饰器从 `'@eggjs/tegg'` 导入，zod 从 `'@eggjs/tegg/zod'` 导入 |
| MCP Schema 报错        | 用了 `z.object()` 包装                   | 直接用普通对象 `{ name: z.string() }`                              |
| 定时任务不生效         | 放在 `app/schedule` 目录                 | 放在模块目录中，避免和 egg 默认扫描冲突                            |
| Ajv 校验 import 报错   | 从 `typebox` 或 `ajv` 导入               | 统一从 `'egg/ajv'` 导入 Type、Static、Ajv 等                       |
| type 推导不完整        | 用 `type` 定义                           | 用 `interface Foo extends Static<typeof Schema> {}` 代替           |
| Middleware 混用报错    | 函数和 Advice 类放同一个 `@Middleware()` | 分开写多个 `@Middleware()`，每个内部类型一致                       |
| AOP Middleware 不生效  | Advice 类没加 `@Advice()` 装饰器         | 必须同时有 `@Advice()` 装饰器才能被识别为 AOP                      |

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
- `references/mcp-controller.md` - MCP 接口开发
- `references/schedule.md` - 定时任务
- `references/ajv-validate.md` - Ajv 参数校验
- `references/middleware.md` - Middleware 中间件（函数式 + AOP）

核心概念（`egg-core` skill）：模块、依赖注入、对象生命周期

单元测试（`egg-unittest` skill）：HTTP 接口测试、Service 测试、Mock
