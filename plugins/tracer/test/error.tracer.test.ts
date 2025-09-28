import { strict as assert } from 'node:assert';
import { mm, MockApplication } from '@eggjs/mock';

describe('test/error.tracer.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    app = mm.app({
      baseDir: 'apps/error-tracer-test',
    });
    await app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  it('should get app, agent tracer', () => {
    assert.equal(app.appBeforeReadyTracers.length, 3);
    assert.equal(app.agent.agentBeforeReadyTracers.length, 3);

    assert.equal(app.appAfterReadyTracers.length, 3);
    assert.equal(app.agent.agentAfterReadyTracers.length, 3);
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
