import { strict as assert } from 'node:assert';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { once } from 'node:events';

import express, { type Express } from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import nock from 'nock';
import { describe, it, beforeEach, beforeAll, expect } from 'vitest';

import request, { Test } from '../src/index.ts';
import { throwError } from './throwError.ts';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const __dirname = import.meta.dirname;

function shouldIncludeStackWithThisFile(err: Error) {
  // console.error(err.stack);
  expect(err.stack).toMatch(/test\/supertest\.test\.ts:/);
  expect(err.stack).toMatch(new RegExp(`^${err.name}:`));
}

describe('request(url)', () => {
  it('should be supported', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.send('hello');
    });

    const server = app.listen();
    await once(server, 'listening');
    const url = 'http://localhost:' + (server.address() as AddressInfo).port;
    await request(url).get('/').expect('hello');
    server.close();
  });

  it('should promise style', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.send('hello');
    });

    const server = app.listen();
    await once(server, 'listening');
    const url = 'http://localhost:' + (server.address() as AddressInfo).port;
    await request(url).get('/').expect('hello');
    server.close();
  });

  it('should async await', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.send('hello async await');
    });

    const server = app.listen();
    await once(server, 'listening');
    const url = 'http://localhost:' + (server.address() as AddressInfo).port;
    await request(url).get('/').expect('hello async await');

    await request.agent(url).get('/').expect('hello async await');
  });

  describe('.end(cb)', function () {
    it('should set `this` to the test object when calling cb', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        res.send('hello');
      });

      const server = app.listen();
      await once(server, 'listening');
      const url = 'http://localhost:' + (server.address() as AddressInfo).port;
      const test = request(url).get('/');
      await new Promise(resolve => {
        test.end(function (this: Test, err, res) {
          assert.equal(this, test);
          assert.equal(err, null);
          assert.equal(res.text, 'hello');
          resolve(res);
        });
      });
      server.close();
    });
  });
});

describe('request(app)', () => {
  it('should fire up the app on an ephemeral port', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.send('hey');
    });

    const res = await request(app).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toBe('hey');
  });

  it('should work with an active server', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.send('hey');
    });

    const server = app.listen();
    await once(server, 'listening');
    const res = await request(server).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toBe('hey');
    server.close();
  });

  it('should work with remote server', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.send('hey');
    });

    const server = app.listen();
    await once(server, 'listening');
    const url = 'http://localhost:' + (server.address() as AddressInfo).port;
    const res = await request(url).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toBe('hey');
    server.close();
  });

  it('should work with a https server', async () => {
    const app = express();
    const fixtures = path.join(__dirname, 'fixtures');
    const server = https.createServer(
      {
        key: fs.readFileSync(path.join(fixtures, 'test_key.pem')),
        cert: fs.readFileSync(path.join(fixtures, 'test_cert.pem')),
      },
      app
    );

    app.get('/', function (_req, res) {
      res.send('hey');
    });

    const res = await request(server).get('/');

    expect(res.status).toBe(200);
    expect(res.text).toBe('hey');
  });

  it('should work with .send() etc', async () => {
    const app = express();

    app.use(bodyParser.json());

    app.post('/', function (req, res) {
      res.send(req.body.name);
    });

    await request(app).post('/').send({ name: 'john' }).expect('john');
  });

  it('should work when unbuffered', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.end('Hello');
    });

    await request(app).get('/').expect('Hello');
  });

  it('should work on trace method', async () => {
    const app = express();

    app.trace('/', function (_req, res) {
      res.end('Hello');
    });

    await request(app).trace('/').expect('Hello');
  });

  it('should default redirects to 0', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.redirect('/login');
    });

    await request(app).get('/').expect(302);
  });

  it('should handle redirects', async () => {
    const app = express();

    app.get('/login', function (_req, res) {
      res.end('Login');
    });

    app.get('/', function (_req, res) {
      res.redirect('/login');
    });

    const res = await request(app).get('/').redirects(1);

    expect(res).toBeDefined();
    expect(res.status).toBe(200);
    expect(res.text).toBe('Login');
  });

  it('should handle socket errors', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.destroy();
    });

    await expect(request(app).get('/')).rejects.toThrow();
  });

  describe('.end(fn)', function () {
    it('should close server', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        res.send('supertest FTW!');
      });

      const test = request(app)
        .get('/')
        .end(function () {});

      await once(test._server, 'close');
    });

    it('should wait for server to close before invoking fn', async () => {
      const app = express();
      let closed = false;

      app.get('/', function (_req, res) {
        res.send('supertest FTW!');
      });

      const test = request(app).get('/');

      test._server.on('close', () => {
        closed = true;
      });

      await test;
      expect(closed).toBe(true);
    });

    it('should support nested requests', async () => {
      const app = express();
      const test = request(app);

      app.get('/', function (_req, res) {
        res.send('supertest FTW!');
      });

      await test.get('/');

      const res = await test.get('/');
      expect(res.status).toBe(200);
      expect(res.text).toBe('supertest FTW!');
    });

    it('should include the response in the error callback', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        res.send('whatever');
      });

      try {
        await request(app)
          .get('/')
          .expect(function () {
            throw new Error('Some error');
          });
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err).toBeDefined();
        // expect(err.response).toBeDefined();
        // expect(err.response.status).toBe(200);
      }
    });

    it('should set `this` to the test object when calling the error callback', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        res.send('whatever');
      });

      await expect(async () => {
        await request(app)
          .get('/')
          .expect(function () {
            throw new Error('Some error');
          });
      }).rejects.toThrow('Some error');
    });

    it('should handle an undefined Response', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        setTimeout(function () {
          res.end();
        }, 20);
      });

      const server = app.listen();
      await once(server, 'listening');
      const url = 'http://localhost:' + (server.address() as AddressInfo).port;

      await expect(
        request(url).get('/').timeout(1).expect(200)
      ).rejects.toThrow();

      server.close();
    });

    it('should handle error returned when server goes down', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        res.end();
      });

      const server = app.listen();
      await once(server, 'listening');
      const url = 'http://localhost:' + (server.address() as AddressInfo).port;
      server.close();

      await expect(request(url).get('/').expect(200)).rejects.toThrow();
    });
  });

  describe('.expectHeader(name, fn)', function () {
    it('should expect header exists', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        res.setHeader('Foo-Bar', 'ok');
        res.send('hey');
      });

      await request(app)
        .get('/')
        .expect(200)
        .expectHeader('Foo-Bar')
        .expectHeader('content-type');
    });

    it('should expect header exists with callback', async () => {
      const app = express();

      app.get('/', function (_req, res) {
        res.setHeader('Foo-Bar', 'ok');
        res.send('hey');
      });

      await request(app).get('/').expect(200).expectHeader('Foo-Bar');
    });
  });

  describe('.unexpectHeader(name, fn)', () => {
    it('should expect header not exists', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('hey');
      });

      await request(app).get('/').expect(200).unexpectHeader('Foo-Bar');
    });

    it('should expect header not exists with callback', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('hey');
      });

      await request(app).get('/').expect(200).unexpectHeader('Foo-Bar');
    });
  });

  describe('.expect(status[, fn])', () => {
    it('should assert the response status', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('hey');
      });

      try {
        await request(app).get('/').expect(404);
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe('expected 404 "Not Found", got 200 "OK"');
        shouldIncludeStackWithThisFile(err);
      }
    });
  });

  describe('.expect(status)', () => {
    it('should handle connection error', async () => {
      const req = request.agent('http://127.0.0.1:1234');

      try {
        await req.get('/').expect(200);
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe('ECONNREFUSED: Connection refused');
      }
    });
  });

  describe('.expect(status)', () => {
    it('should assert only status', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('hey');
      });

      await request(app).get('/').expect(200);
    });
  });

  describe('.expect(statusArray)', () => {
    it('should assert only status', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('hey');
      });

      await request(app).get('/').expect([200, 404]);
    });

    it('should reject if status is not in valid statuses array', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('hey');
      });

      try {
        await request(app).get('/').expect([500, 404]);
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe('expected one of "500, 404", got 200 "OK"');
        shouldIncludeStackWithThisFile(err);
      }
    });
  });

  describe('.expect(status, body[, fn])', () => {
    it('should assert the response body and status', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('foo');
      });

      await request(app).get('/').expect(200, 'foo');
    });

    describe('when the body argument is an empty string', () => {
      it('should not quietly pass on failure', async () => {
        const app = express();

        app.get('/', (_req, res) => {
          res.send('foo');
        });

        try {
          await request(app).get('/').expect(200, '');
          expect(true).toBe(false); // Should not reach here
        } catch (err: any) {
          expect(err instanceof Error).toBe(true);
          expect(err.message).toBe("expected '' response body, got 'foo'");
          shouldIncludeStackWithThisFile(err);
        }
      });
    });
  });

  describe('.expect(body[, fn])', () => {
    it('should assert the response body', async () => {
      const app = express();

      app.set('json spaces', 0);

      app.get('/', (_req, res) => {
        res.send({ foo: 'bar' });
      });

      try {
        await request(app).get('/').expect('hey');
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe(
          'expected \'hey\' response body, got \'{"foo":"bar"}\''
        );
        shouldIncludeStackWithThisFile(err);
      }
    });

    it('should assert the status before the body', async () => {
      const app = express();

      app.set('json spaces', 0);

      app.get('/', (_req, res) => {
        res.status(500).send({ message: 'something went wrong' });
      });

      try {
        await request(app).get('/').expect(200).expect('hey');
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe(
          'expected 200 "OK", got 500 "Internal Server Error"'
        );
        shouldIncludeStackWithThisFile(err);
      }
    });

    it('should assert the response text', async () => {
      const app = express();

      app.set('json spaces', 0);

      app.get('/', (_req, res) => {
        res.send({ foo: 'bar' });
      });

      await request(app).get('/').expect('{"foo":"bar"}');
    });

    it('should assert the parsed response body', async () => {
      const app = express();

      app.set('json spaces', 0);

      app.get('/', (_req, res) => {
        res.send({ foo: 'bar' });
      });

      try {
        await request(app).get('/').expect({ foo: 'baz' });
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof Error).toBe(true);
        expect(err.message).toBe(
          "expected { foo: 'baz' } response body, got { foo: 'bar' }"
        );
        shouldIncludeStackWithThisFile(err);
      }

      await request(app).get('/').expect({ foo: 'bar' });
    });

    it('should test response object types', async () => {
      const app = express();
      app.get('/', (_req, res) => {
        res.status(200).json({ stringValue: 'foo', numberValue: 3 });
      });

      await request(app)
        .get('/')
        .expect({ stringValue: 'foo', numberValue: 3 });
    });

    it('should deep test response object types', async () => {
      const app = express();
      app.get('/', (_req, res) => {
        res.status(200).json({
          stringValue: 'foo',
          numberValue: 3,
          nestedObject: { innerString: '5' },
        });
      });

      try {
        await request(app)
          .get('/')
          .expect({
            stringValue: 'foo',
            numberValue: 3,
            nestedObject: { innerString: 5 },
          });
        expect(true).toBe(false); // Should not reach here
      } catch (err: any) {
        expect(err instanceof Error).toBe(true);
        expect(err.message.replace(/[^a-zA-Z]/g, '')).toBe(
          "expected {\n  stringValue: 'foo',\n  numberValue: 3,\n  nestedObject: { innerString: 5 }\n} response body, got {\n  stringValue: 'foo',\n  numberValue: 3,\n  nestedObject: { innerString: '5' }\n}".replace(
            /[^a-zA-Z]/g,
            ''
          )
        ); // eslint-disable-line max-len
        shouldIncludeStackWithThisFile(err);
      }

      await request(app)
        .get('/')
        .expect({
          stringValue: 'foo',
          numberValue: 3,
          nestedObject: { innerString: '5' },
        });
    });

    it('should support parsed response arrays', async () => {
      const app = express();
      app.get('/', (_req, res) => {
        res.status(200).json(['a', { id: 1 }]);
      });

      await request(app)
        .get('/')
        .expect(['a', { id: 1 }]);
    });

    it('should support empty array responses', async () => {
      const app = express();
      app.get('/', (_req, res) => {
        res.status(200).json([]);
      });

      await request(app).get('/').expect([]);
    });

    it('should support regular expressions', async () => {
      const app = express();

      app.get('/', (_req, res) => {
        res.send('foobar');
      });

      await expect(async () => {
        await request(app).get('/').expect(/^bar/);
      }).rejects.toThrow("expected body 'foobar' to match /^bar/");
    });
  });

  it('should assert response body multiple times', async () => {
    const app = express();

    app.get('/', (_req, res) => {
      res.send('hey tj');
    });

    await expect(async () => {
      await request(app).get('/').expect(/tj/).expect('hey').expect('hey tj');
    }).rejects.toThrow("expected 'hey' response body, got 'hey tj'");
  });

  it('should assert response body multiple times with no exception', async () => {
    const app = express();

    app.get('/', (_req, res) => {
      res.send('hey tj');
    });

    await request(app).get('/').expect(/tj/).expect(/^hey/).expect('hey tj');
  });
});

describe('.expect(field, value[, fn])', () => {
  it('should assert the header field presence', async () => {
    const app = express();

    app.get('/', (_req, res) => {
      res.send({ foo: 'bar' });
    });

    await expect(async () => {
      await request(app).get('/').expect('Content-Foo', 'bar');
    }).rejects.toThrow('expected "Content-Foo" header field');
  });

  it('should assert the header field value', async () => {
    const app = express();

    app.get('/', (_req, res) => {
      res.send({ foo: 'bar' });
    });

    await expect(async () => {
      await request(app).get('/').expect('Content-Type', 'text/html');
    }).rejects.toThrow(
      'expected "Content-Type" of "text/html", got "application/json; charset=utf-8"'
    );
  });

  it('should assert multiple fields', async () => {
    const app = express();

    app.get('/', (_req, res) => {
      res.send('hey');
    });

    await request(app)
      .get('/')
      .expect('Content-Type', 'text/html; charset=utf-8')
      .expect('Content-Length', '3');
  });

  it('should support regular expressions', async () => {
    const app = express();

    app.get('/', (_req, res) => {
      res.send('hey');
    });

    await expect(async () => {
      await request(app)
        .get('/')
        .expect('Content-Type', /^application/);
    }).rejects.toThrow(
      'expected "Content-Type" matching /^application/, got "text/html; charset=utf-8"'
    );
  });

  it('should support numbers', async () => {
    const app = express();

    app.get('/', (_req, res) => {
      res.send('hey');
    });

    await expect(async () => {
      await request(app).get('/').expect('Content-Length', 4);
    }).rejects.toThrow('expected "Content-Length" of "4", got "3"');
  });

  describe('handling arbitrary expect functions', () => {
    let app: Express;
    let get: Test;

    beforeAll(() => {
      app = express();
      app.get('/', (_req, res) => {
        res.send('hey');
      });
    });

    beforeEach(() => {
      get = request(app).get('/');
    });

    it('reports errors', async () => {
      await expect(async () => {
        await get.expect(throwError('failed'));
      }).rejects.toThrow('failed');
    });

    // this scenario should never happen after https://github.com/ladjs/supertest/pull/767
    // meant for test coverage for lib/test.js#287
    // https://github.com/ladjs/supertest/blob/e064b5ae71e1dfa3e1a74745fda527ac542e1878/lib/test.js#L287
    it.skip('_assertFunction should catch and return error', async () => {
      const error = new Error('failed');
      const returnedError = get
        // private api
        ._assertFunction(() => {
          throw error;
        }, {} as any);
      get.end(() => {
        assert(returnedError instanceof Error);
        expect(returnedError).toBe(error);
        expect(returnedError.message).toBe('failed');
        shouldIncludeStackWithThisFile(returnedError);
      });
    });

    it.skip('ensures truthy non-errors returned from asserts are not promoted to errors', async () => {
      await expect(async () => {
        await get.expect(function () {
          return 'some descriptive error';
        });
      }).rejects.toThrow('some descriptive error');
    });

    it('ensures truthy errors returned from asserts are throw to end', async () => {
      await expect(async () => {
        await get.expect(throwError('some descriptive error'));
      }).rejects.toThrow('some descriptive error');
    });

    it("doesn't create false negatives", async () => {
      await get.expect(function () {});
    });

    it("doesn't create false negatives on non error objects", async () => {
      const handler = {
        get() {
          throw Error('Should not be called for non Error objects');
        },
      };
      const proxy = new Proxy({}, handler); // eslint-disable-line no-undef
      await get.expect(() => proxy);
    });

    it('handles multiple asserts', async () => {
      const calls: number[] = [];
      await get
        .expect(function () {
          calls[0] = 1;
        })
        .expect(function () {
          calls[1] = 1;
        })
        .expect(function () {
          calls[2] = 1;
        });
      expect(calls).toEqual([1, 1, 1]);
    });

    it('plays well with normal assertions - no false positives', async () => {
      await expect(async () => {
        await get.expect(() => {}).expect('Content-Type', /json/);
      }).rejects.toThrow(
        'expected "Content-Type" matching /json/, got "text/html; charset=utf-8"'
      );
    });

    it('plays well with normal assertions - no false negatives', async () => {
      get
        .expect(function () {})
        .expect('Content-Type', /html/)
        .expect(function () {})
        .expect('Content-Type', /text/);
    });
  });

  describe('handling multiple assertions per field', function () {
    it('should work', async () => {
      const app = express();
      app.get('/', function (_req, res) {
        res.send('hey');
      });

      await request(app)
        .get('/')
        .expect('Content-Type', /text/)
        .expect('Content-Type', /html/);
    });

    it('should return an error if the first one fails', async () => {
      const app = express();
      app.get('/', function (_req, res) {
        res.send('hey');
      });

      await expect(async () => {
        await request(app)
          .get('/')
          .expect('Content-Type', /bloop/)
          .expect('Content-Type', /html/);
      }).rejects.toThrow(
        'expected "Content-Type" matching /bloop/, got "text/html; charset=utf-8"'
      );
    });

    it('should return an error if a middle one fails', async () => {
      const app = express();
      app.get('/', function (_req, res) {
        res.send('hey');
      });

      await expect(async () => {
        await request(app)
          .get('/')
          .expect('Content-Type', /text/)
          .expect('Content-Type', /bloop/)
          .expect('Content-Type', /html/);
      }).rejects.toThrow(
        'expected "Content-Type" matching /bloop/, got "text/html; charset=utf-8"'
      );
    });

    it('should return an error if the last one fails', async () => {
      const app = express();
      app.get('/', function (_req, res) {
        res.send('hey');
      });

      await expect(async () => {
        await request(app)
          .get('/')
          .expect('Content-Type', /text/)
          .expect('Content-Type', /html/)
          .expect('Content-Type', /bloop/);
      }).rejects.toThrow(
        'expected "Content-Type" matching /bloop/, got "text/html; charset=utf-8"'
      );
    });
  });
});

describe('request.agent(app)', function () {
  const app = express();
  const agent = request.agent(app).set('header', 'hey');

  app.use(cookieParser());

  app.get('/', function (_req, res) {
    res.cookie('cookie', 'hey');
    res.send();
  });

  app.trace('/', function (_req, res) {
    res.cookie('cookie', 'hey');
    res.send('trace method');
  });

  app.get('/return_cookies', function (req, res) {
    if (req.cookies.cookie) res.send(req.cookies.cookie);
    else res.send(':(');
  });

  app.get('/return_headers', function (req, res) {
    if (req.get('header')) res.send(req.get('header'));
    else res.send(':(');
  });

  it('should save cookies', async () => {
    await agent.get('/').expect('set-cookie', 'cookie=hey; Path=/');
  });

  it('should send cookies', async () => {
    await agent.get('/return_cookies').expect('hey');
  });

  it('should send global agent headers', async () => {
    await agent.get('/return_headers').expect('hey');
  });

  it('should trace method work', async () => {
    await agent.trace('/').expect('trace method');
  });
});

describe('agent.host(host)', function () {
  it('should set request hostname', async () => {
    const app = express();
    const agent = request.agent(app);

    app.get('/', function (req, res) {
      res.send({ hostname: req.hostname });
    });

    const res = await agent.host('something.test').get('/');

    expect(res.body.hostname).toBe('something.test');
  });
});

describe('.<http verb> works as expected', function () {
  it('.delete should work', async () => {
    const app = express();
    app.delete('/', function (_req, res) {
      res.sendStatus(200);
    });

    await request(app).delete('/').expect(200);
  });
  it('.del should work', async () => {
    const app = express();
    app.delete('/', function (_req, res) {
      res.sendStatus(200);
    });

    await request(app).del('/').expect(200);
  });
  it('.get should work', async () => {
    const app = express();
    app.get('/', function (_req, res) {
      res.sendStatus(200);
    });

    await request(app).get('/').expect(200);
  });
  it('.post should work', async () => {
    const app = express();
    app.post('/', function (_req, res) {
      res.sendStatus(200);
    });

    await request(app).post('/').expect(200);
  });
  it('.put should work', async () => {
    const app = express();
    app.put('/', function (_req, res) {
      res.sendStatus(200);
    });

    await request(app).put('/').expect(200);
  });
  it('.head should work', async () => {
    const app = express();
    app.head('/', function (_req, res) {
      res.statusCode = 200;
      res.set('Content-Encoding', 'gzip');
      res.set('Content-Length', '1024');
      res.status(200);
      res.end();
    });

    const res = await request(app)
      .head('/')
      .set('accept-encoding', 'gzip, deflate');

    expect(res).toHaveProperty('statusCode', 200);
    expect(res.headers).toHaveProperty('content-length', '1024');
  });
});

describe('assert ordering by call order', function () {
  it('should assert the body before status', async () => {
    const app = express();

    app.set('json spaces', 0);

    app.get('/', function (_req, res) {
      res.status(500).json({ message: 'something went wrong' });
    });

    request(app)
      .get('/')
      .expect('hey')
      .expect(200)
      .end(function (err) {
        assert(err instanceof Error);
        expect(err.message).toBe(
          "expected 'hey' response body, " +
            'got \'{"message":"something went wrong"}\''
        );
        shouldIncludeStackWithThisFile(err);
      });
  });

  it('should assert the status before body', async () => {
    const app = express();

    app.set('json spaces', 0);

    app.get('/', function (_req, res) {
      res.status(500).json({ message: 'something went wrong' });
    });

    request(app)
      .get('/')
      .expect(200)
      .expect('hey')
      .end(function (err) {
        assert(err instanceof Error);
        expect(err.message).toBe(
          'expected 200 "OK", got 500 "Internal Server Error"'
        );
        shouldIncludeStackWithThisFile(err);
      });
  });

  it('should assert the fields before body and status', async () => {
    const app = express();

    app.set('json spaces', 0);

    app.get('/', function (_req, res) {
      res.status(200).json({ hello: 'world' });
    });

    request(app)
      .get('/')
      .expect('content-type', /html/)
      .expect('hello')
      .end(function (err) {
        assert(err instanceof Error);
        expect(err.message).toBe(
          'expected "content-type" matching /html/, ' +
            'got "application/json; charset=utf-8"'
        );
        shouldIncludeStackWithThisFile(err);
      });
  });

  it('should call the expect function in order', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.status(200).json({});
    });

    request(app)
      .get('/')
      .expect(function (res) {
        res.body.first = 1;
      })
      .expect(function (res) {
        expect(res.body.first === 1).toBe(true);
        res.body.second = 2;
      })
      .end(function (err, res) {
        if (err) throw err;
        expect(res.body.first === 1).toBe(true);
        expect(res.body.second === 2).toBe(true);
      });
  });

  it('should call expect(fn) and expect(status, fn) in order', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.status(200).json({});
    });

    request(app)
      .get('/')
      .expect(function (res) {
        res.body.first = 1;
      })
      .expect(200, function (err, res) {
        expect(err === null).toBe(true);
        expect(res.body.first === 1).toBe(true);
      });
  });

  it('should call expect(fn) and expect(header,value) in order', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.set('X-Some-Header', 'Some value').send();
    });

    request(app)
      .get('/')
      .expect('X-Some-Header', 'Some value')
      .expect(function (res) {
        res.headers['x-some-header'] = '';
      })
      .expect('X-Some-Header', '');
  });

  it('should call expect(fn) and expect(body) in order', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.json({ somebody: 'some body value' });
    });

    request(app)
      .get('/')
      .expect(/some body value/)
      .expect(function (res) {
        res.body.somebody = 'nobody';
      })
      .expect(/some body value/) // res.text should not be modified.
      .expect({ somebody: 'nobody' })
      .expect(function (res) {
        res.text = 'gone';
      })
      .expect('gone')
      .expect(/gone/)
      .expect({ somebody: 'nobody' }) // res.body should not be modified
      .expect('gone');
  });
});

describe('request.get(url).query(vals) works as expected', function () {
  it('normal single query string value works', async () => {
    const app = express();
    app.get('/', function (req, res) {
      res.status(200).send(req.query.val);
    });

    request(app)
      .get('/')
      .query({ val: 'Test1' })
      .expect(200, function (err, res) {
        assert.equal(err, null);
        expect(res.text).toBe('Test1');
      });
  });

  it('array query string value works', async () => {
    const app = express();
    app.get('/', function (req, res) {
      res.status(200).send(Array.isArray(req.query.val));
    });

    request(app)
      .get('/')
      .query({ 'val[]': ['Test1', 'Test2'] })
      .expect(200, function (err, res: any) {
        assert.equal(err, null);
        expect(res.req.path).toBe('/?val%5B%5D=Test1&val%5B%5D=Test2');
        expect(res.text).toBe('true');
      });
  });

  it('array query string value work even with single value', async () => {
    const app = express();
    app.get('/', function (req, res) {
      res.status(200).send(Array.isArray(req.query.val));
    });

    request(app)
      .get('/')
      .query({ 'val[]': ['Test1'] })
      .expect(200, function (err, res: any) {
        assert.equal(err, null);
        expect(res.req.path).toBe('/?val%5B%5D=Test1');
        expect(res.text).toBe('true');
      });
  });

  it('object query string value works', async () => {
    const app = express();
    app.get('/', function (req: any, res) {
      res.status(200).send(req.query.val.test);
    });

    request(app)
      .get('/')
      .query({ val: { test: 'Test1' } })
      .expect(200, function (err, res) {
        assert.equal(err, null);
        expect(res.text).toBe('Test1');
      });
  });

  it('handles unknown errors (err without res)', async () => {
    const app = express();

    nock.disableNetConnect();

    app.get('/', function (_req, res) {
      res.status(200).send('OK');
    });

    request(app)
      .get('/')
      // This expect should never get called, but exposes this issue with other
      // errors being obscured by the response assertions
      // https://github.com/ladjs/supertest/issues/352
      .expect(200)
      .end(function (err, res) {
        expect(err).toBeDefined();
        expect(res).toBeUndefined();
        expect(err! instanceof Error).toBe(true);
        expect(err!.message).toMatch(/Nock: Disallowed net connect/);
        shouldIncludeStackWithThisFile(err!);
      });

    nock.restore();
  });

  // this scenario should never happen
  // there shouldn't be any res if there is an err
  // meant for test coverage for lib/test.js#169
  // https://github.com/ladjs/supertest/blob/5543d674cf9aa4547927ba6010d31d9474950dec/lib/test.js#L169
  it('handles unknown errors (err with res)', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.status(200).send('OK');
    });

    const resError = new Error();
    (resError as any).status = 400;

    const serverRes = { status: 200 };

    await request(app)
      .get('/')
      // private api
      .assert(resError, serverRes as any, function (this: Test, err, res) {
        expect(err).toBeDefined();
        expect(res).toBeDefined();
        expect(err!).toBe(resError);
        expect(res).toBe(serverRes);
        // close the server explicitly (as we are not using expect/end/then)
        // @ts-expect-error
        this.end();
      });
  });

  it('should assert using promises', async () => {
    const app = express();

    app.get('/', function (_req, res) {
      res.status(400).send({ promise: true });
    });

    request(app)
      .get('/')
      .expect(400)
      .then(res => {
        expect(res.body.promise).toBe(true);
      });
  });
});
