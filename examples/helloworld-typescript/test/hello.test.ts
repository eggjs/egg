import { app } from '@eggjs/mock/bootstrap';
import { test } from 'vite-plus/test';

test('should GET /', async () => {
  await app.httpRequest().get('/').expect(200).expect('Hello EggJS 🥚🥚🥚🥚');
});
