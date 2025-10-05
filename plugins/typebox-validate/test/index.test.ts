import path from 'node:path';

import { describe, it, beforeAll, afterAll, afterEach, expect } from 'vitest';
import { mock } from '@eggjs/mock';

import { Ajv } from '../src/index.ts';

describe('test/index.test.ts', () => {
  let app: any;
  beforeAll(async () => {
    app = mock.app({
      baseDir: path.join(import.meta.dirname, 'fixtures', 'apps', 'typebox-validate-test'),
    });
    await app.ready();
  });

  afterAll(() => app.close());
  afterEach(mock.restore);

  it('should export Ajv', () => {
    expect(Ajv).toBeInstanceOf(Function);
  });

  it('should POST 200 /:id', async () => {
    const res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc',
      email: 'xiekw2010@gmail.com',
    });
    expect(res.status).toBe(200);
    expect(res.body.n).toBe('xiekw2010');
    expect(res.body.d).toBe('desc');
    expect(res.body.e).toBe('xiekw2010@gmail.com');
    expect(res.body.same).toBe(true);
  });

  it('should POST 422 /:id', async () => {
    const res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      email: 'xiekw2010gmail.com',
    });
    expect(res.status).toBe(422);
  });

  it('should PUT 422 /:id with redirect', async () => {
    const res = await app.httpRequest().put('/someId').send({
      name: 'xiekw2010',
      email: 'xiekw2010gmail.com',
    });
    expect(res.status).toBe(302);
    expect(res.text).toMatch(/Redirecting.*\/422/);
  });

  it('should POST 200 /:id trim', async () => {
    const res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
    });
    expect(res.status).toBe(200);
    expect(res.body.n).toBe('xiekw2010');
    expect(res.body.d).toBe('desc');
    expect(res.body.e).toBe('xiekw2010@gmail.com');
    expect(res.body.same).toBe(true);
  });

  it('should POST 200 /:id custom format number bype', async () => {
    let res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      byte: 4,
    });
    expect(res.status).toBe(200);
    expect(res.body.same).toBe(true);

    res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      byte: 256,
    });
    expect(res.status).toBe(422);
  });

  it('should POST 200 /:id custom format string json-string', async () => {
    let res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      jsonString: '{"a":1}',
    });
    expect(res.status).toBe(200);
    expect(res.body.same).toBe(true);

    res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      jsonString: 'a{"a":1}',
    });
    expect(res.status).toBe(422);
  });

  it('should POST 200 /:id custom format string semver', async () => {
    let res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: '1.0.0',
    });
    expect(res.status).toBe(200);
    expect(res.body.same).toBe(true);

    res = await app.httpRequest().post('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    expect(res.status).toBe(422);
  });

  it('should PATCH 200 /:id tValidateWithoutThrow', async () => {
    let res = await app.httpRequest().patch('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: '1.0.0',
    });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('ok');

    res = await app.httpRequest().patch('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors[0].message).toContain('semver');

    res = await app.httpRequest().patch('/someId').send({
      name: 'xiekw2010',
      description: 22,
      email: 'xiekw2010gmail.com',
      version: 'a.b.c',
    });
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBe(1);
    expect(res.body.errors[0].message).toContain('string');
  });

  it('should DELETE 200 /:id decorator', async () => {
    const res = await app.httpRequest().delete('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: '1.0.0',
    });
    expect(res.status).toBe(200);
    expect(res.body.version).toBe('1.0.0');
  });

  it('should DELETE 422 /:id decorator', async () => {
    let res = await app.httpRequest().delete('/someId').send({
      name: 'xiekw2010',
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    expect(res.status).toBe(422);
    expect(res.text).toContain('kaiwei custom error: must match format "semver"');

    res = await app.httpRequest().delete('/someId').send({
      name: null,
      description: 'desc  ',
      email: 'xiekw2010@gmail.com',
      version: 'a.b.c',
    });
    expect(res.status).toBe(422);
    expect(res.text).toContain('kaiwei custom error: must be string');
  });
});
