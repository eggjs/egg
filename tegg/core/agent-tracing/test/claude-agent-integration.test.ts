import assert from 'node:assert';

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, it } from 'vitest';

import { ClaudeAgentTracer } from '../src/ClaudeAgentTracer.ts';
import { createMockLogger, createMockTracingService } from './test-utils.ts';

// ---------- Tracing log helpers ----------

function extractRunFromLog(log: string): any {
  const match = log.match(/,run=({.*})$/);
  return match ? JSON.parse(match[1]) : null;
}

function extractStatus(log: string): string | null {
  const match = log.match(/status=(\w+)/);
  return match ? match[1] : null;
}

function extractRunType(log: string): string | null {
  const match = log.match(/type=(root_run|child_run)/);
  return match ? match[1] : null;
}

// ---------- Shared setup ----------

function createTestEnv() {
  const logs: string[] = [];
  process.env.FAAS_ENV = 'dev';

  const mockLogger = createMockLogger(logs);
  const tracingService = createMockTracingService(logs);

  const claudeTracer = new ClaudeAgentTracer();
  (claudeTracer as any).logger = mockLogger;
  (claudeTracer as any).tracingService = tracingService;

  function getTracingLogs(): string[] {
    return logs.filter((log) => log.includes('[agent_run][ClaudeAgentTracer]'));
  }

  function parseAllRuns(): Array<{ run: any; status: string; logType: string }> {
    const entries: Array<{ run: any; status: string; logType: string }> = [];
    for (const log of getTracingLogs()) {
      const run = extractRunFromLog(log);
      const status = extractStatus(log);
      const logType = extractRunType(log);
      if (run && status && logType) {
        entries.push({ run, status, logType });
      }
    }
    return entries;
  }

  return { logs, claudeTracer, parseAllRuns, getTracingLogs };
}

// ---------- Mock data factories ----------

function createMockInit(overrides?: Partial<any>): SDKMessage {
  return {
    type: 'system',
    subtype: 'init',
    session_id: 'test-session-001',
    uuid: 'uuid-init',
    tools: ['Bash', 'Read'],
    model: 'claude-sonnet-4-5-20250929',
    cwd: '/test',
    mcp_servers: [],
    permissionMode: 'default',
    apiKeySource: 'api_key',
    claude_code_version: '1.0.0',
    output_style: 'text',
    slash_commands: [],
    skills: [],
    plugins: [],
    ...overrides,
  } as unknown as SDKMessage;
}

function createMockAssistantWithTool(overrides?: Partial<any>): SDKMessage {
  return {
    type: 'assistant',
    uuid: 'uuid-assistant-tool',
    session_id: 'test-session-001',
    parent_tool_use_id: null,
    message: {
      id: 'msg_1',
      type: 'message',
      role: 'assistant',
      content: [
        { type: 'text', text: 'Let me run that command for you.' },
        { type: 'tool_use', id: 'tu_1', name: 'Bash', input: { command: 'echo hello' } },
      ],
      model: 'claude-sonnet-4-5-20250929',
      usage: { input_tokens: 100, output_tokens: 50 },
      stop_reason: 'tool_use',
    },
    ...overrides,
  } as unknown as SDKMessage;
}

function createMockUserToolResult(overrides?: Partial<any>): SDKMessage {
  return {
    type: 'user',
    uuid: 'uuid-user-result',
    session_id: 'test-session-001',
    parent_tool_use_id: null,
    message: {
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: 'tu_1',
          content: 'hello',
          is_error: false,
        },
      ],
    },
    ...overrides,
  } as unknown as SDKMessage;
}

function createMockAssistantTextOnly(overrides?: Partial<any>): SDKMessage {
  return {
    type: 'assistant',
    uuid: 'uuid-assistant-text',
    session_id: 'test-session-001',
    parent_tool_use_id: null,
    message: {
      id: 'msg_2',
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text: 'The answer is 21.' }],
      model: 'claude-sonnet-4-5-20250929',
      usage: { input_tokens: 80, output_tokens: 30 },
      stop_reason: 'end_turn',
    },
    ...overrides,
  } as unknown as SDKMessage;
}

function createMockResult(overrides?: Partial<any>): SDKMessage {
  return {
    type: 'result',
    subtype: 'success',
    session_id: 'test-session-001',
    uuid: 'uuid-result',
    is_error: false,
    duration_ms: 1500,
    duration_api_ms: 1200,
    num_turns: 1,
    result: 'hello',
    stop_reason: null,
    total_cost_usd: 0.003,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    modelUsage: {},
    permission_denials: [],
    ...overrides,
  } as unknown as SDKMessage;
}

// Noise messages that should be filtered out
function createMockToolProgress(): SDKMessage {
  return {
    type: 'tool_progress',
    tool_use_id: 'tu_1',
    tool_name: 'Bash',
    parent_tool_use_id: null,
    elapsed_time_seconds: 0.5,
    uuid: 'uuid-progress',
    session_id: 'test-session-001',
  } as unknown as SDKMessage;
}

function createMockStreamEvent(): SDKMessage {
  return {
    type: 'stream_event',
    event: { type: 'content_block_start', index: 0, content_block: { type: 'text', text: '' } },
    parent_tool_use_id: null,
    uuid: 'uuid-stream',
    session_id: 'test-session-001',
  } as unknown as SDKMessage;
}

// ---------- Tests ----------

describe('egg-agent-tracing/test/claude-agent-integration.test.ts', () => {
  describe('Streaming mode + tool use', () => {
    it('should trace tool execution with session.processMessage', async () => {
      const { claudeTracer, parseAllRuns } = createTestEnv();
      const session = claudeTracer.createSession();

      // Feed messages one-by-one, including noise messages that should be filtered
      const messages: SDKMessage[] = [
        createMockInit(),
        createMockStreamEvent(), // noise — should be ignored
        createMockAssistantWithTool(),
        createMockToolProgress(), // noise — should be ignored
        createMockUserToolResult(),
        createMockResult(),
      ];

      for (const msg of messages) {
        await session.processMessage(msg);
      }

      const entries = parseAllRuns();

      // Root run start + end
      const rootStart = entries.find((e) => e.logType === 'root_run' && e.status === 'start');
      assert(rootStart, 'Should have root_run start');
      assert.strictEqual(rootStart!.run.run_type, 'chain');

      const rootEnd = entries.find((e) => e.logType === 'root_run' && e.status === 'end');
      assert(rootEnd, 'Should have root_run end');

      // LLM child run
      const llmRuns = entries.filter((e) => e.logType === 'child_run' && e.run.run_type === 'llm');
      assert(llmRuns.length >= 1, `Should have >= 1 LLM run, got ${llmRuns.length}`);

      // Tool child run start + end
      const toolRuns = entries.filter((e) => e.logType === 'child_run' && e.run.run_type === 'tool');
      assert(toolRuns.length >= 2, `Should have >= 2 tool run entries (start+end), got ${toolRuns.length}`);

      const toolStart = toolRuns.find((e) => e.status === 'start');
      assert(toolStart, 'Should have tool start');
      assert.strictEqual(toolStart!.run.name, 'Bash');

      const toolEnd = toolRuns.find((e) => e.status === 'end');
      assert(toolEnd, 'Should have tool end');

      // All runs share the same trace_id = session_id
      const traceIds = new Set(entries.map((e) => e.run.trace_id));
      assert.strictEqual(traceIds.size, 1, `All runs should share one trace_id, got ${traceIds.size}`);
      assert.strictEqual([...traceIds][0], 'test-session-001', 'trace_id should match session_id');

      // Child runs reference root run as parent
      const childEntries = entries.filter((e) => e.logType === 'child_run');
      for (const child of childEntries) {
        assert.strictEqual(
          child.run.parent_run_id,
          rootStart!.run.id,
          `Child run ${child.run.name} should reference root as parent`,
        );
      }

      // Cost data on root end
      const cost = rootEnd!.run.cost;
      assert(cost, 'Root end should have cost');
      assert.strictEqual(cost.promptTokens, 100);
      assert.strictEqual(cost.completionTokens, 50);
      assert.strictEqual(cost.totalCost, 0.003);
    });
  });

  describe('Batch mode + text-only', () => {
    it('should trace a text-only response via processMessages', async () => {
      const { claudeTracer, parseAllRuns } = createTestEnv();

      const messages: SDKMessage[] = [
        createMockInit(),
        createMockAssistantTextOnly(),
        createMockResult({
          usage: {
            input_tokens: 80,
            output_tokens: 30,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          total_cost_usd: 0.002,
        }),
      ];

      await claudeTracer.processMessages(messages);

      const entries = parseAllRuns();
      assert(entries.length > 0, 'Should have tracing entries');

      // Root run start + end
      const rootEntries = entries.filter((e) => e.logType === 'root_run');
      assert(rootEntries.length >= 2, `Should have root start + end, got ${rootEntries.length}`);

      const rootEnd = rootEntries.find((e) => e.status === 'end');
      assert(rootEnd, 'Should have root end');

      // LLM child run with text content
      const llmRuns = entries.filter((e) => e.logType === 'child_run' && e.run.run_type === 'llm');
      assert(llmRuns.length >= 1, `Should have >= 1 LLM run, got ${llmRuns.length}`);

      // No tool runs
      const toolRuns = entries.filter((e) => e.logType === 'child_run' && e.run.run_type === 'tool');
      assert.strictEqual(toolRuns.length, 0, 'Should have no tool runs for text-only');

      // Cost and token counts
      const cost = rootEnd!.run.cost;
      assert(cost, 'Should have cost');
      assert.strictEqual(cost.promptTokens, 80);
      assert.strictEqual(cost.completionTokens, 30);
      assert.strictEqual(cost.totalTokens, 110);
      assert.strictEqual(cost.totalCost, 0.002);

      // trace_id consistency
      const traceIds = new Set(entries.map((e) => e.run.trace_id));
      assert.strictEqual(traceIds.size, 1, 'All runs should share one trace_id');
    });
  });

  describe('Error scenario', () => {
    it('should trace an error result with ERROR status', async () => {
      const { claudeTracer, parseAllRuns } = createTestEnv();
      const session = claudeTracer.createSession();

      const messages: SDKMessage[] = [
        createMockInit(),
        createMockAssistantTextOnly(),
        {
          type: 'result',
          subtype: 'error_during_execution',
          session_id: 'test-session-001',
          uuid: 'uuid-result-err',
          is_error: true,
          duration_ms: 500,
          duration_api_ms: 400,
          num_turns: 1,
          stop_reason: null,
          total_cost_usd: 0.001,
          errors: ['Something went wrong', 'Another error'],
          usage: {
            input_tokens: 50,
            output_tokens: 10,
            cache_creation_input_tokens: 0,
            cache_read_input_tokens: 0,
          },
          modelUsage: {},
          permission_denials: [],
        } as unknown as SDKMessage,
      ];

      for (const msg of messages) {
        await session.processMessage(msg);
      }

      const entries = parseAllRuns();

      // Root run should end with ERROR status
      const rootEnd = entries.find((e) => e.logType === 'root_run' && e.status === 'error');
      assert(rootEnd, 'Should have root_run with error status');

      // The root run should have error field populated
      // (error is extracted from result message via convertSDKMessage)
      assert(rootEnd!.run, 'Root end run should exist');
    });
  });
});
