import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import { scheduler } from 'node:timers/promises';

import request from 'supertest';
import statuses from 'statuses';

import Koa from '../../src/index.ts';
import { once } from 'node:events';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

describe('app.respond', () => {
  describe('when ctx.respond === false', () => {
    it('should function (ctx)', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = 'Hello';
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        setImmediate(() => {
          res.setHeader('Content-Type', 'text/plain');
          res.setHeader('Content-Length', '3');
          res.end('lol');
        });
      });

      const server = app.listen();

      return request(server).get('/').expect(200).expect('lol');
    });

    it('should ignore set header after header sent', () => {
      const app = new Koa();
      app.use(ctx => {
        ctx.body = 'Hello';
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '3');
        res.end('lol');
        ctx.set('foo', 'bar');
      });

      const server = app.listen();

      return request(server)
        .get('/')
        .expect(200)
        .expect('lol')
        .expect(res => {
          assert.ok(!res.headers.foo);
        });
    });

    it('should ignore set status after header sent', () => {
      const app = new Koa();
      app.use(ctx => {
        ctx.body = 'Hello';
        ctx.respond = false;

        const res = ctx.res;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Length', '3');
        res.end('lol');
        ctx.status = 201;
      });

      const server = app.listen();

      return request(server).get('/').expect(200).expect('lol');
    });
  });

  describe('when this.type === null', () => {
    it('should not send Content-Type header', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = '';
        ctx.type = null;
      });

      const server = app.listen();

      const res = await request(server).get('/').expect(200);

      assert.equal(Object.hasOwn(res.headers, 'Content-Type'), false);
    });
  });

  describe('when HEAD is used', () => {
    it('should not respond with the body', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = 'Hello';
      });

      const server = app.listen();

      const res = await request(server).head('/').expect(200);

      assert.equal(res.headers['content-type'], 'text/plain; charset=utf-8');
      assert.equal(res.headers['content-length'], '5');
      assert.ok(!res.text);
    });

    it('should keep json headers', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = { hello: 'world' };
      });

      const server = app.listen();

      const res = await request(server).head('/').expect(200);

      assert.equal(
        res.headers['content-type'],
        'application/json; charset=utf-8'
      );
      assert.equal(res.headers['content-length'], '17');
      assert.ok(!res.text);
    });

    it('should keep string headers', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = 'hello world';
      });

      const server = app.listen();

      const res = await request(server).head('/').expect(200);

      assert.equal(res.headers['content-type'], 'text/plain; charset=utf-8');
      assert.equal(res.headers['content-length'], '11');
      assert.ok(!res.text);
    });

    it('should keep buffer headers', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = Buffer.from('hello world');
      });

      const server = app.listen();

      const res = await request(server).head('/').expect(200);

      assert.equal(res.headers['content-type'], 'application/octet-stream');
      assert.equal(res.headers['content-length'], '11');
      assert.ok(!res.text);
    });

    it('should keep stream header if set manually', async () => {
      const app = new Koa();

      const { length } = fs.readFileSync('package.json');

      app.use(ctx => {
        ctx.length = length;
        ctx.body = fs.createReadStream('package.json');
      });

      const server = app.listen();

      const res = await request(server).head('/').expect(200);

      assert.equal(Number.parseInt(res.header['content-length']), length);
      assert.ok(!res.text);
    });

    it('should respond with a 404 if no body was set', () => {
      const app = new Koa();

      app.use(() => {
        // empty
      });

      const server = app.listen();

      return request(server).head('/').expect(404);
    });

    it('should respond with a 200 if body = ""', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = '';
      });

      const server = app.listen();

      return request(server).head('/').expect(200);
    });

    it('should not overwrite the content-type', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.status = 200;
        ctx.type = 'application/javascript';
      });

      const server = app.listen();

      return request(server)
        .head('/')
        .expect('content-type', /application\/javascript/)
        .expect(200);
    });
  });

  describe('when no middleware is present', () => {
    it('should 404', () => {
      const app = new Koa();

      const server = app.listen();

      return request(server).get('/').expect(404);
    });
  });

  describe('when res has already been written to', () => {
    it('should not cause an app error', () => {
      const app = new Koa();

      app.use(ctx => {
        const res = ctx.res;
        ctx.status = 200;
        res.setHeader('Content-Type', 'text/html');
        res.write('Hello');
      });

      app.on('error', err => {
        throw err;
      });

      const server = app.listen();

      return request(server).get('/').expect(200);
    });

    it('should send the right body', () => {
      const app = new Koa();

      app.use(async ctx => {
        const res = ctx.res;
        ctx.status = 200;
        res.setHeader('Content-Type', 'text/html');
        res.write('Hello');
        await scheduler.wait(0);
        res.end('Goodbye');
      });

      const server = app.listen();

      return request(server).get('/').expect(200).expect('HelloGoodbye');
    });
  });

  describe('when .body is missing', () => {
    describe('with status=400', () => {
      it('should respond with the associated status message', () => {
        const app = new Koa();

        app.use(ctx => {
          ctx.status = 400;
        });

        const server = app.listen();

        return request(server)
          .get('/')
          .expect(400)
          .expect('Content-Length', '11')
          .expect('Bad Request');
      });
    });

    describe('with status=204', () => {
      it('should respond without a body', async () => {
        const app = new Koa();

        app.use(ctx => {
          ctx.status = 204;
        });

        const server = app.listen();

        const res = await request(server).get('/').expect(204).expect('');

        assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
      });
    });

    describe('with status=205', () => {
      it('should respond without a body', async () => {
        const app = new Koa();

        app.use(ctx => {
          ctx.status = 205;
        });

        const server = app.listen();

        const res = await request(server).get('/').expect(205).expect('');

        assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
      });
    });

    describe('with status=304', () => {
      it('should respond without a body', async () => {
        const app = new Koa();

        app.use(ctx => {
          ctx.status = 304;
        });

        const server = app.listen();

        const res = await request(server).get('/').expect(304).expect('');

        assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
      });
    });

    describe('with custom status=700', () => {
      it('should respond with the associated status message', async () => {
        const app = new Koa();
        statuses.message['700'] = 'custom status';

        app.use(ctx => {
          ctx.status = 700;
        });

        const server = app.listen();

        const res = await request(server)
          .get('/')
          .expect(700)
          .expect('custom status');

        assert.equal(res.statusCode, 700);
        assert.ok((res as unknown as { res: { statusMessage: string } }).res);
        assert.equal(
          (res as unknown as { res: { statusMessage: string } }).res
            .statusMessage,
          'custom status'
        );
      });
    });

    describe('with custom statusMessage=ok', () => {
      it('should respond with the custom status message', async () => {
        const app = new Koa();

        app.use(ctx => {
          ctx.status = 200;
          ctx.message = 'ok';
        });

        const server = app.listen();

        const res = await request(server).get('/').expect(200).expect('ok');

        assert.equal(res.statusCode, 200);
        assert.ok((res as unknown as { res: { statusMessage: string } }).res);
        assert.equal(
          (res as unknown as { res: { statusMessage: string } }).res
            .statusMessage,
          'ok'
        );
      });
    });

    describe('with custom status without message', () => {
      it('should respond with the status code number', () => {
        const app = new Koa();

        app.use(ctx => {
          ctx.res.statusCode = 701;
        });

        const server = app.listen();

        return request(server).get('/').expect(701).expect('701');
      });
    });
  });

  describe('when .body is a null', () => {
    it('should respond 204 by default', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/').expect(204).expect('');

      assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
    });

    it('should respond 204 with status=200', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.status = 200;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/').expect(204).expect('');

      assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
    });

    it('should respond 205 with status=205', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.status = 205;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/').expect(205).expect('');

      assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
    });

    it('should respond 304 with status=304', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.status = 304;
        ctx.body = null;
      });

      const server = app.listen();

      const res = await request(server).get('/').expect(304).expect('');

      assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
    });
  });

  describe('when .body is a string', () => {
    it('should respond', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = 'Hello';
      });

      const server = app.listen();

      return request(server).get('/').expect('Hello');
    });
  });

  describe('when .body is a Buffer', () => {
    it('should respond', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = Buffer.from('Hello');
      });

      const server = app.listen();

      return request(server).get('/').expect(200).expect(Buffer.from('Hello'));
    });
  });

  describe('when .body is a Stream', () => {
    it('should respond', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = fs.createReadStream('package.json');
        ctx.set('Content-Type', 'application/json; charset=utf-8');
      });

      const server = app.listen();

      const res = await request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8');

      assert.equal(Object.hasOwn(res.headers, 'content-length'), false);
      assert.deepEqual(res.body, pkg);
    });

    it('should strip content-length when overwriting', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = 'hello';
        ctx.body = fs.createReadStream('package.json');
        ctx.set('Content-Type', 'application/json; charset=utf-8');
      });

      const server = app.listen();

      const res = await request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8');

      assert.equal(Object.hasOwn(res.headers, 'content-length'), false);
      assert.deepEqual(res.body, pkg);
    });

    it('should keep content-length if not overwritten', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.length = fs.readFileSync('package.json').length;
        ctx.body = fs.createReadStream('package.json');
        ctx.set('Content-Type', 'application/json; charset=utf-8');
      });

      const server = app.listen();

      const res = await request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8');

      assert.equal(Object.hasOwn(res.headers, 'content-length'), true);
      assert.deepEqual(res.body, pkg);
    });

    it('should keep content-length if overwritten with the same stream', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.length = fs.readFileSync('package.json').length;
        const stream = fs.createReadStream('package.json');
        ctx.body = stream;
        ctx.body = stream;
        ctx.set('Content-Type', 'application/json; charset=utf-8');
      });

      const server = app.listen();

      const res = await request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8');

      assert.equal(Object.hasOwn(res.headers, 'content-length'), true);
      assert.equal(
        res.headers['content-length'],
        `${fs.readFileSync('package.json').length}`
      );
      assert.deepEqual(res.body, pkg);
    });

    it('should handle errors', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.set('Content-Type', 'application/json; charset=utf-8');
        ctx.body = fs.createReadStream('does not exist');
      });

      const server = app.listen();

      request(server)
        .get('/')
        .expect('Content-Type', 'text/plain; charset=utf-8')
        .expect(404)
        .end(() => {
          // empty
        });

      const [err] = await once(app, 'error');
      assert.match(err.message, /ENOENT: no such file or directory, open/);
    });

    it('should handle errors when no content status', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.status = 204;
        ctx.body = fs.createReadStream('does not exist');
      });

      const server = app.listen();

      return request(server).get('/').expect(204);
    });

    it('should handle all intermediate stream body errors', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = fs.createReadStream('does not exist');
        ctx.body = fs.createReadStream('does not exist');
        ctx.body = fs.createReadStream('does not exist');
      });

      const server = app.listen();

      request(server)
        .get('/')
        .expect(404)
        .end(() => {
          // empty
        });

      const [err] = await once(app, 'error');
      assert.match(err.message, /ENOENT: no such file or directory, open/);
    });
  });

  describe('when .body is an Object', () => {
    it('should respond with json', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = { hello: 'world' };
      });

      const server = app.listen();

      return request(server)
        .get('/')
        .expect('Content-Type', 'application/json; charset=utf-8')
        .expect('{"hello":"world"}');
    });
    describe('and headers sent', () => {
      it('should respond with json body and headers', () => {
        const app = new Koa();

        app.use(ctx => {
          ctx.length = 17;
          ctx.type = 'json';
          ctx.set('foo', 'bar');
          ctx.res.flushHeaders();
          ctx.body = { hello: 'world' };
        });

        const server = app.listen();

        return request(server)
          .get('/')
          .expect('Content-Type', 'application/json; charset=utf-8')
          .expect('Content-Length', '17')
          .expect('foo', 'bar')
          .expect('{"hello":"world"}');
      });
    });
  });

  describe('when an error occurs', () => {
    it('should emit "error" on the app', async () => {
      const app = new Koa();

      app.use(() => {
        throw new Error('boom');
      });

      app.on('error', err => {
        assert.equal(err.message, 'boom');
      });

      request(app.callback())
        .get('/')
        .end(() => {
          // ignore
        });

      await once(app, 'error');
    });

    describe('with an .expose property', () => {
      it('should expose the message', () => {
        const app = new Koa();

        app.use(() => {
          const err = new Error('sorry!');
          (err as unknown as { status: number; expose: boolean }).status = 403;
          (err as unknown as { status: number; expose: boolean }).expose = true;
          throw err;
        });

        return request(app.callback()).get('/').expect(403, 'sorry!');
      });
    });

    describe('with a .status property', () => {
      it('should respond with .status', () => {
        const app = new Koa();

        app.use(() => {
          const err = new Error('s3 explodes');
          (err as unknown as { status: number }).status = 403;
          throw err;
        });

        return request(app.callback()).get('/').expect(403, 'Forbidden');
      });
    });

    it('should respond with 500', () => {
      const app = new Koa();

      app.use(() => {
        throw new Error('boom!');
      });

      const server = app.listen();

      return request(server).get('/').expect(500, 'Internal Server Error');
    });

    it('should be catchable', () => {
      const app = new Koa();

      app.use((ctx, next) => {
        // oxlint-disable-next-line promise/prefer-await-to-then
        return (
          next()
            // oxlint-disable-next-line promise/prefer-await-to-then
            .then(() => {
              ctx.body = 'Hello';
            })
            // oxlint-disable-next-line promise/prefer-await-to-then
            .catch(() => {
              ctx.body = 'Got error';
            })
        );
      });

      app.use(() => {
        throw new Error('boom!');
      });

      const server = app.listen();

      return request(server).get('/').expect(200, 'Got error');
    });
  });

  describe('when status and body property', () => {
    it('should 200', () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.status = 304;
        ctx.body = 'hello';
        ctx.status = 200;
      });

      const server = app.listen();

      return request(server).get('/').expect(200).expect('hello');
    });

    it('should 204', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.status = 200;
        ctx.body = 'hello';
        ctx.set('content-type', 'text/plain; charset=utf8');
        ctx.status = 204;
      });

      const server = app.listen();

      const res = await request(server).get('/').expect(204);

      assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
    });
  });

  describe('with explicit null body', () => {
    it('should preserve given status', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = null;
        ctx.status = 404;
      });

      const server = app.listen();

      return request(server).get('/').expect(404).expect('').expect({});
    });
    it('should respond with correct headers', async () => {
      const app = new Koa();

      app.use(ctx => {
        ctx.body = null;
        ctx.status = 401;
      });

      const server = app.listen();

      const res = await request(server)
        .get('/')
        .expect(401)
        .expect('')
        .expect({});

      assert.equal(Object.hasOwn(res.headers, 'content-type'), false);
    });
  });
});
