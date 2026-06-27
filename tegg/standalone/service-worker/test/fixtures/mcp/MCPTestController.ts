import { MCPController, MCPTool, MCPToolResponse, ToolArgsSchema, ToolArgs, Middleware } from '@eggjs/tegg';
import * as z from 'zod/v4';
import { McpTestAdvice } from './McpTestAdvice.ts';

const EchoArgs = {
  message: z.string().describe('The message to echo'),
};

const AddArgs = {
  a: z.number().describe('First number'),
  b: z.number().describe('Second number'),
};

@Middleware(McpTestAdvice)
@MCPController({ name: 'test-server', version: '1.0.0' })
export class MCPTestController {
  @MCPTool({ description: 'Echo the input message' })
  async echo(@ToolArgsSchema(EchoArgs) args: ToolArgs<typeof EchoArgs>): Promise<MCPToolResponse> {
    return {
      content: [{ type: 'text', text: args.message }],
    };
  }

  @MCPTool({ description: 'Add two numbers' })
  async add(@ToolArgsSchema(AddArgs) args: ToolArgs<typeof AddArgs>): Promise<MCPToolResponse> {
    return {
      content: [{ type: 'text', text: String(args.a + args.b) }],
    };
  }
}
