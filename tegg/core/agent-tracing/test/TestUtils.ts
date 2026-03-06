import type { Logger } from '@eggjs/tegg-types';
import type { Run } from '@langchain/core/tracers/base';

import { TracingService } from '../src/TracingService.ts';

export interface CapturedEntry {
  run: Run;
  status: string;
  name: string;
  agentName: string;
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
    configure: () => {},
    logTrace: (run: Run, status: string, name: string, agentName: string) => {
      capturedRuns.push({ run, status, name, agentName });
    },
  } as unknown as TracingService;
  return { tracingService, capturedRuns };
}
