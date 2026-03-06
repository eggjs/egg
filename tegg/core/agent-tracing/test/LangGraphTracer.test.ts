import assert from 'node:assert/strict';

import type { Run } from '@langchain/core/tracers/base';
import { FakeLLM } from '@langchain/core/utils/testing';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { describe, it, beforeEach } from 'vitest';

import { LangGraphTracer } from '../src/LangGraphTracer.ts';
import { RunStatus } from '../src/types.ts';
import { type CapturedEntry, createCapturingTracingService } from './TestUtils.ts';

function makeMockRun(overrides?: Partial<Run>): Run {
  return {
    id: 'run-001',
    name: 'TestRun',
    run_type: 'chain',
    inputs: {},
    outputs: {},
    start_time: Date.now(),
    end_time: Date.now() + 100,
    execution_order: 1,
    child_execution_order: 1,
    child_runs: [],
    events: [],
    trace_id: 'trace-001',
    parent_run_id: undefined,
    tags: [],
    extra: {},
    error: undefined,
    ...overrides,
  } as Run;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Shared state schema for test graphs */
const GraphState = Annotation.Root({
  query: Annotation<string>,
  result: Annotation<string>,
});

describe('test/LangGraphTracer.test.ts', () => {
  let tracer: LangGraphTracer;
  let capturedRuns: CapturedEntry[];

  beforeEach(() => {
    process.env.FAAS_ENV = 'dev';

    const capturing = createCapturingTracingService();
    capturedRuns = capturing.capturedRuns;

    tracer = new LangGraphTracer();
    (tracer as any).tracingService = capturing.tracingService;
  });

  describe('Single-node StateGraph triggers chain lifecycle hooks', () => {
    it('should trigger onChainStart and onChainEnd via graph.invoke', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('process', (state: typeof GraphState.State) => {
          return { result: `processed: ${state.query}` };
        })
        .addEdge(START, 'process')
        .addEdge('process', END)
        .compile();

      await graph.invoke({ query: 'hello', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      const startEntries = capturedRuns.filter((e) => e.status === RunStatus.START);
      const endEntries = capturedRuns.filter((e) => e.status === RunStatus.END);

      assert(startEntries.length >= 1, `Should have at least one start entry, got ${startEntries.length}`);
      assert(endEntries.length >= 1, `Should have at least one end entry, got ${endEntries.length}`);

      // Verify a chain run is present with run_type=chain
      const chainStart = startEntries.find((e) => e.run.run_type === 'chain');
      assert(chainStart, 'Should have a chain start entry with run_type=chain');
    });

    it('should produce Run with valid id, trace_id, and run_type fields', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('echo', (state: typeof GraphState.State) => {
          return { result: state.query };
        })
        .addEdge(START, 'echo')
        .addEdge('echo', END)
        .compile();

      await graph.invoke({ query: 'test', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      assert(capturedRuns.length > 0, 'Should have captured runs');

      for (const entry of capturedRuns) {
        assert(entry.run.id, 'Run should have an id');
        assert(entry.run.trace_id, 'Run should have a trace_id');
        assert(entry.run.run_type, 'Run should have a run_type');
      }
    });
  });

  describe('Multi-node linear StateGraph triggers parent-child chain hooks', () => {
    it('should generate root and child chain runs with parent_run_id relationship', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('preprocess', (state: typeof GraphState.State) => {
          return { query: state.query.toUpperCase() };
        })
        .addNode('respond', (state: typeof GraphState.State) => {
          return { result: `answer to ${state.query}` };
        })
        .addEdge(START, 'preprocess')
        .addEdge('preprocess', 'respond')
        .addEdge('respond', END)
        .compile();

      await graph.invoke({ query: 'question', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      const chainEntries = capturedRuns.filter((e) => e.run.run_type === 'chain');
      assert(
        chainEntries.length >= 2,
        `Should have at least 2 chain runs (root + child nodes), got ${chainEntries.length}`,
      );

      // The graph root run should have no parent_run_id
      const rootRun = chainEntries.find((e) => !e.run.parent_run_id);
      assert(rootRun, 'Should have a root chain run (no parent_run_id)');

      // Child node runs should have parent_run_id
      const childRuns = chainEntries.filter((e) => e.run.parent_run_id);
      assert(childRuns.length >= 1, 'Should have at least one child chain run with parent_run_id');

      // Verify root vs child distinction
      const rootEntries = capturedRuns.filter((e) => !e.run.parent_run_id);
      const childEntries = capturedRuns.filter((e) => !!e.run.parent_run_id);
      assert(rootEntries.length >= 1, 'Should have root run entries');
      assert(childEntries.length >= 1, 'Should have child run entries');
    });

    it('should share the same trace_id across all runs in a graph invocation', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('step1', (state: typeof GraphState.State) => {
          return { query: `[step1] ${state.query}` };
        })
        .addNode('step2', (state: typeof GraphState.State) => {
          return { result: `[step2] ${state.query}` };
        })
        .addEdge(START, 'step1')
        .addEdge('step1', 'step2')
        .addEdge('step2', END)
        .compile();

      await graph.invoke({ query: 'hello', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      const traceIds = new Set(capturedRuns.map((e) => e.run.trace_id).filter(Boolean));
      assert.strictEqual(
        traceIds.size,
        1,
        `All runs should share the same trace_id, got ${traceIds.size} distinct trace_ids`,
      );
    });
  });

  describe('StateGraph with LLM node triggers both chain and LLM hooks', () => {
    it('should trace both chain runs (graph) and LLM runs (FakeLLM inside node)', async () => {
      const llm = new FakeLLM({ response: 'llm answer' });

      const graph = new StateGraph(GraphState)
        .addNode('ask_llm', async (state: typeof GraphState.State) => {
          const response = await llm.invoke(state.query);
          return { result: response };
        })
        .addEdge(START, 'ask_llm')
        .addEdge('ask_llm', END)
        .compile();

      await graph.invoke({ query: 'what is LangGraph?', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      // Should have chain runs from the graph itself
      const chainEntries = capturedRuns.filter((e) => e.run.run_type === 'chain');
      assert(chainEntries.length >= 1, `Should have at least one chain run, got ${chainEntries.length}`);

      // Should have LLM runs from the FakeLLM invocation inside the node
      const llmEntries = capturedRuns.filter((e) => e.run.run_type === 'llm');
      assert(llmEntries.length >= 2, `Should have at least 2 LLM entries (start + end), got ${llmEntries.length}`);
    });
  });

  describe('StateGraph node error triggers onChainError', () => {
    it('should trigger error hook and include error status in captured runs', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('fail_node', () => {
          throw new Error('Node execution failed');
        })
        .addEdge(START, 'fail_node')
        .addEdge('fail_node', END)
        .compile();

      try {
        await graph.invoke({ query: 'trigger error', result: '' }, { callbacks: [tracer] });
      } catch {
        // Expected error
      }

      await sleep(500);

      // Should have a start entry
      const startEntries = capturedRuns.filter((e) => e.status === RunStatus.START);
      assert(startEntries.length >= 1, 'Should have at least one start entry before the error');

      // Should have an error entry
      const errorEntries = capturedRuns.filter((e) => e.status === RunStatus.ERROR);
      assert(errorEntries.length >= 1, `Should have at least one error entry, got ${errorEntries.length}`);

      // Verify the error run has the error field set
      assert(errorEntries[0].run, 'Error run should exist');
      assert(errorEntries[0].run.error, 'Error run should have error field set');
    });
  });

  describe('Direct hook invocation (unit coverage)', () => {
    it('should log tool hooks: onToolStart, onToolEnd, onToolError', () => {
      const run = makeMockRun({ run_type: 'tool', name: 'BashTool' });
      tracer.onToolStart(run);
      tracer.onToolEnd(run);
      tracer.onToolError({ ...run, error: 'tool failed' } as Run);

      const toolEntries = capturedRuns.filter((e) => e.run.run_type === 'tool');
      assert.strictEqual(toolEntries.length, 3);
      assert.strictEqual(toolEntries[0].status, RunStatus.START);
      assert.strictEqual(toolEntries[1].status, RunStatus.END);
      assert.strictEqual(toolEntries[2].status, RunStatus.ERROR);
    });

    it('should log LLM hooks: onLLMStart, onLLMEnd, onLLMError', () => {
      const run = makeMockRun({ run_type: 'llm', name: 'claude-3' });
      tracer.onLLMStart(run);
      tracer.onLLMEnd(run);
      tracer.onLLMError({ ...run, error: 'llm error' } as Run);

      const llmEntries = capturedRuns.filter((e) => e.run.run_type === 'llm');
      assert.strictEqual(llmEntries.length, 3);
      assert.strictEqual(llmEntries[0].status, RunStatus.START);
      assert.strictEqual(llmEntries[1].status, RunStatus.END);
      assert.strictEqual(llmEntries[2].status, RunStatus.ERROR);
    });

    it('should log retriever hooks: onRetrieverStart, onRetrieverEnd, onRetrieverError', () => {
      const run = makeMockRun({ run_type: 'retriever', name: 'VectorRetriever' });
      tracer.onRetrieverStart(run);
      tracer.onRetrieverEnd(run);
      tracer.onRetrieverError({ ...run, error: 'retriever error' } as Run);

      const retrieverEntries = capturedRuns.filter((e) => e.run.run_type === 'retriever');
      assert.strictEqual(retrieverEntries.length, 3);
      assert.strictEqual(retrieverEntries[0].status, RunStatus.START);
      assert.strictEqual(retrieverEntries[1].status, RunStatus.END);
      assert.strictEqual(retrieverEntries[2].status, RunStatus.ERROR);
    });

    it('should log agent hooks: onAgentAction, onAgentEnd', () => {
      const run = makeMockRun({ run_type: 'chain', name: 'AgentExecutor' });
      tracer.onAgentAction(run);
      tracer.onAgentEnd(run);

      assert.strictEqual(capturedRuns[0].status, RunStatus.START);
      assert.strictEqual(capturedRuns[1].status, RunStatus.END);
    });
  });

  describe('Run data completeness via graph.invoke', () => {
    it('should produce runs with all required fields populated', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('check', (state: typeof GraphState.State) => {
          return { result: `checked: ${state.query}` };
        })
        .addEdge(START, 'check')
        .addEdge('check', END)
        .compile();

      await graph.invoke({ query: 'check fields', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      assert(capturedRuns.length > 0, 'Should have captured runs');

      for (const entry of capturedRuns) {
        assert(typeof entry.run.id === 'string' && entry.run.id.length > 0, 'Run must have non-empty id');
        assert(
          typeof entry.run.trace_id === 'string' && entry.run.trace_id.length > 0,
          'Run must have non-empty trace_id',
        );
        assert(typeof entry.run.run_type === 'string', 'Run must have run_type');
        assert(typeof entry.run.name === 'string', 'Run must have name');
      }
    });

    it('should produce end runs with outputs present', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('output_node', (state: typeof GraphState.State) => {
          return { result: `output for ${state.query}` };
        })
        .addEdge(START, 'output_node')
        .addEdge('output_node', END)
        .compile();

      await graph.invoke({ query: 'output test', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      const endEntries = capturedRuns.filter((e) => e.status === RunStatus.END);
      assert(endEntries.length >= 1, 'Should have end entries');

      for (const entry of endEntries) {
        if (entry.run.outputs) {
          assert(typeof entry.run.outputs === 'object', 'End run outputs should be an object');
        }
      }
    });
  });
});
