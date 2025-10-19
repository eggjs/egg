import { test } from 'vitest';

import { app } from '@eggjs/mock/bootstrap';

test('should GET /api/headers with headers', async () => {
  await app.httpRequest().get('/api/headers').set('X-Custom', 'custom').expect(200).expect({
    message: `hello custom`,
  });
});

test('should GET /api/hello/:name', async () => {
  await app.httpRequest().get('/api/hello/world').expect(200).expect({
    message: `hello world`,
  });
});
