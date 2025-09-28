import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';
import { isReady } from '../src/app/extend/application.js';

describe('test/tracer.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: 'apps/plugin-test',
    });
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should get app, agent tracer', () => {
    assert(app[isReady]);
    assert(app.agent[isReady]);

    let [appTracer_1, appTracer_2, appTracer_3] = app.appBeforeReadyTracers;
    let [agentTracer_1, agentTracer_2, agentTracer_3] = app.agent.agentBeforeReadyTracers;

    assert.equal(appTracer_1, appTracer_2);
    assert.equal(appTracer_1, appTracer_3);

    assert(appTracer_1.traceId);
    assert(appTracer_2.traceId);
    assert(appTracer_3.traceId);

    assert.equal(appTracer_1, appTracer_2);
    assert.equal(appTracer_1, appTracer_3);

    assert.equal(appTracer_1.traceId, appTracer_2.traceId);
    assert.equal(appTracer_1.traceId, appTracer_3.traceId);

    assert(agentTracer_1.traceId);
    assert(agentTracer_2.traceId);
    assert(agentTracer_3.traceId);

    assert.equal(agentTracer_1, agentTracer_2);
    assert.equal(agentTracer_1, agentTracer_3);

    assert(agentTracer_1.traceId);
    assert(agentTracer_2.traceId);
    assert(agentTracer_3.traceId);

    assert.equal(agentTracer_1.traceId, agentTracer_2.traceId);
    assert.equal(agentTracer_1.traceId, agentTracer_3.traceId);

    // app ready
    [appTracer_1, appTracer_2, appTracer_3] = app.appAfterReadyTracers;

    assert.notEqual(appTracer_1, appTracer_2);
    assert.notEqual(appTracer_1, appTracer_3);

    assert(appTracer_1.traceId);
    assert(appTracer_2.traceId);
    assert(appTracer_3.traceId);

    assert.notEqual(appTracer_1, appTracer_2);
    assert.notEqual(appTracer_1, appTracer_3);

    assert.notEqual(appTracer_1.traceId, appTracer_2.traceId);
    assert.notEqual(appTracer_1.traceId, appTracer_3.traceId);

    // agent ready
    [agentTracer_1, agentTracer_2, agentTracer_3] = app.agent.agentAfterReadyTracers;
    assert(agentTracer_1.traceId);
    assert(agentTracer_2.traceId);
    assert(agentTracer_3.traceId);

    assert.notEqual(agentTracer_1, agentTracer_2);
    assert.notEqual(agentTracer_1, agentTracer_3);

    assert(agentTracer_1.traceId);
    assert(agentTracer_2.traceId);
    assert(agentTracer_3.traceId);

    assert.notEqual(agentTracer_1.traceId, agentTracer_2.traceId);
    assert.notEqual(agentTracer_1.traceId, agentTracer_3.traceId);
  });
});
