import { readFileSync } from 'node:fs';
import { once } from 'node:events';
import { rm } from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { AddressInfo } from 'node:net';
import {
  mm, MockOptions, MockApplication,
} from '@eggjs/mock';
import { Application as Koa } from '@eggjs/koa';
import { request } from '@eggjs/supertest';
import {
  startEgg, StartEggOptions,
} from '../src/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');
const eggPath = path.join(__dirname, '..');

export async function rimraf(target: string) {
  await rm(target, { force: true, recursive: true });
}

export { MockApplication, MockOptions, mm } from '@eggjs/mock';
export const restore = () => mm.restore();

export function app(name: string | MockOptions, options?: MockOptions) {
  options = formatOptions(name, options);
  const app = mm.app(options);
  return app;
  // return app as unknown as MockApplication;
}

export const createApp = app;

/**
 * start app with cluster mode
 *
 * @param {String} name - cluster name.
 * @param {Object} [options] - optional
 * @return {App} app - Application object.
 */
export function cluster(name: string | MockOptions, options?: MockOptions): MockApplication {
  options = formatOptions(name, options);
  return mm.cluster(options) as unknown as MockApplication;
}

/**
 * start app with single process mode
 *
 * @param {String} baseDir - base dir.
 * @param {Object} [options] - optional
 * @return {App} app - Application object.
 */
export async function singleProcessApp(baseDir: string, options: StartEggOptions = {}): Promise<MockApplication> {
  if (!baseDir.startsWith('/')) {
    baseDir = path.join(__dirname, 'fixtures', baseDir);
  }
  options.env = options.env || 'unittest';
  options.baseDir = baseDir;
  const app = await startEgg(options);
  Reflect.set(app, 'httpRequest', () => request(app.callback()));
  return app as unknown as MockApplication;
}

let localServer: http.Server | undefined;
process.once('beforeExit', () => {
  localServer && localServer.close();
  localServer = undefined;
});
process.once('exit', () => {
  localServer && localServer.close();
  localServer = undefined;
});

export async function startLocalServer() {
  if (localServer) {
    const address = localServer.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }

  let retry = false;
  const app = new Koa();
  app.use(async ctx => {
    if (ctx.path === '/get_headers') {
      ctx.body = ctx.request.headers;
      return;
    }

    if (ctx.path === '/timeout') {
      await exports.sleep(10000);
      ctx.body = `${ctx.method} ${ctx.path}`;
      return;
    }

    if (ctx.path === '/error') {
      ctx.status = 500;
      ctx.body = 'this is an error';
      return;
    }

    if (ctx.path === '/retry') {
      if (!retry) {
        retry = true;
        ctx.status = 500;
      } else {
        ctx.set('x-retry', '1');
        ctx.body = 'retry suc';
        retry = false;
      }
      return;
    }

    ctx.body = `${ctx.method} ${ctx.path}`;
  });
  localServer = http.createServer(app.callback());
  localServer.listen(0);
  await once(localServer, 'listening');
  const address = localServer!.address() as AddressInfo;
  return `http://127.0.0.1:${address.port}`;
}

export function getFilepath(name: string) {
  return path.join(fixtures, name);
}

export function getJSON(name: string) {
  return JSON.parse(readFileSync(getFilepath(name), 'utf-8'));
}

function formatOptions(name: string | MockOptions, options?: MockOptions) {
  let baseDir;
  if (typeof name === 'string') {
    baseDir = name;
  } else {
    // name is options
    options = name;
    baseDir = options.baseDir!;
  }
  if (!baseDir.startsWith('/')) {
    baseDir = path.join(__dirname, 'fixtures', baseDir);
  }
  return {
    baseDir,
    framework: eggPath,
    cache: false,
    // change default mockCtxStorage to false because we don't need it in framework test
    mockCtxStorage: false,
    ...options,
  };
}
