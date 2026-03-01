import assert from 'node:assert';

import { FakeLLM } from '@langchain/core/utils/testing';
import { StateGraph, Annotation, START, END } from '@langchain/langgraph';
import { describe, it, beforeEach } from 'vitest';

import { LangGraphTracer } from '../src/LangGraphTracer.ts';
import { createMockTracingService } from './TestUtils.ts';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Extract the run JSON object from a tracing log line.
 * Log format: "[agent_run][...]:traceId=...,run={...JSON...}"
 */
function extractRunFromLog(log: string): any {
  const match = log.match(/,run=({.*})$/);
  return match ? JSON.parse(match[1]) : null;
}

/** Shared state schema for test graphs */
const GraphState = Annotation.Root({
  query: Annotation<string>,
  result: Annotation<string>,
});

describe('test/LangGraphTracer.test.ts', () => {
  let tracer: LangGraphTracer;
  let logs: string[] = [];

  beforeEach(() => {
    logs = [];
    process.env.FAAS_ENV = 'dev';

    const tracingService = createMockTracingService(logs);

    tracer = new LangGraphTracer();
    (tracer as any).tracingService = tracingService;
  });

  /** Helper: get only [agent_run] tracing logs */
  function getTracingLogs(): string[] {
    return logs.filter((log) => log.includes('[agent_run]'));
  }

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

      const tracingLogs = getTracingLogs();
      const startLogs = tracingLogs.filter((log) => log.includes('status=start'));
      const endLogs = tracingLogs.filter((log) => log.includes('status=end'));

      assert(startLogs.length >= 1, `Should have at least one start log, got ${startLogs.length}`);
      assert(endLogs.length >= 1, `Should have at least one end log, got ${endLogs.length}`);

      // Parse run data and verify run_type is chain (StateGraph nodes are chain runs)
      const chainStartLog = startLogs.find((log) => {
        const run = extractRunFromLog(log);
        return run && run.run_type === 'chain';
      });
      assert(chainStartLog, 'Should have a chain start log with run_type=chain');
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

      const tracingLogs = getTracingLogs();
      assert(tracingLogs.length > 0, 'Should have tracing logs');

      for (const log of tracingLogs) {
        const run = extractRunFromLog(log);
        if (!run) continue;
        assert(run.id, 'Run should have an id');
        assert(run.trace_id, 'Run should have a trace_id');
        assert(run.run_type, 'Run should have a run_type');
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

      const tracingLogs = getTracingLogs();

      // Collect all runs by parsing logs
      const runs: Array<{ run: any; status: string }> = [];
      for (const log of tracingLogs) {
        const statusMatch = log.match(/status=(\w+)/);
        const run = extractRunFromLog(log);
        if (run && statusMatch) {
          runs.push({ run, status: statusMatch[1] });
        }
      }

      const chainRuns = runs.filter((r) => r.run.run_type === 'chain');
      assert(chainRuns.length >= 2, `Should have at least 2 chain runs (root + child nodes), got ${chainRuns.length}`);

      // The graph root run should have no parent_run_id
      const rootRun = chainRuns.find((r) => !r.run.parent_run_id);
      assert(rootRun, 'Should have a root chain run (no parent_run_id)');

      // Child node runs should have parent_run_id
      const childRuns = chainRuns.filter((r) => r.run.parent_run_id);
      assert(childRuns.length >= 1, 'Should have at least one child chain run with parent_run_id');

      // Verify the log prefix correctly marks root vs child
      const rootLogs = tracingLogs.filter((log) => log.includes('type=root_run'));
      const childLogs = tracingLogs.filter((log) => log.includes('type=child_run'));
      assert(rootLogs.length >= 1, 'Should have root_run type logs');
      assert(childLogs.length >= 1, 'Should have child_run type logs');
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

      const tracingLogs = getTracingLogs();
      const traceIds = new Set<string>();

      for (const log of tracingLogs) {
        const run = extractRunFromLog(log);
        if (run?.trace_id) {
          traceIds.add(run.trace_id);
        }
      }

      assert(traceIds.size === 1, `All runs should share the same trace_id, got ${traceIds.size} distinct trace_ids`);
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

      const tracingLogs = getTracingLogs();

      const runs: Array<{ run: any; status: string }> = [];
      for (const log of tracingLogs) {
        const statusMatch = log.match(/status=(\w+)/);
        const run = extractRunFromLog(log);
        if (run && statusMatch) {
          runs.push({ run, status: statusMatch[1] });
        }
      }

      // Should have chain runs from the graph itself
      const chainRuns = runs.filter((r) => r.run.run_type === 'chain');
      assert(chainRuns.length >= 1, `Should have at least one chain run, got ${chainRuns.length}`);

      // Should have LLM runs from the FakeLLM invocation inside the node
      const llmRuns = runs.filter((r) => r.run.run_type === 'llm');
      assert(llmRuns.length >= 2, `Should have at least 2 LLM logs (start + end), got ${llmRuns.length}`);
    });
  });

  describe('StateGraph node error triggers onChainError', () => {
    it('should trigger error hook and include error status in log', async () => {
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

      const tracingLogs = getTracingLogs();

      // Should have a start log
      const startLogs = tracingLogs.filter((log) => log.includes('status=start'));
      assert(startLogs.length >= 1, 'Should have at least one start log before the error');

      // Should have an error log
      const errorLogs = tracingLogs.filter((log) => log.includes('status=error'));
      assert(errorLogs.length >= 1, `Should have at least one error log, got ${errorLogs.length}`);

      // Verify the error run has the correct error field
      const errorRun = extractRunFromLog(errorLogs[0]);
      assert(errorRun, 'Should be able to parse error run from log');
      assert(errorRun.error, 'Error run should have error field set');
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

      const tracingLogs = getTracingLogs();
      assert(tracingLogs.length > 0, 'Should have tracing logs');

      for (const log of tracingLogs) {
        const run = extractRunFromLog(log);
        if (!run) continue;

        // Core fields must be present
        assert(typeof run.id === 'string' && run.id.length > 0, 'Run must have non-empty id');
        assert(typeof run.trace_id === 'string' && run.trace_id.length > 0, 'Run must have non-empty trace_id');
        assert(typeof run.run_type === 'string', 'Run must have run_type');
        assert(typeof run.name === 'string', 'Run must have name');

        // Log prefix must contain traceId and run_id
        assert(log.includes(`traceId=${run.trace_id}`), 'Log prefix must include traceId');
        assert(log.includes(`run_id=${run.id}`), 'Log prefix must include run_id');
      }
    });

    it('should produce end runs with non-null outputs or OSS reference', async () => {
      const graph = new StateGraph(GraphState)
        .addNode('output_node', (state: typeof GraphState.State) => {
          return { result: `output for ${state.query}` };
        })
        .addEdge(START, 'output_node')
        .addEdge('output_node', END)
        .compile();

      await graph.invoke({ query: 'output test', result: '' }, { callbacks: [tracer] });

      await sleep(500);

      const endLogs = getTracingLogs().filter((log) => log.includes('status=end'));
      assert(endLogs.length >= 1, 'Should have end logs');

      for (const log of endLogs) {
        const run = extractRunFromLog(log);
        if (!run) continue;
        // Outputs should be uploaded to OSS, so the field should be an IResource
        if (run.outputs) {
          assert(
            run.outputs.key || typeof run.outputs === 'object',
            'End run outputs should be present (as OSS resource or object)',
          );
        }
      }
    });
  });
});
