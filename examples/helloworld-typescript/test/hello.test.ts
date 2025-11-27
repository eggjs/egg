import { app } from '@eggjs/mock/bootstrap';
import { test } from 'vitest';

test('should GET /', async () => {
  await app.httpRequest().get('/').expect(200).expect('Hello EggJS 🥚🥚🥚🥚');
});
