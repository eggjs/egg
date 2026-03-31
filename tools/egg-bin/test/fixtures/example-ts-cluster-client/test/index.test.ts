import { app } from '@eggjs/mock/bootstrap';

describe('cluster-client test', () => {
  it('should publish & subscribe via cluster-client', async () => {
    await app.ready();
    await app.httpRequest().post('/publish').send({ value: 'www.testme.com' }).expect('ok').expect(200);
    // wait for async subscribe propagation
    await new Promise((resolve) => setTimeout(resolve, 500));
    await app.httpRequest().get('/getHosts').expect(200);
  });
});
