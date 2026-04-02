import type { Logger } from '@eggjs/tegg-types';
import type { Run } from '@langchain/core/tracers/base';

import { TracingService } from '../src/TracingService.ts';

export interface CapturedEntry {
  run: Run;
  status: string;
  name: string;
  agentName: string;
}

export function createMockRun(overrides?: Partial<Run>): Run {
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

export function createMockLogger(logs?: string[]): Logger {
  return {
    info: (msg: string) => {
      logs?.push(msg);
    },
    warn: (msg: string) => {
      logs?.push(msg);
    },
    error: (msg: string) => {
      logs?.push(msg);
    },
  } as unknown as Logger;
}

/**
 * Create a mock TracingService that captures Run objects directly.
 * Use capturedRuns to assert on traced runs without parsing log strings.
 */
export function createCapturingTracingService(): {
  tracingService: TracingService;
  capturedRuns: CapturedEntry[];
} {
  const capturedRuns: CapturedEntry[] = [];
  const tracingService = {
    logTrace: (run: Run, status: string, name: string, agentName: string) => {
      capturedRuns.push({ run, status, name, agentName });
    },
  } as unknown as TracingService;
  return { tracingService, capturedRuns };
}
