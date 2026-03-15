# MCPController 开发指南

## 常见错误

生成 MCPController 代码时，**必须**注意以下易错点：

| 错误写法                         | 正确写法                              | 说明                                     |
| -------------------------------- | ------------------------------------- | ---------------------------------------- |
| `from 'egg'`                     | `from '@eggjs/tegg'`                  | 所有 MCP 装饰器和类型来自 `@eggjs/tegg`  |
| `import z from 'zod'`            | `import { z } from '@eggjs/tegg/zod'` | 框架内置 zod，必须使用具名导入           |
| `z.object({ name: z.string() })` | `{ name: z.string() }`                | Schema 使用普通对象，不要用 `z.object()` |
| `args: ToolArgs<MySchema>`       | `args: ToolArgs<typeof MySchema>`     | 类型参数必须用 `typeof`                  |
| `@MCPController` 不加括号        | `@MCPController()`                    | 装饰器必须带括号调用                     |

---

## 文件约定

### 文件位置与命名

MCPController 放在 module 的 `controller/` 目录下，命名规则为 `{Name}MCPController.ts`：

```
app/module-name/
├── controller/
│   ├── PackageMCPController.ts    ← MCP 控制器
│   └── PackageHTTPController.ts   ← 同模块可共存 HTTP 控制器
└── service/
    └── PackageService.ts
```

### 插件配置

在 `config/plugin.ts` 中启用：

```typescript
plugin.mcpProxy = true;
```

### 路径配置

在 `config/config.default.ts` 中配置 MCP 路径（通常不需要修改，以下为默认值）：

```typescript
import { randomUUID } from 'node:crypto';

export default () => {
  const config = {
    mcp: {
      sseInitPath: '/mcp/sse',
      sseMessagePath: '/mcp/message',
      streamPath: '/mcp/stream',
      statelessStreamPath: '/mcp/stateless/stream',
      sessionIdGenerator: randomUUID,
    },
  };
  return config;
};
```

当使用 `@MCPController({ name: 'myServer' })` 声明命名服务时，路径自动变为：

- `/mcp/myServer/sse`
- `/mcp/myServer/message`
- `/mcp/myServer/stream`
- `/mcp/myServer/stateless/stream`

### AccessLevel

`@MCPController` 装饰器内部已默认设置 AccessLevel（PUBLIC），不需要再手动声明。

---

## 场景决策树

```
用户需要什么？

├─ "让 AI 能查数据 / 执行操作"
│  └─ → @MCPTool + @Inject Service 处理业务
│
├─ "给 AI 一个提示词模板"
│  └─ → @MCPPrompt
│
├─ "让 AI 读取某类资源数据"
│  ├─ 资源地址固定 → @MCPResource({ uri: '...' })
│  └─ 资源地址动态 → @MCPResource({ template: [...] })
│
├─ "Tool 执行中要推送进度"
│  └─ → @MCPTool + @Extra() 获取 sendNotification（见下方 @Extra 章节）
│
└─ "Tool 中需要读取自定义请求头"
   └─ → @MCPTool + @Extra() 获取 requestInfo.headers
```

---

## 端到端完整示例

以下展示一个完整的 MCP 功能从配置到测试的所有文件：

### 1. 插件配置 — `config/plugin.ts`

```typescript
plugin.mcpProxy = true;
```

### 2. 控制器 — `app/npm/controller/PackageMCPController.ts`

```typescript
import {
  MCPController, MCPTool, MCPToolResponse,
  MCPPrompt, MCPPromptResponse,
  MCPResource, MCPResourceResponse,
  ToolArgs, ToolArgsSchema,
  PromptArgs, PromptArgsSchema,
  Inject,
} from '@eggjs/tegg';
import { z } from '@eggjs/tegg/zod';

import { PackageService } from '../service/PackageService.ts';

const SearchSchema = {
  name: z.string({ description: 'npm package name' }),
};

const SummarySchema = {
  name: z.string(),
};

@MCPController()
export class PackageMCPController {
  @Inject()
  private readonly packageService: PackageService;

  @MCPTool({ description: 'Search npm package info' })
  async searchPackage(
    @ToolArgsSchema(SearchSchema) args: ToolArgs<typeof SearchSchema>,
  ): Promise<MCPToolResponse> {
    const pkg = await this.packageService.findByName(args.name);
    if (!pkg) {
      return { content: [{ type: 'text', text: `Package ${args.name} not found` }] };
    }
    return { content: [{ type: 'text', text: JSON.stringify(pkg) }] };
  }

  @MCPPrompt({ description: 'Generate package summary' })
  async summarize(
    @PromptArgsSchema(SummarySchema) args: PromptArgs<typeof SummarySchema>,
  ): Promise<MCPPromptResponse> {
    return {
      messages: [{
        role: 'user',
        content: {
          type: 'text',
          text: `Summarize the npm package: ${args.name}`,
        },
      }],
    };
  }

  @MCPResource({
    template: ['npm://{name}/{?version}', { list: undefined }],
  })
  async getPackageReadme(uri: URL): Promise<MCPResourceResponse> {
    const name = uri.hostname;
    const readme = await this.packageService.getReadme(name);
    return { contents: [{ uri: uri.toString(), text: readme }] };
  }
}
```

### 3. Service — `app/npm/service/PackageService.ts`

```typescript
import { SingletonProto } from 'egg';

@SingletonProto()
export class PackageService {
  async findByName(name: string) {
    // 业务逻辑
  }

  async getReadme(name: string): Promise<string> {
    // 业务逻辑
  }
}
```

### 4. 单元测试 — `test/npm/controller/PackageMCPController.test.ts`

```typescript
import assert from 'node:assert';
import { app } from 'egg-mock/bootstrap';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('PackageMCPController', () => {
  it('should search package via tool', async () => {
    app.mockCsrf();
    const client: Client = await app.mcpClient();

    const tools = await client.listTools();
    assert(tools.tools.some(t => t.name === 'searchPackage'));

    const res = await client.callTool({
      name: 'searchPackage',
      arguments: { name: 'egg' },
    });
    assert(res.content[0].type === 'text');
  });

  it('should get prompt', async () => {
    app.mockCsrf();
    const client: Client = await app.mcpClient();

    const res = await client.getPrompt({
      name: 'summarize',
      arguments: { name: 'egg' },
    });
    assert(res.messages.length > 0);
  });

  it('should read resource', async () => {
    app.mockCsrf();
    const client: Client = await app.mcpClient();

    const res = await client.readResource({
      uri: 'npm://egg?version=4.0.0',
    });
    assert(res.contents.length > 0);
  });
});
```

---

## @Extra() 的使用场景

`@Extra()` 装饰器注入 `ToolExtra` 对象，提供两个能力：

### 发送通知（长任务进度推送）

```typescript
@MCPTool()
async longTask(
  @ToolArgsSchema(Schema) args: ToolArgs<typeof Schema>,
  @Extra() extra: ToolExtra,
): Promise<MCPToolResponse> {
  const { sendNotification } = extra;
  for (let i = 0; i < 10; i++) {
    await sendNotification({
      method: 'notifications/message',
      params: { level: 'info', data: `Step ${i + 1}/10` },
    });
    // ... 执行步骤
  }
  return { content: [{ type: 'text', text: 'Done' }] };
}
```

### 读取自定义请求头

```typescript
@MCPTool()
async myTool(
  @ToolArgsSchema(Schema) args: ToolArgs<typeof Schema>,
  @Extra() extra: ToolExtra,
): Promise<MCPToolResponse> {
  const headers = extra.requestInfo?.headers;
  // 处理自定义 header
}
```

---

## 装饰器参考

| 装饰器                | 用途         | 常用参数                                   | 返回类型              |
| --------------------- | ------------ | ------------------------------------------ | --------------------- |
| `@MCPController()`    | 声明控制器   | `{ name?: string }`                        | -                     |
| `@MCPTool()`          | 声明工具     | `{ name?: string, description?: string }`  | `MCPToolResponse`     |
| `@MCPPrompt()`        | 声明提示词   | `{ name?: string, description?: string }`  | `MCPPromptResponse`   |
| `@MCPResource()`      | 声明资源     | `{ uri: string }` 或 `{ template: [...] }` | `MCPResourceResponse` |
| `@ToolArgsSchema()`   | Tool 参数    | Zod Schema 普通对象                        | -                     |
| `@PromptArgsSchema()` | Prompt 参数  | Zod Schema 普通对象                        | -                     |
| `@Extra()`            | 额外上下文   | -                                          | `ToolExtra`           |
| `@Inject()`           | 注入 Service | -                                          | -                     |

**注意**：`@MCPController` 的 `version`、`timeout` 等参数通常不需要配置。
