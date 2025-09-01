import { getFixtures } from './helper.js';

// TBD: This test case is not working as expected. Need to investigate.
describe.skip('test/parallel.test.ts', () => {
  before(async () => {
    const { mochaGlobalSetup } = await import('../src/register.js');
    await mochaGlobalSetup();
    process.env.ENABLE_MOCHA_PARAELLEL = 'true';
    process.env.AUTO_AGENT = 'true';
    process.env.EGG_BASE_DIR = getFixtures('apps/foo');
  });

  after(async () => {
    const { mochaGlobalTeardown } = await import('../src/register.js');
    await mochaGlobalTeardown();
    delete process.env.ENABLE_MOCHA_PARAELLEL;
    delete process.env.AUTO_AGENT;
    delete process.env.EGG_BASE_DIR;
  });

  it('should work', async () => {
    const { getBootstrapApp } = await import('../src/bootstrap.js');
    const app = getBootstrapApp();
    await app.ready();
    await app.httpRequest()
      .get('/')
      .expect(200)
      .expect('foo');
    await app.close();
  });
});
