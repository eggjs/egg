import { test, expect } from 'vitest';
import { app } from '@eggjs/mock/bootstrap';

import { HelloService } from '../../../../../app/module/foo/index.ts';

test('should hello() work', async () => {
  const helloService = await app.getEggObject(HelloService);
  const msg = await helloService.hello('123456');
  expect(msg).toBe('hello, 123456');
});
