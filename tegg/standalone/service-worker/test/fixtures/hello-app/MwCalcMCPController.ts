import { AbstractControllerAdvice, MCPController, MCPTool, Middleware, ToolArgsSchema } from '@eggjs/tegg';
import { Advice } from '@eggjs/tegg/aop';
import type { AdviceContext } from '@eggjs/tegg/aop';
import type { ServiceWorkerFetchContext } from '@eggjs/tegg/standalone';
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

@Advice()
export class McpControllerAdvice extends AbstractControllerAdvice<ServiceWorkerFetchContext> {
  async middleware(ctx: ServiceWorkerFetchContext, next: () => Promise<void>): Promise<void> {
    MCP_MW_CALLS.push('controller-advice-before');
    await next();
    MCP_MW_CALLS.push(`controller-advice-after:${ctx.response?.status}`);
    if (ctx.response) {
      const headers = new Headers(ctx.response.headers);
      headers.set('x-controller-advice', 'applied');
      ctx.response = new Response(ctx.response.body, {
        status: ctx.response.status,
        statusText: ctx.response.statusText,
        headers,
      });
    }
  }
}

@Advice()
export class McpToolAdvice extends AbstractControllerAdvice<ServiceWorkerFetchContext> {
  async middleware(
    _ctx: ServiceWorkerFetchContext,
    next: () => Promise<void>,
    adviceContext: AdviceContext,
  ): Promise<void> {
    MCP_MW_CALLS.push(`tool-advice:${String(adviceContext.method)}:${adviceContext.args[0].v}`);
    await next();
  }
}

@MCPController({ name: 'mwcalc' })
@Middleware(McpControllerAdvice)
@Middleware(controllerMw)
export class MwCalcMCPController {
  @MCPTool({ description: 'echo the input' })
  @Middleware(McpToolAdvice)
  @Middleware(toolMw)
  async echo(@ToolArgsSchema({ v: z.string() }) args: { v: string }) {
    return { content: [{ type: 'text' as const, text: args.v }] };
  }
}
