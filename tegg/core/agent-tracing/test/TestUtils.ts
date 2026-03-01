import type { Logger } from '@eggjs/tegg-types';

import { TracingService } from '../src/TracingService.ts';

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

export function createMockBackgroundTaskHelper(): { run: (fn: () => Promise<any>) => Promise<any> } {
  return {
    run: async (fn: () => Promise<any>) => fn(),
  };
}

export function createMockTracingService(logs?: string[]): TracingService {
  const tracingService = new TracingService();
  (tracingService as any).logger = createMockLogger(logs);
  (tracingService as any).backgroundTaskHelper = createMockBackgroundTaskHelper();
  return tracingService;
}
