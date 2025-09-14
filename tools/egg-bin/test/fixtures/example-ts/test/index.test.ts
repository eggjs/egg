import { strict as assert } from 'node:assert';
import { app } from '@eggjs/mock/bootstrap';

import { Foo } from '../app/module/foo.ts';

describe('example-ts/test/index.test.ts', () => {
  it('should work', async () => {
    await app.ready();
    await app.httpRequest().get('/').expect('hi, egg').expect(200);
  });

  it('should paths work', async () => {
    await app.ready();
    await app.httpRequest().get('/foo').expect('bar').expect(200);
  });

  it('should auto import tsconfig-paths/register', async () => {
    const instance = new Foo();
    assert.equal(instance.bar(), 'bar');
  });
});
