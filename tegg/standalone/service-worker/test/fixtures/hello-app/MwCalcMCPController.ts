import { MCPController, MCPTool, Middleware, ToolArgsSchema } from '@eggjs/tegg';
import { z } from 'zod';

import { MCP_MW_CALLS } from './mcpMiddlewareRecorder.ts';

async function controllerMw(_ctx: any, next: () => Promise<void>): Promise<void> {
  MCP_MW_CALLS.push('controller-mw');
  await next();
}

async function toolMw(_ctx: any, next: () => Promise<void>): Promise<void> {
  MCP_MW_CALLS.push('tool-mw');
  await next();
}

@MCPController({ name: 'mwcalc' })
@Middleware(controllerMw)
export class MwCalcMCPController {
  @MCPTool({ description: 'echo the input' })
  @Middleware(toolMw)
  async echo(@ToolArgsSchema({ v: z.string() }) args: { v: string }) {
    return { content: [{ type: 'text' as const, text: args.v }] };
  }
}
