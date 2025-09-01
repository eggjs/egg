import coffee from 'coffee';
import { describe, it, afterAll } from 'vitest';
import { mock, restore } from 'mm';
import { getFixtures } from './helper.js';

describe('test/bootstrap-plugin.test.ts', () => {
  afterAll(() => restore());

  it('should throw error on plugin project', () => {
    mock(process.env, 'EGG_BASE_DIR', getFixtures('plugin-bootstrap'));
    const testFile = getFixtures('plugin-bootstrap/test.js');

    return coffee.fork(testFile)
      .debug()
      .expect('stderr', /DO NOT USE bootstrap to test plugin/)
      .expect('code', 1)
      .end();
  });
});
