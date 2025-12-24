import { app } from '@eggjs/mock/bootstrap';
import { describe, it } from '@voidzero-dev/vite-plus/test';

describe('example helloworld test', () => {
  it('should GET / 200', () => {
    return app.httpRequest().get('/').expect(200).expect('Hello World');
  });

  it('should GET /foo', async () => {
    await app.httpRequest().get('/foo').expect(400).expect({
      foo: 'bar',
    });
  });
});
