import { MCPClientQualifier, MCPClientInjectName, HttpMCPClient } from '@eggjs/mcp-client';
import { HttpMCPClientFactory } from '@eggjs/mcp-client-plugin';
import { HTTPController, HTTPMethod, HTTPMethodEnum, Inject } from '@eggjs/tegg';

@HTTPController({
  path: '/mcpclient',
})
export class AppController {
  @Inject()
  @MCPClientQualifier('bar')
  private readonly mcpClient: HttpMCPClient;

  @Inject({
    name: MCPClientInjectName,
  })
  @MCPClientQualifier('foo')
  private readonly StreamMcpClient: HttpMCPClient;

  @Inject()
  private readonly httpMCPClientFactory: HttpMCPClientFactory;

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello-sse',
  })
  async hello() {
    const res = await this.mcpClient.listTools();
    return res;
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello-streamable',
  })
  async streamable() {
    const res = await this.StreamMcpClient.listTools();
    return res;
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello-factory',
  })
  async factory() {
    const client = await this.httpMCPClientFactory.build(
      {
        name: 'foo',
        version: '1.0.0',
      },
      {
        transportType: 'STREAMABLE_HTTP',
        url: 'http://127.0.0.1:17263/',
      },
    );
    const res = await client.listTools();
    return res;
  }

  @HTTPMethod({
    method: HTTPMethodEnum.GET,
    path: '/hello-langchain-tools',
  })
  async langchainTools() {
    const tools = await this.mcpClient.getLangChainTool();
    return {
      length: tools.length,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        schema: tool.schema,
      })),
    };
  }
}
