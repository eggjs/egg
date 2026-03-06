import assert from 'node:assert/strict';

import type { SDKMessage } from '@anthropic-ai/claude-agent-sdk';
import { describe, it } from 'vitest';

import { ClaudeAgentTracer } from '../src/ClaudeAgentTracer.ts';
import { RunStatus } from '../src/types.ts';
import { createMockLogger, createCapturingTracingService } from './TestUtils.ts';

// ---------- Shared setup ----------

function createTestEnv() {
  process.env.FAAS_ENV = 'dev';

  const { tracingService, capturedRuns } = createCapturingTracingService();
  const mockLogger = createMockLogger();

  const claudeTracer = new ClaudeAgentTracer();
  (claudeTracer as any).logger = mockLogger;
  (claudeTracer as any).tracingService = tracingService;

  return { claudeTracer, capturedRuns };
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

describe('test/ClaudeAgentTracer.test.ts', () => {
  describe('Streaming mode + tool use', () => {
    it('should trace tool execution with session.processMessage', async () => {
      const { claudeTracer, capturedRuns } = createTestEnv();
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

      // Root run start + end
      const rootStart = capturedRuns.find((e) => !e.run.parent_run_id && e.status === RunStatus.START);
      assert(rootStart, 'Should have root_run start');
      assert.strictEqual(rootStart.run.run_type, 'chain');

      const rootEnd = capturedRuns.find((e) => !e.run.parent_run_id && e.status === RunStatus.END);
      assert(rootEnd, 'Should have root_run end');

      // LLM child run
      const llmRuns = capturedRuns.filter((e) => !!e.run.parent_run_id && e.run.run_type === 'llm');
      assert(llmRuns.length >= 1, `Should have >= 1 LLM run, got ${llmRuns.length}`);

      // Tool child run start + end
      const toolRuns = capturedRuns.filter((e) => !!e.run.parent_run_id && e.run.run_type === 'tool');
      assert(toolRuns.length >= 2, `Should have >= 2 tool run entries (start+end), got ${toolRuns.length}`);

      const toolStart = toolRuns.find((e) => e.status === RunStatus.START);
      assert(toolStart, 'Should have tool start');
      assert.strictEqual(toolStart.run.name, 'Bash');

      const toolEnd = toolRuns.find((e) => e.status === RunStatus.END);
      assert(toolEnd, 'Should have tool end');

      // All runs share the same trace_id = session_id
      const traceIds = new Set(capturedRuns.map((e) => e.run.trace_id));
      assert.strictEqual(traceIds.size, 1, `All runs should share one trace_id, got ${traceIds.size}`);
      assert.strictEqual([...traceIds][0], 'test-session-001', 'trace_id should match session_id');

      // Child runs reference root run as parent
      const childEntries = capturedRuns.filter((e) => !!e.run.parent_run_id);
      for (const child of childEntries) {
        assert.strictEqual(
          child.run.parent_run_id,
          rootStart.run.id,
          `Child run ${child.run.name} should reference root as parent`,
        );
      }

      // Cost data on root end
      const llmOutput = (rootEnd.run.outputs as any)?.llmOutput;
      assert(llmOutput, 'Root end should have llmOutput');
      assert.strictEqual(llmOutput.promptTokens, 100);
      assert.strictEqual(llmOutput.completionTokens, 50);
      assert.strictEqual(llmOutput.totalCost, 0.003);
    });
  });

  describe('Batch mode + text-only', () => {
    it('should trace a text-only response via processMessages', async () => {
      const { claudeTracer, capturedRuns } = createTestEnv();

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

      assert(capturedRuns.length > 0, 'Should have tracing entries');

      // Root run start + end
      const rootEntries = capturedRuns.filter((e) => !e.run.parent_run_id);
      assert(rootEntries.length >= 2, `Should have root start + end, got ${rootEntries.length}`);

      const rootEnd = rootEntries.find((e) => e.status === RunStatus.END);
      assert(rootEnd, 'Should have root end');

      // LLM child run with text content
      const llmRuns = capturedRuns.filter((e) => !!e.run.parent_run_id && e.run.run_type === 'llm');
      assert(llmRuns.length >= 1, `Should have >= 1 LLM run, got ${llmRuns.length}`);

      // No tool runs
      const toolRuns = capturedRuns.filter((e) => !!e.run.parent_run_id && e.run.run_type === 'tool');
      assert.strictEqual(toolRuns.length, 0, 'Should have no tool runs for text-only');

      // Cost and token counts
      const llmOutput = (rootEnd.run.outputs as any)?.llmOutput;
      assert(llmOutput, 'Should have llmOutput');
      assert.strictEqual(llmOutput.promptTokens, 80);
      assert.strictEqual(llmOutput.completionTokens, 30);
      assert.strictEqual(llmOutput.totalTokens, 110);
      assert.strictEqual(llmOutput.totalCost, 0.002);

      // trace_id consistency
      const traceIds = new Set(capturedRuns.map((e) => e.run.trace_id));
      assert.strictEqual(traceIds.size, 1, 'All runs should share one trace_id');
    });
  });

  describe('Error scenario', () => {
    it('should trace an error result with ERROR status', async () => {
      const { claudeTracer, capturedRuns } = createTestEnv();
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

      // Root run should end with ERROR status
      const rootError = capturedRuns.find((e) => !e.run.parent_run_id && e.status === RunStatus.ERROR);
      assert(rootError, 'Should have root_run with error status');
      assert(rootError.run, 'Root error run should exist');
    });
  });
});
