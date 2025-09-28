import { mm, MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { isReady } from '../src/app/extend/application.ts';
import { getFixtures } from './utils.ts';

describe('test/tracer.test.ts', () => {
  let app: MockApplication;
  beforeAll(() => {
    app = mm.app({
      baseDir: getFixtures('apps/plugin-test'),
    });
    return app.ready();
  });

  afterAll(() => app.close());

  it('should get app, agent tracer', () => {
    expect(app[isReady]).toBe(true);
    expect(app.agent[isReady]).toBe(true);

    let [appTracer_1, appTracer_2, appTracer_3] = app.appBeforeReadyTracers;
    // @ts-expect-error agentBeforeReadyTracers is not exist on type Agent
    let [agentTracer_1, agentTracer_2, agentTracer_3] = app.agent.agentBeforeReadyTracers;

    expect(appTracer_1).toBe(appTracer_2);
    expect(appTracer_1).toBe(appTracer_3);

    expect(appTracer_1.traceId).toBeInstanceOf(String);
    expect(appTracer_2.traceId).toBeInstanceOf(String);
    expect(appTracer_3.traceId).toBeInstanceOf(String);

    expect(appTracer_1).toBe(appTracer_2);
    expect(appTracer_1).toBe(appTracer_3);

    expect(appTracer_1.traceId).toBe(appTracer_2.traceId);
    expect(appTracer_1.traceId).toBe(appTracer_3.traceId);

    expect(agentTracer_1.traceId).toBeInstanceOf(String);
    expect(agentTracer_2.traceId).toBeInstanceOf(String);
    expect(agentTracer_3.traceId).toBeInstanceOf(String);

    expect(agentTracer_1).toBe(agentTracer_2);
    expect(agentTracer_1).toBe(agentTracer_3);

    expect(agentTracer_1.traceId).toBeInstanceOf(String);
    expect(agentTracer_2.traceId).toBeInstanceOf(String);
    expect(agentTracer_3.traceId).toBeInstanceOf(String);

    expect(agentTracer_1.traceId).toBe(agentTracer_2.traceId);
    expect(agentTracer_1.traceId).toBe(agentTracer_3.traceId);

    // app ready
    [appTracer_1, appTracer_2, appTracer_3] = app.appAfterReadyTracers;

    expect(appTracer_1).not.toBe(appTracer_2);
    expect(appTracer_1).not.toBe(appTracer_3);

    expect(appTracer_1.traceId).toBeInstanceOf(String);
    expect(appTracer_2.traceId).toBeInstanceOf(String);
    expect(appTracer_3.traceId).toBeInstanceOf(String);

    expect(appTracer_1).not.toBe(appTracer_2);
    expect(appTracer_1).not.toBe(appTracer_3);

    expect(appTracer_1.traceId).not.toBe(appTracer_2.traceId);
    expect(appTracer_1.traceId).not.toBe(appTracer_3.traceId);

    // agent ready
    // @ts-expect-error agentAfterReadyTracers is not exist on type Agent
    [agentTracer_1, agentTracer_2, agentTracer_3] = app.agent.agentAfterReadyTracers;
    expect(agentTracer_1.traceId).toBeInstanceOf(String);
    expect(agentTracer_2.traceId).toBeInstanceOf(String);
    expect(agentTracer_3.traceId).toBeInstanceOf(String);

    expect(agentTracer_1).not.toBe(agentTracer_2);
    expect(agentTracer_1).not.toBe(agentTracer_3);

    expect(agentTracer_1.traceId).toBeInstanceOf(String);
    expect(agentTracer_2.traceId).toBeInstanceOf(String);
    expect(agentTracer_3.traceId).toBeInstanceOf(String);

    expect(agentTracer_1.traceId).not.toBe(agentTracer_2.traceId);
    expect(agentTracer_1.traceId).not.toBe(agentTracer_3.traceId);
  });
});
