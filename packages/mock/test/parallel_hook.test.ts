import coffee from 'coffee';
import mm from '../src/index.js';
import { importResolve } from '@eggjs/utils';
import { getFixtures } from './helper.js';

// TBD: This test case is not working as expected. Need to investigate.
describe.skip('test/bootstrap-plugin.test.ts', () => {
  after(() => mm.restore());

  it('should throw', async () => {
    return coffee.fork(importResolve('mocha/bin/mocha'), [
      '-r', getFixtures('../lib/parallel/agent_register'),
      '--parallel', '--jobs', '2', '--exit',
    ], {
      cwd: getFixtures('apps/parallel-test'),
    })
      // .debug()
      .expect('code', 0)
      .expect('stdout', /3 passing/)
      .end();
  });
});
