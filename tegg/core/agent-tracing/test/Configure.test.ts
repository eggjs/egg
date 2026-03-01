import assert from 'node:assert';

import { describe, it, beforeEach } from 'vitest';

import { ClaudeAgentTracer } from '../src/ClaudeAgentTracer.ts';
import { LangGraphTracer } from '../src/LangGraphTracer.ts';
import { TracingService } from '../src/TracingService.ts';
import { createMockLogger, createMockTracingService } from './TestUtils.ts';

describe('test/Configure.test.ts', () => {
  describe('TracingService.configure()', () => {
    let tracingService: TracingService;

    beforeEach(() => {
      tracingService = createMockTracingService();
    });

    it('should accept empty config', () => {
      assert.doesNotThrow(() => {
        tracingService.configure({});
      });
    });

    it('should accept complete oss config', () => {
      assert.doesNotThrow(() => {
        tracingService.configure({
          oss: {
            accessKeyId: 'ak',
            accessKeySecret: 'sk',
            bucket: 'my-bucket',
            region: 'cn-hangzhou',
          },
        });
      });
    });

    it('should accept complete logService config', () => {
      assert.doesNotThrow(() => {
        tracingService.configure({
          logService: {
            url: 'https://log.example.com/api',
            headers: { Authorization: 'Bearer token' },
          },
        });
      });
    });

    it('should accept both oss and logService config', () => {
      assert.doesNotThrow(() => {
        tracingService.configure({
          oss: {
            accessKeyId: 'ak',
            accessKeySecret: 'sk',
            bucket: 'my-bucket',
            region: 'cn-hangzhou',
          },
          logService: {
            url: 'https://log.example.com/api',
          },
        });
      });
    });

    it('should throw TypeError when oss.accessKeyId is missing', () => {
      assert.throws(
        () => {
          tracingService.configure({
            oss: {
              accessKeyId: '',
              accessKeySecret: 'sk',
              bucket: 'my-bucket',
              region: 'cn-hangzhou',
            },
          });
        },
        TypeError,
        'should throw TypeError for missing accessKeyId',
      );
    });

    it('should throw TypeError when oss.accessKeySecret is missing', () => {
      assert.throws(
        () => {
          tracingService.configure({
            oss: {
              accessKeyId: 'ak',
              accessKeySecret: '',
              bucket: 'my-bucket',
              region: 'cn-hangzhou',
            },
          });
        },
        TypeError,
        'should throw TypeError for missing accessKeySecret',
      );
    });

    it('should throw TypeError when oss.bucket is missing', () => {
      assert.throws(
        () => {
          tracingService.configure({
            oss: {
              accessKeyId: 'ak',
              accessKeySecret: 'sk',
              bucket: '',
              region: 'cn-hangzhou',
            },
          });
        },
        TypeError,
        'should throw TypeError for missing bucket',
      );
    });

    it('should throw TypeError when oss.region is missing', () => {
      assert.throws(
        () => {
          tracingService.configure({
            oss: {
              accessKeyId: 'ak',
              accessKeySecret: 'sk',
              bucket: 'my-bucket',
              region: '',
            },
          });
        },
        TypeError,
        'should throw TypeError for missing region',
      );
    });

    it('should throw TypeError when logService.url is missing', () => {
      assert.throws(
        () => {
          tracingService.configure({
            logService: {
              url: '',
            },
          });
        },
        TypeError,
        'should throw TypeError for missing logService url',
      );
    });

    it('should reset OSS client when reconfigured', () => {
      tracingService.configure({
        oss: {
          accessKeyId: 'ak1',
          accessKeySecret: 'sk1',
          bucket: 'bucket1',
          region: 'region1',
        },
      });

      // Access private state to verify reset
      assert.strictEqual((tracingService as any).ossInitialized, false);
      assert.strictEqual((tracingService as any).ossClient, null);
    });
  });

  describe('LangGraphTracer.configure()', () => {
    it('should set agentName and delegate to TracingService', () => {
      const tracingService = createMockTracingService();
      const tracer = new LangGraphTracer();
      (tracer as any).tracingService = tracingService;

      tracer.configure({
        agentName: 'MyAgent',
        oss: {
          accessKeyId: 'ak',
          accessKeySecret: 'sk',
          bucket: 'bucket',
          region: 'region',
        },
      });

      assert.strictEqual(tracer.agentName, 'MyAgent');
      assert.strictEqual(tracer.name, 'LangGraphTracer', 'name should remain default');
    });

    it('should not change agentName when not provided', () => {
      const tracingService = createMockTracingService();
      const tracer = new LangGraphTracer();
      (tracer as any).tracingService = tracingService;
      tracer.agentName = 'existing';

      tracer.configure({});

      assert.strictEqual(tracer.agentName, 'existing');
    });
  });

  describe('ClaudeAgentTracer.configure()', () => {
    it('should set agentName and delegate to TracingService', () => {
      const tracingService = createMockTracingService();
      const mockLogger = createMockLogger();
      const tracer = new ClaudeAgentTracer();
      (tracer as any).logger = mockLogger;
      (tracer as any).tracingService = tracingService;

      tracer.configure({
        agentName: 'MyClaude',
        oss: {
          accessKeyId: 'ak',
          accessKeySecret: 'sk',
          bucket: 'bucket',
          region: 'region',
        },
      });

      assert.strictEqual(tracer.agentName, 'MyClaude');
      assert.strictEqual(tracer.name, 'ClaudeAgentTracer', 'name should remain default');
    });

    it('should not change agentName when not provided', () => {
      const tracingService = createMockTracingService();
      const mockLogger = createMockLogger();
      const tracer = new ClaudeAgentTracer();
      (tracer as any).logger = mockLogger;
      (tracer as any).tracingService = tracingService;
      tracer.agentName = 'existing';

      tracer.configure({});

      assert.strictEqual(tracer.agentName, 'existing');
    });
  });
});
