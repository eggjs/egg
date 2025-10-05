import { strict as assert } from 'node:assert';
import { describe, it, beforeAll, afterAll, afterEach } from 'vitest';
import { mock } from '@eggjs/mock';
import { Ajv } from '../src/index.ts';

describe('test/index.test.ts', () => {
  let app: any;
  beforeAll(async () => {
    app = mock.app({
      baseDir: 'apps/typebox-validate-test',
    });
    await app.ready();
  });

  afterAll(() => app.close());
  afterEach(mock.restore);

  it('should export Ajv', () => {
    assert(Ajv);
    assert.equal(typeof Ajv, 'function');
  });

  it('should POST 200 /:id', async () => {
    const res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc',
      email: 'xiekw2010@gmail.com',
    });
    assert(res.status === 200);
    assert(res.body.n === 'xiekw2010');
    assert(res.body.d === 'desc');
    assert(res.body.e === 'xiekw2010@gmail.com');
    assert(res.body.same === true);
  });

  it('should POST 422 /:id', async () => {
    const res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      email: 'xiekw2010gmail.com',
    });
    assert(res.status === 422);
  });

  it('should PUT 422 /:id with redirect', async () => {
    const res = await app.httpRequest().put('/someId').send({
      name: 'xiekw2010',
      email: 'xiekw2010gmail.com',
    });
    assert(res.status === 302);
    assert(/Redirecting.*\/422/.test(res.text));
  });

  it('should POST 200 /:id trim', async () => {
    const res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
    });
    assert(res.status === 200);
    assert(res.body.n === 'xiekw2010');
    assert(res.body.d === 'desc');
    assert(res.body.e === 'xiekw2010@gmail.com');
    assert(res.body.same === true);
  });

  it('should POST 200 /:id custom format number bype', async () => {
    let res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      byte: 4,
    });
    assert(res.status === 200);
    assert(res.body.same === true);

    res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      byte: 256,
    });
    assert(res.status === 422);
  });

  it('should POST 200 /:id custom format string json-string', async () => {
    let res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      jsonString: '{"a":1}',
    });
    assert(res.status === 200);
    assert(res.body.same === true);

    res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      jsonString: 'a{"a":1}',
    });
    assert(res.status === 422);
  });

  it('should POST 200 /:id custom format string semver', async () => {
    let res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: '1.0.0',
    });
    assert(res.status === 200);
    assert(res.body.same === true);

    res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    assert(res.status === 422);
  });

  it('should PATCH 200 /:id tValidateWithoutThrow', async () => {
    let res = await app.httpRequest().patch('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: '1.0.0',
    });
    assert(res.status === 200);
    assert(res.body.message === 'ok');

    res = await app.httpRequest().patch('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    assert(res.status === 422);
    assert(res.body.errors[0].message.includes('semver'));

    res = await app.httpRequest().patch('/someId').send({
      name: 'xiekw2010',
      description: 22,
      email: 'xiekw2010gmail.com',
      version: 'a.b.c',
    });
    assert(res.status === 422);
    assert(res.body.errors.length === 1);
    assert(res.body.errors[0].message.includes('string'));
  });

  it('should DELETE 200 /:id decorator', async () => {
    const res = await app.httpRequest().delete('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: '1.0.0',
    });
    assert(res.status === 200);
    assert(res.body.version === '1.0.0');
  });

  it('should DELETE 422 /:id decorator', async () => {
    let res = await app.httpRequest().delete('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    assert(res.status === 422);
    assert(res.text.includes('kaiwei custom error: must match format "semver"'));

    res = await app.httpRequest().delete('/someId').send({
      name: null,
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    assert(res.status === 422);
    assert(res.text.includes('kaiwei custom error: must be string'));
  });
});
