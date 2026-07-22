import { Inject, MCPController, MCPTool, ToolArgsSchema } from '@eggjs/tegg';
import { z } from 'zod';

import { HelloService } from './HelloService.ts';

const AddArgsSchema = {
  a: z.number(),
  b: z.number(),
};

@MCPController({ name: 'calc' })
export class CalcMCPController {
  @Inject()
  private readonly helloService: HelloService;

  @MCPTool({ description: 'add two numbers' })
  async add(@ToolArgsSchema(AddArgsSchema) args: { a: number; b: number }) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `${this.helloService.hello('mcp')}: ${args.a + args.b}`,
        },
      ],
    };
  }
}
