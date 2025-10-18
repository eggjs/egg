# MCP Controller

## 使用场景

使用 mcp 触发器，可以快速便捷的让你的大模型接入。

## 本地开发

在编程界面可以通过`MCPController`装饰器声明一个类为 MCP 触发器，它将包含`Tool`，`Prompt`和`Resource`三种工具

开发前请先添加插件。

```typescript
plugin.mcpProxy = true;
```

### Tool

```typescript
import {
  MCPController,
  ToolArgs,
  MCPToolResponse,
  MCPTool,
  ToolArgsSchema,
} from 'egg';
import z from 'zod';

export const ToolType = {
  name: z.string({
    description: 'npm package name',
  }),
};

// interface MCPToolParams {
//     name?: string;
//     description?: string;
// }

@MCPController({
  name: 'HelloMCP',
})
export class MCPFooController {
  @MCPTool()
  // 请在这里用 typeof
  async bar(
    @ToolArgsSchema(ToolType) args: ToolArgs<typeof ToolType>,
  ): Promise<MCPToolResponse> {
    return {
      content: [
        {
          type: 'text',
          text: `海兔 npm 包: ${args.name} 不存在`,
        },
      ],
    };
  }
}
```

### Prompt

```typescript
import {
  MCPController,
  PromptArgs,
  MCPPromptResponse,
  MCPPrompt,
  PromptArgsSchema,
} from 'egg';
import z from 'zod';

export const PromptType = {
  name: z.string(),
};

// interface MCPPromptParams {
//     name?: string;
//     description?: string;
// }

@MCPController({
  name: 'HelloMCP',
})
export class MCPFooController {
  @MCPPrompt()
  // 请在这里用 typeof
  async foo(
    @PromptArgsSchema(PromptType) args: PromptArgs<typeof PromptType>,
  ): Promise<MCPPromptResponse> {
    return {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate a concise but descriptive commit message for these changes:\n\n${args.name}`,
          },
        },
      ],
    };
  }
}
```

### Resource

```typescript
import { MCPController, MCPResourceResponse, MCPResource } from 'egg';
import z from 'zod';

// export interface MCPResourceUriParams {
//     name?: string;
//     uri: string;
//     metadata?: ResourceMetadata;
// }
// export interface MCPResourceTemplateParams {
//     name?: string;
//     template: ConstructorParameters<typeof ResourceTemplate>;
//     metadata?: ResourceMetadata;
// }
// export type MCPResourceParams = MCPResourceUriParams | MCPResourceTemplateParams;

@MCPController({
  name: 'HelloMCP',
})
export class MCPFooController {
  @MCPResource({
    template: [
      'hitu://npm/{name}/{?version}',
      {
        list: undefined,
      },
    ],
  })
  async car(uri: URL): Promise<MCPResourceResponse> {
    return {
      contents: [
        {
          uri: uri.toString(),
          text: `MOCK TEXT`,
        },
      ],
    };
  }
}
```

### Notification

```typescript
import {
  MCPController,
  ToolArgs,
  MCPToolResponse,
  MCPTool,
  ToolExtra,
  ToolArgsSchema,
  Extra,
} from 'egg';
import z from 'zod';

export const NotificationType = {
  interval: z
    .number()
    .describe('Interval in milliseconds between notifications')
    .default(100),
  count: z
    .number()
    .describe('Number of notifications to send (0 for 100)')
    .default(50),
};

@MCPController()
export class AppController {
  @MCPTool({
    name: 'start-notification-stream',
    description:
      'Starts sending periodic notifications for testing resumability',
  })
  async startNotificationStream(
    @ToolArgsSchema(NotificationType) args: ToolArgs<typeof NotificationType>,
    @Extra() extra: ToolExtra,
  ): Promise<MCPToolResponse> {
    const { interval, count } = args;
    const { sendNotification } = extra;
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    let counter = 0;

    while (count === 0 || counter < count) {
      counter++;
      try {
        await sendNotification({
          method: 'notifications/message',
          params: {
            level: 'info',
            data: `Periodic notification #${counter}`,
          },
        });
      } catch (error) {
        console.error('Error sending notification:', error);
      }
      await sleep(interval);
    }

    return {
      content: [
        {
          type: 'text',
          text: `Started sending periodic notifications every ${interval}ms`,
        },
      ],
    };
  }
}
```

#### 调用

```ts
import {
  HTTPBody,
  HTTPController,
  HTTPMethod,
  HTTPMethodEnum,
  Inject,
} from 'egg';
import { MCPClientFactory } from 'egg/mcp';

export interface ListMcpRequest {
  appname: string;
  category?: string;
  servername: string;
  clientName?: string;
  uniqueId?: string;
  version?: string;
}

export interface CallMcpRequest {
  appname: string;
  category?: string;
  servername: string;
  clientName?: string;
  uniqueId?: string;
  version?: string;
  toolName: string;
  arguments: Record<string, object>;
}

@HTTPController({ path: '/api/mcp/admin/demo' })
export default class MCPDemoHTTPController {
  @Inject()
  private readonly mcpClientFactory: MCPClientFactory;

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/list',
  })
  async getMcpTools(
    @HTTPBody() request: ListMcpRequest,
  ): Promise<Record<string, string>> {
    const client = await this.mcpClientFactory.build(
      {
        name: request.clientName ?? request.servername,
        version: request.version ?? '1.0.0',
      },
      {
        serverSubConfig: {
          appname: request.appname,
          uniqueId: request.uniqueId,
          serverName: request.servername,
          category: request.category,
        },
      },
    );
    const tools = await client.listTools();
    return tools as any;
  }

  @HTTPMethod({
    method: HTTPMethodEnum.POST,
    path: '/call',
  })
  async callMcpTools(
    @HTTPBody() request: CallMcpRequest,
  ): Promise<Record<string, string>> {
    const client = await this.mcpClientFactory.build(
      {
        name: request.clientName ?? request.servername,
        version: request.version ?? '1.0.0',
      },
      {
        serverSubConfig: {
          appname: request.appname,
          uniqueId: request.uniqueId,
          serverName: request.servername,
          category: request.category,
        },
      },
    );
    const res = await client.callTool({
      name: request.toolName,
      arguments: request.arguments ?? {},
    });
    return res as any;
  }
}
```

## 单元测试

> ⚠️ 注意：MCP 只支持 node >= 18。

```typescript
import path from 'node:path';
import assert from 'node:assert';
import { app } from 'egg-mock/bootstrap';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';

describe('plugin/controller/test/mcp/mcpcontroller.test.ts', () => {
  it('should mcp work', async () => {
    app.mockCsrf();
    const client: Client = await app.mcpClient();

    const resources = await client.listResources();
    const prompts = await client.listPrompts();
    const tools = await client.listTools();

    assert.deepEqual(resources, {
      resources: [
        { uri: 'hitu://npm/tegg?version=4.10.0', name: 'tegg' },
        { uri: 'hitu://npm/mcp?version=0.10.0', name: 'mcp' },
      ],
    });

    assert.deepEqual(prompts, {
      prompts: [{ name: 'foo', arguments: [{ name: 'name', required: true }] }],
    });

    assert.deepEqual(tools, {
      tools: [
        {
          name: 'bar',
          inputSchema: {
            $schema: 'http://json-schema.org/draft-07/schema#',
            additionalProperties: false,
            properties: {
              name: {
                description: 'npm package name',
                type: 'string',
              },
            },
            required: ['name'],
            type: 'object',
          },
        },
      ],
    });

    const toolRes = await client.callTool({
      name: 'bar',
      arguments: {
        name: 'aaa',
      },
    });
    assert.deepEqual(toolRes, {
      content: [{ type: 'text', text: '海兔 npm 包: aaa 不存在' }],
    });

    const promptRes = await client.getPrompt({
      name: 'foo',
      arguments: {
        name: 'bbb',
      },
    });
    assert.deepEqual(promptRes, {
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: 'Generate a concise but descriptive commit message for these changes:\n\nbbb',
          },
        },
      ],
    });

    const resourceRes = await client.readResource({
      uri: 'hitu://npm/tegg?version=4.10.0',
    });
    assert.deepEqual(resourceRes, {
      contents: [
        { uri: 'hitu://npm/tegg?version=4.10.0', text: 'MOCK TEXT 张三' },
      ],
    });
  });
});
```
