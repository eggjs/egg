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
  });

  describe('LangGraphTracer.configure()', () => {
    it('should set agentName and delegate to TracingService', () => {
      const tracingService = createMockTracingService();
      const tracer = new LangGraphTracer();
      (tracer as any).tracingService = tracingService;

      tracer.configure({
        agentName: 'MyAgent',
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
