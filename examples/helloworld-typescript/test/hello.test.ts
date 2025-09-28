import { test } from 'vitest';

import { app } from '@eggjs/mock/bootstrap';

test('should GET /', async () => {
  await app.httpRequest().get('/').expect(200).expect('Hello EggJS 🥚🥚🥚🥚');
});
