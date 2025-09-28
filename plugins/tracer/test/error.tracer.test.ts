import { mm, MockApplication } from '@eggjs/mock';
import { describe, it, beforeAll, afterAll, expect } from 'vitest';

import { getFixtures } from './utils.ts';

describe('test/error.tracer.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/error-tracer-test'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  it('should get app, agent tracer', () => {
    expect(app.appBeforeReadyTracers.length).toBe(3);
    // @ts-expect-error agentBeforeReadyTracers is not exist on type Agent
    expect(app.agent.agentBeforeReadyTracers.length).toBe(3);

    expect(app.appAfterReadyTracers.length).toBe(3);
    // @ts-expect-error agentAfterReadyTracers is not exist on type Agent
    expect(app.agent.agentAfterReadyTracers.length).toBe(3);
  });

  it('should GET /', () => {
    return app
      .httpRequest()
      .get('/')
      .expect('x-trace-id', /\w{13}/)
      .expect('hi, egg')
      .expect(200);
  });
});
