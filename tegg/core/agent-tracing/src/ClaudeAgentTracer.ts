import { randomUUID } from 'node:crypto';

import type { SDKMessage, SDKResultMessage } from '@anthropic-ai/claude-agent-sdk';
import { SingletonProto, Inject } from '@eggjs/core-decorator';
import { AccessLevel } from '@eggjs/tegg-types';
import type { Logger } from '@eggjs/tegg-types';
import type { Run } from '@langchain/core/tracers/base';

import type { TracingService } from './TracingService.ts';
import {
  type ClaudeMessage,
  type ClaudeContentBlock,
  type ClaudeTokenUsage,
  type IRunCost,
  RunStatus,
  type TracerConfig,
  applyTracerConfig,
} from './types.ts';

/**
 * TraceSession - Manages state for a single agent execution with streaming support.
 * Allows processing messages one-by-one and logging them immediately.
 */
export class TraceSession {
  #traceId: string;
  #rootRun: Run | null = null;
  #rootRunId: string;
  #startTime: number;
  #executionOrder = 2; // Start at 2, root is 1
  #pendingToolUses = new Map<string, Run>();
  #tracer: ClaudeAgentTracer;

  constructor(tracer: ClaudeAgentTracer, sessionId?: string) {
    this.#tracer = tracer;
    this.#traceId = sessionId || randomUUID();
    this.#rootRunId = randomUUID();
    this.#startTime = Date.now();
  }

  /**
   * Process a single SDK message and log it immediately.
   * Non-tracing message types (tool_progress, stream_event, status, etc.) are automatically ignored.
   */
  async processMessage(message: SDKMessage): Promise<void> {
    try {
      const converted = this.#tracer.convertSDKMessage(message);
      if (!converted) return;

      if (converted.type === 'system' && converted.subtype === 'init') {
        this.handleInit(converted);
      } else if (converted.type === 'assistant') {
        this.handleAssistant(converted);
      } else if (converted.type === 'user') {
        this.handleUser(converted);
      } else if (converted.type === 'result') {
        this.handleResult(converted);
      }
    } catch (e) {
      this.#tracer.logger.warn('[ClaudeAgentTracer] processMessage error:', e);
    }
  }

  private handleInit(message: ClaudeMessage): void {
    this.#traceId = message.session_id || this.#traceId;
    this.#rootRun = this.#tracer.createRootRunInternal(message, this.#startTime, this.#traceId, this.#rootRunId);
    this.#tracer.logTrace(this.#rootRun, RunStatus.START);
  }

  private handleAssistant(message: ClaudeMessage): void {
    if (!this.#rootRun) {
      this.#tracer.logger.warn('[ClaudeAgentTracer] Received assistant message before init');
      return;
    }

    const content = message.message?.content || [];
    const hasToolUse = content.some((c) => c.type === 'tool_use');
    const hasText = content.some((c) => c.type === 'text');

    if (hasToolUse) {
      // Create LLM run that initiated tool calls
      const llmRun = this.#tracer.createLLMRunInternal(
        message,
        this.#rootRunId,
        this.#traceId,
        this.#executionOrder++,
        this.#startTime,
        true,
      );
      this.#rootRun.child_runs.push(llmRun);
      this.#tracer.logTrace(llmRun, RunStatus.END);

      // Create tool runs (will be completed when tool_result arrives)
      for (const block of content) {
        if (block.type === 'tool_use') {
          const toolRun = this.#tracer.createToolRunStartInternal(
            block,
            this.#rootRunId,
            this.#traceId,
            this.#executionOrder++,
            this.#startTime,
          );
          this.#rootRun.child_runs.push(toolRun);
          this.#pendingToolUses.set(block.id, toolRun);
          this.#tracer.logTrace(toolRun, RunStatus.START);
        }
      }
    } else if (hasText) {
      // Text-only response
      const llmRun = this.#tracer.createLLMRunInternal(
        message,
        this.#rootRunId,
        this.#traceId,
        this.#executionOrder++,
        this.#startTime,
        false,
      );
      this.#rootRun.child_runs.push(llmRun);
      this.#tracer.logTrace(llmRun, RunStatus.END);
    }
  }

  private handleUser(message: ClaudeMessage): void {
    if (!message.message?.content) return;

    for (const block of message.message.content) {
      if (block.type === 'tool_result') {
        const toolRun = this.#pendingToolUses.get(block.tool_use_id);
        if (toolRun) {
          this.#tracer.completeToolRunInternal(toolRun, block, this.#startTime);
          const status = block.is_error ? RunStatus.ERROR : RunStatus.END;
          this.#tracer.logTrace(toolRun, status);
          this.#pendingToolUses.delete(block.tool_use_id);
        }
      }
    }
  }

  private handleResult(message: ClaudeMessage): void {
    if (!this.#rootRun) {
      this.#tracer.logger.warn('[ClaudeAgentTracer] Received result message before init');
      return;
    }

    // Complete any pending tool runs
    for (const [toolUseId, toolRun] of this.#pendingToolUses) {
      this.#tracer.logger.warn(`[ClaudeAgentTracer] Tool run ${toolUseId} did not receive result`);
      toolRun.end_time = this.#startTime;
      this.#tracer.logTrace(toolRun, RunStatus.ERROR);
    }
    this.#pendingToolUses.clear();

    // Update and log root run end
    this.#rootRun.end_time = this.#startTime + (message.duration_ms || 0);
    this.#rootRun.outputs = {
      result: message.result,
      is_error: message.is_error,
      num_turns: message.num_turns,
    };

    if (message.usage || message.modelUsage) {
      const cost = this.#tracer.createRunCostInternal(message);
      if (this.#rootRun.outputs) {
        (this.#rootRun.outputs as any).llmOutput = cost;
      }
    }

    if (message.is_error) {
      this.#rootRun.error = message.result;
    }

    this.#rootRun.child_execution_order = this.#executionOrder - 1;
    const status = message.is_error ? RunStatus.ERROR : RunStatus.END;
    this.#tracer.logTrace(this.#rootRun, status);
  }

  /**
   * Get current trace ID
   */
  getTraceId(): string {
    return this.#traceId;
  }
}

/**
 * ClaudeAgentTracer - Converts Claude SDK messages to LangChain Run format
 * and logs them to the same remote logging system as LangGraphTracer.
 *
 * Supports both batch processing (processMessages) and streaming (createSession).
 */
@SingletonProto({
  accessLevel: AccessLevel.PUBLIC,
})
export class ClaudeAgentTracer {
  /** @internal */
  @Inject()
  readonly logger: Logger;

  @Inject()
  private tracingService: TracingService;

  name = 'ClaudeAgentTracer';
  agentName = '';

  /**
   * Configure the tracer with agent name and service credentials.
   */
  configure(config: TracerConfig): void {
    applyTracerConfig(this, this.tracingService, config);
  }

  /**
   * Create a new trace session for streaming message processing.
   * Use this for real-time tracing where messages arrive one-by-one.
   *
   * @example
   * const session = claudeTracer.createSession();
   * for await (const message of agent.run('task')) {
   *   await session.processMessage(message);
   * }
   */
  public createSession(sessionId?: string): TraceSession {
    return new TraceSession(this, sessionId);
  }

  /**
   * Main entry point - convert SDK messages to Run trees and log them.
   * Use this when you have all messages collected (batch processing).
   * For real-time streaming, use createSession() instead.
   *
   * Non-tracing message types (tool_progress, stream_event, status, etc.) are automatically filtered out.
   */
  public async processMessages(sdkMessages: SDKMessage[]): Promise<void> {
    try {
      if (!sdkMessages || sdkMessages.length === 0) {
        this.logger.warn('[ClaudeAgentTracer] No messages to process');
        return;
      }

      // Pre-validate: ensure there is an init message before creating session
      const hasInit = sdkMessages.some((m) => m.type === 'system' && 'subtype' in m && m.subtype === 'init');
      if (!hasInit) {
        this.logger.warn('[ClaudeAgentTracer] No system/init message found');
        return;
      }

      // Delegate to TraceSession for message processing
      const session = this.createSession();
      for (const msg of sdkMessages) {
        await session.processMessage(msg);
      }
    } catch (e) {
      this.logger.warn('[ClaudeAgentTracer] processMessages error:', e);
    }
  }

  /**
   * @internal
   * Convert an SDKMessage to internal ClaudeMessage format.
   * Returns null for message types that are not relevant to tracing.
   */
  convertSDKMessage(msg: SDKMessage): ClaudeMessage | null {
    // SDKSystemMessage (init)
    if (msg.type === 'system' && 'subtype' in msg && msg.subtype === 'init') {
      return msg as unknown as ClaudeMessage;
    }

    // SDKAssistantMessage
    if (msg.type === 'assistant' && 'message' in msg && 'parent_tool_use_id' in msg) {
      return {
        type: 'assistant',
        uuid: msg.uuid,
        session_id: msg.session_id,
        message: msg.message as any,
        parent_tool_use_id: msg.parent_tool_use_id,
      };
    }

    // SDKUserMessage (tool results, not replay)
    if (msg.type === 'user' && 'message' in msg && !('isReplay' in msg && (msg as any).isReplay)) {
      return {
        type: 'user',
        uuid: msg.uuid || randomUUID(),
        session_id: msg.session_id,
        message: msg.message as any,
        parent_tool_use_id: (msg as any).parent_tool_use_id,
      };
    }

    // SDKResultMessage (success or error)
    if (msg.type === 'result') {
      const resultMsg = msg as SDKResultMessage;
      const isSuccess = resultMsg.subtype === 'success';
      return {
        type: 'result',
        subtype: isSuccess ? 'success' : 'error',
        is_error: resultMsg.is_error,
        duration_ms: resultMsg.duration_ms,
        duration_api_ms: resultMsg.duration_api_ms,
        num_turns: resultMsg.num_turns,
        result: isSuccess ? (resultMsg as any).result : (resultMsg as any).errors?.join('; ') || 'Unknown error',
        session_id: resultMsg.session_id,
        total_cost_usd: resultMsg.total_cost_usd,
        usage: resultMsg.usage as any,
        modelUsage: resultMsg.modelUsage as any,
        uuid: resultMsg.uuid,
      };
    }

    // Ignore all other SDK message types (tool_progress, stream_event, status, hook, etc.)
    return null;
  }

  /**
   * @internal
   * Create root run from init message (used by TraceSession)
   */
  createRootRunInternal(initMsg: ClaudeMessage, startTime: number, traceId: string, rootRunId?: string): Run {
    const runId = rootRunId || initMsg.uuid || randomUUID();

    return {
      id: runId,
      name: this.name,
      run_type: 'chain',
      inputs: {
        tools: initMsg.tools || [],
        model: initMsg.model,
        session_id: initMsg.session_id,
        mcp_servers: initMsg.mcp_servers,
        agents: initMsg.agents,
        slash_commands: initMsg.slash_commands,
      },
      outputs: undefined,
      start_time: startTime,
      end_time: undefined,
      execution_order: 1,
      child_execution_order: 1,
      child_runs: [],
      events: [],
      trace_id: traceId,
      parent_run_id: undefined,
      tags: [],
      extra: {
        apiKeySource: initMsg.apiKeySource,
        claude_code_version: initMsg.claude_code_version,
        output_style: initMsg.output_style,
        permissionMode: initMsg.permissionMode,
      },
    } as Run;
  }

  /**
   * @internal
   * Create LLM run from assistant message (used by TraceSession)
   */
  createLLMRunInternal(
    msg: ClaudeMessage,
    rootRunId: string,
    traceId: string,
    order: number,
    startTime: number,
    isToolCall: boolean,
  ): Run {
    const runId = msg.uuid || randomUUID();
    const content = msg.message?.content || [];

    const textBlocks = content.filter((c) => c.type === 'text');
    const toolBlocks = content.filter((c) => c.type === 'tool_use');

    const inputs = {
      messages: textBlocks.map((c) => (c as any).text).filter(Boolean),
    };

    const outputs: any = {};
    if (isToolCall) {
      outputs.tool_calls = toolBlocks.map((c) => ({
        id: (c as any).id,
        name: (c as any).name,
        input: (c as any).input,
      }));
    } else {
      outputs.content = textBlocks.map((c) => (c as any).text).join('');
    }

    if (msg.message?.usage) {
      outputs.llmOutput = this.extractTokenUsage(msg.message.usage);
    }

    return {
      id: runId,
      name: 'LLM',
      run_type: 'llm',
      inputs,
      outputs,
      start_time: startTime,
      end_time: startTime,
      execution_order: order,
      child_execution_order: order,
      child_runs: [],
      events: [],
      trace_id: traceId,
      parent_run_id: rootRunId,
      tags: [],
      extra: {
        model: msg.message?.model,
      },
    } as Run;
  }

  /**
   * @internal
   * Create tool run at start (before result, used by TraceSession)
   */
  createToolRunStartInternal(
    toolUseBlock: ClaudeContentBlock,
    rootRunId: string,
    traceId: string,
    order: number,
    startTime: number,
  ): Run {
    const toolUse = toolUseBlock as any;
    const runId = randomUUID();

    return {
      id: runId,
      name: toolUse.name || 'Tool',
      run_type: 'tool',
      inputs: {
        tool_use_id: toolUse.id,
        ...toolUse.input,
      },
      outputs: undefined,
      start_time: startTime,
      end_time: undefined,
      execution_order: order,
      child_execution_order: order,
      child_runs: [],
      events: [],
      trace_id: traceId,
      parent_run_id: rootRunId,
      tags: [],
      extra: {
        tool_use_id: toolUse.id,
      },
    } as Run;
  }

  /**
   * @internal
   * Complete tool run with result (used by TraceSession)
   */
  completeToolRunInternal(toolRun: Run, toolResultBlock: ClaudeContentBlock, startTime: number): void {
    const result = toolResultBlock as any;
    toolRun.end_time = startTime;
    toolRun.outputs = {
      content: result.content,
    };

    if (result.is_error) {
      toolRun.error = typeof result.content === 'string' ? result.content : JSON.stringify(result.content);
    }
  }

  /**
   * Extract token usage from Claude SDK usage object into IRunCost format.
   */
  private extractTokenUsage(usage: ClaudeTokenUsage): IRunCost {
    const result: IRunCost = {};

    if (usage.input_tokens !== undefined) {
      result.promptTokens = usage.input_tokens;
    }
    if (usage.output_tokens !== undefined) {
      result.completionTokens = usage.output_tokens;
    }
    if (usage.cache_creation_input_tokens !== undefined) {
      result.cacheCreationInputTokens = usage.cache_creation_input_tokens;
    }
    if (usage.cache_read_input_tokens !== undefined) {
      result.cacheReadInputTokens = usage.cache_read_input_tokens;
    }

    const totalTokens = (usage.input_tokens || 0) + (usage.output_tokens || 0);
    if (totalTokens > 0) {
      result.totalTokens = totalTokens;
    }

    return result;
  }

  /**
   * @internal
   * Create run cost from result message (used by TraceSession)
   */
  createRunCostInternal(resultMsg: ClaudeMessage): IRunCost {
    const cost: IRunCost = resultMsg.usage ? this.extractTokenUsage(resultMsg.usage) : {};

    if (resultMsg.total_cost_usd !== undefined) {
      cost.totalCost = resultMsg.total_cost_usd;
    }

    return cost;
  }

  /**
   * @internal
   * Log trace - delegates to TracingService (used by TraceSession)
   */
  logTrace(run: Run, status: RunStatus): void {
    this.tracingService.logTrace(run, status, this.name, this.agentName);
  }
}
