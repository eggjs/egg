import { strict as assert } from 'node:assert';
// import { importModule } from '@eggjs/utils';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

describe('test/mock_custom_loader.test.ts', () => {
  let app: MockApplication;
  before(async () => {
    app = mm.app({
      baseDir: getFixtures('custom-loader'),
    });
    await app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should return success', async () => {
    await app.httpRequest()
      .get('/users/popomore')
      .expect({
        adapter: 'docker',
        repository: 'popomore',
      })
      .expect(200);
  });

  it('should return when mock with data', async () => {
    app.mockRepository('user', 'get', 'mock');
    app.mockAdapter('docker', 'inspectDocker', 'mock');
    await app.httpRequest()
      .get('/users/popomore')
      .expect({
        adapter: 'mock',
        repository: 'mock',
      })
      .expect(200);
  });

  it('should return when mock the instance', async () => {
    app.mockAdapter(app.adapter.docker, 'inspectDocker', 'mock');
    await app.httpRequest()
      .get('/users/popomore')
      .expect({
        adapter: 'mock',
        repository: 'popomore',
      })
      .expect(200);
  });

  it('should not override the existing API', async () => {
    // const mod = await importModule(getFixtures('../../dist/commonjs/app/extend/application.js'), {
    //   importDefaultOnly: true,
    // });
    assert.equal(typeof app.mockEnv, 'function');
    // assert.equal(app.mockEnv, mod.prototype.mockEnv);
  });
});
