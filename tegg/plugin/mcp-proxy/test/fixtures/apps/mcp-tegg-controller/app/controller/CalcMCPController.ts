import { MCPController, MCPTool, ToolArgsSchema } from '@eggjs/tegg';
import { z } from 'zod';

const AddArgsSchema = {
  a: z.number(),
  b: z.number(),
};

@MCPController()
export class CalcMCPController {
  @MCPTool({ description: 'add two numbers' })
  async add(@ToolArgsSchema(AddArgsSchema) args: { a: number; b: number }) {
    return {
      content: [
        {
          type: 'text' as const,
          text: `${args.a + args.b}`,
        },
      ],
    };
  }
}
