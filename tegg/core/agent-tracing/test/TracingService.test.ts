import assert from 'node:assert/strict';

import type { Run } from '@langchain/core/tracers/base';
import { afterEach, beforeEach, describe, it } from 'vitest';

import { TracingService } from '../src/TracingService.ts';
import { RunStatus } from '../src/types.ts';

// ---------- Helpers ----------

function makeRun(overrides?: Partial<Run>): Run {
  return {
    id: 'run-001',
    name: 'TestRun',
    run_type: 'chain',
    inputs: { query: 'hello' },
    outputs: { result: 'ok' },
    start_time: 1000,
    end_time: 2000,
    execution_order: 1,
    child_execution_order: 1,
    child_runs: [],
    events: [],
    trace_id: 'trace-abc',
    parent_run_id: undefined,
    tags: [],
    extra: {},
    ...overrides,
  } as Run;
}

function makeTracingService({
  withOss = true,
  withLogService = true,
}: {
  withOss?: boolean;
  withLogService?: boolean;
} = {}) {
  const infoLogs: string[] = [];
  const warnLogs: string[] = [];
  const ossPuts: Array<{ key: string; content: string }> = [];
  const logServiceSends: string[] = [];

  const service = new TracingService();

  (service as any).logger = {
    info: (msg: string) => infoLogs.push(msg),
    warn: (...args: unknown[]) => warnLogs.push(args.join(' ')),
    error: (msg: string) => warnLogs.push(msg),
  };

  (service as any).backgroundTaskHelper = {
    run: async (fn: () => Promise<void>) => fn(),
  };

  if (withOss) {
    (service as any).ossClient = {
      put: async (key: string, content: Buffer) => {
        ossPuts.push({ key, content: content.toString() });
      },
    };
  }

  if (withLogService) {
    (service as any).logServiceClient = {
      send: async (log: string) => {
        logServiceSends.push(log);
      },
    };
  }

  return { service, infoLogs, warnLogs, ossPuts, logServiceSends };
}

// ---------- Tests ----------

describe('test/TracingService.test.ts', () => {
  let originalFaasEnv: string | undefined;
  let originalServerEnv: string | undefined;

  beforeEach(() => {
    originalFaasEnv = process.env.FAAS_ENV;
    originalServerEnv = process.env.SERVER_ENV;
  });

  afterEach(() => {
    if (originalFaasEnv === undefined) {
      delete process.env.FAAS_ENV;
    } else {
      process.env.FAAS_ENV = originalFaasEnv;
    }
    if (originalServerEnv === undefined) {
      delete process.env.SERVER_ENV;
    } else {
      process.env.SERVER_ENV = originalServerEnv;
    }
  });

  describe('getEnv()', () => {
    it('should return FAAS_ENV when set', () => {
      process.env.FAAS_ENV = 'prod';
      delete process.env.SERVER_ENV;
      const { service } = makeTracingService();
      assert.strictEqual(service.getEnv(), 'prod');
    });

    it('should fall back to SERVER_ENV when FAAS_ENV is not set', () => {
      delete process.env.FAAS_ENV;
      process.env.SERVER_ENV = 'gray';
      const { service } = makeTracingService();
      assert.strictEqual(service.getEnv(), 'gray');
    });

    it('should normalize prepub to pre', () => {
      delete process.env.FAAS_ENV;
      process.env.SERVER_ENV = 'prepub';
      const { service } = makeTracingService();
      assert.strictEqual(service.getEnv(), 'pre');
    });

    it('should default to local when neither env var is set', () => {
      delete process.env.FAAS_ENV;
      delete process.env.SERVER_ENV;
      const { service } = makeTracingService();
      assert.strictEqual(service.getEnv(), 'local');
    });
  });

  describe('isOnlineEnv()', () => {
    it('should return true for prod', () => {
      process.env.FAAS_ENV = 'prod';
      const { service } = makeTracingService();
      assert.strictEqual(service.isOnlineEnv(), true);
    });

    it('should return true for pre', () => {
      process.env.FAAS_ENV = 'pre';
      const { service } = makeTracingService();
      assert.strictEqual(service.isOnlineEnv(), true);
    });

    it('should return true for gray', () => {
      process.env.FAAS_ENV = 'gray';
      const { service } = makeTracingService();
      assert.strictEqual(service.isOnlineEnv(), true);
    });

    it('should return false for local', () => {
      delete process.env.FAAS_ENV;
      delete process.env.SERVER_ENV;
      const { service } = makeTracingService();
      assert.strictEqual(service.isOnlineEnv(), false);
    });

    it('should return false for dev', () => {
      process.env.FAAS_ENV = 'dev';
      const { service } = makeTracingService();
      assert.strictEqual(service.isOnlineEnv(), false);
    });
  });

  describe('getLogInfoPrefix()', () => {
    it('should format prefix for root run with FAAS_ENV set', () => {
      process.env.FAAS_ENV = 'prod';
      const { service } = makeTracingService();
      const run = makeRun({ trace_id: 'trace-xyz', id: 'run-123', parent_run_id: undefined });
      const prefix = service.getLogInfoPrefix(run, RunStatus.START, 'MyAgent');
      assert(prefix.includes('[agent_run][MyAgent]'));
      assert(prefix.includes('traceId=trace-xyz'));
      assert(prefix.includes('type=root_run'));
      assert(prefix.includes('status=start'));
      assert(prefix.includes('run_id=run-123'));
      assert(prefix.includes('parent_run_id='));
    });

    it('should mark child run when parent_run_id is set', () => {
      process.env.FAAS_ENV = 'dev';
      const { service } = makeTracingService();
      const run = makeRun({ parent_run_id: 'parent-001' });
      const prefix = service.getLogInfoPrefix(run, RunStatus.END, 'MyAgent');
      assert(prefix.includes('type=child_run'));
      assert(prefix.includes('parent_run_id=parent-001'));
    });

    it('should include env segment when SERVER_ENV is set and FAAS_ENV is not', () => {
      delete process.env.FAAS_ENV;
      process.env.SERVER_ENV = 'pre';
      const { service } = makeTracingService();
      const run = makeRun();
      const prefix = service.getLogInfoPrefix(run, RunStatus.END, 'MyAgent');
      assert(prefix.includes('env=pre'));
    });
  });

  describe('uploadToOss()', () => {
    it('should upload content to OSS client', async () => {
      process.env.FAAS_ENV = 'dev';
      const { service, ossPuts } = makeTracingService({ withOss: true });
      await service.uploadToOss('my/key', 'hello content');
      assert.strictEqual(ossPuts.length, 1);
      assert.strictEqual(ossPuts[0].key, 'my/key');
      assert.strictEqual(ossPuts[0].content, 'hello content');
    });

    it('should warn and skip when no OSS client is configured', async () => {
      const { service, warnLogs } = makeTracingService({ withOss: false });
      await service.uploadToOss('my/key', 'content');
      assert(warnLogs.some((log) => log.includes('OSS client not configured')));
    });
  });

  describe('syncLocalToLogService()', () => {
    it('should send log to log service with agentName prefix', async () => {
      const { service, logServiceSends } = makeTracingService({ withLogService: true });
      await service.syncLocalToLogService('trace log line', 'MyAgent');
      assert.strictEqual(logServiceSends.length, 1);
      assert(logServiceSends[0].includes('[MyAgent]'));
      assert(logServiceSends[0].includes('trace log line'));
    });

    it('should skip silently when no log service client configured', async () => {
      const { service, logServiceSends } = makeTracingService({ withLogService: false });
      await service.syncLocalToLogService('trace log line', 'MyAgent');
      assert.strictEqual(logServiceSends.length, 0);
    });

    it('should warn when agentName is empty', async () => {
      const { service, warnLogs } = makeTracingService({ withLogService: true });
      await service.syncLocalToLogService('log', '');
      assert(warnLogs.some((log) => log.includes('agentName is empty')));
    });

    it('should handle log service errors gracefully', async () => {
      const { service, warnLogs } = makeTracingService({ withLogService: false });
      (service as any).logServiceClient = {
        send: async () => {
          throw new Error('network error');
        },
      };
      await service.syncLocalToLogService('log', 'MyAgent');
      assert(warnLogs.some((log) => log.includes('syncLocalToLogService error')));
    });
  });

  describe('logTrace()', () => {
    it('should log trace via logger.info when FAAS_ENV is set', () => {
      process.env.FAAS_ENV = 'dev';
      const { service, infoLogs } = makeTracingService();
      const run = makeRun({ outputs: undefined });
      service.logTrace(run, RunStatus.END, 'LangGraphTracer', 'MyAgent');
      assert(infoLogs.some((log) => log.includes('[agent_run]')));
    });

    it('should skip runs tagged with langsmith:hidden', () => {
      process.env.FAAS_ENV = 'dev';
      const { service, infoLogs } = makeTracingService();
      const run = makeRun({ tags: ['langsmith:hidden'] });
      service.logTrace(run, RunStatus.END, 'LangGraphTracer', 'MyAgent');
      assert.strictEqual(infoLogs.length, 0);
    });

    it('should upload outputs field to OSS and replace with IResource', async () => {
      process.env.FAAS_ENV = 'dev';
      const { service, ossPuts, infoLogs } = makeTracingService({ withOss: true });
      const run = makeRun({ outputs: { result: 'data', llmOutput: { promptTokens: 10 } } });
      service.logTrace(run, RunStatus.END, 'LangGraphTracer', 'MyAgent');
      // backgroundTaskHelper runs synchronously in mock, so OSS put should be done
      assert(ossPuts.length >= 1, 'Should have uploaded to OSS');
      // The logged run should have outputs replaced with IResource
      const logLine = infoLogs.find((log) => log.includes('[agent_run]'));
      assert(logLine, 'Should have a log line');
      const runJson = logLine!.match(/,run=({.*})$/)?.[1];
      assert(runJson, 'Should have run JSON in log');
      const parsed = JSON.parse(runJson);
      assert(parsed.outputs?.key, 'outputs should be replaced with IResource');
      assert.strictEqual(parsed.cost?.promptTokens, 10, 'cost should be extracted from llmOutput');
    });

    it('should sync to log service when env is local', async () => {
      delete process.env.FAAS_ENV;
      delete process.env.SERVER_ENV;
      const { service, logServiceSends } = makeTracingService({ withLogService: true });
      const run = makeRun({ outputs: undefined });
      service.logTrace(run, RunStatus.END, 'LangGraphTracer', 'MyAgent');
      assert(logServiceSends.length >= 1, 'Should have synced to log service in local env');
    });

    it('should include child run ids in logged json', () => {
      process.env.FAAS_ENV = 'dev';
      const { service, infoLogs } = makeTracingService();
      const childRun = makeRun({ id: 'child-001' });
      const run = makeRun({ child_runs: [childRun], outputs: undefined });
      service.logTrace(run, RunStatus.END, 'LangGraphTracer', 'MyAgent');
      const logLine = infoLogs.find((log) => log.includes('[agent_run]'));
      const runJson = logLine?.match(/,run=({.*})$/)?.[1];
      const parsed = JSON.parse(runJson!);
      assert.deepStrictEqual(parsed.child_run_ids, ['child-001']);
    });
  });
});
