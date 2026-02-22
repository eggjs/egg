import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';

import Koa, { type Context, type Next } from '@eggjs/koa';
import request from '@eggjs/supertest';
import mm from 'mm';
import { describe, it, beforeAll, afterEach } from 'vitest';

import { EggLogger, EggContextLogger } from '../../../src/index.ts';
import { rimraf } from '../../utils.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('test/lib/egg/context_logger.test.ts', () => {
  const filepath = path.join(__dirname, '../../fixtures/tmp/ctx_a.log');
  const filepathc = path.join(__dirname, '../../fixtures/tmp/ctx_b.log');
  const filepathcc = path.join(__dirname, '../../fixtures/tmp/ctx_c.log');
  let app: Koa;

  beforeAll(() => {
    app = new Koa() as Koa & {
      logger: EggLogger;
      cLogger: EggLogger;
      ccLogger: EggLogger;
    };

    (app as unknown as { logger: EggLogger }).logger = new EggLogger({
      file: filepath,
      level: 'INFO',
      consoleLevel: 'NONE',
      flushInterval: 10,
    });
    (app as unknown as { cLogger: EggLogger }).cLogger = new EggLogger({
      file: filepathc,
      level: 'INFO',
      consoleLevel: 'INFO',
      flushInterval: 1,
      contextFormatter: (meta) =>
        `message=${meta.message}&level=${meta.level}&path=${(meta.ctx as Record<string, unknown>)?.path}`,
    });
    (app as unknown as { ccLogger: EggLogger }).ccLogger = new EggLogger({
      file: filepathcc,
      level: 'INFO',
      consoleLevel: 'INFO',
      flushInterval: 1,
      contextFormatter: (meta) => {
        const outputMeta = { ...meta, ctx: undefined };
        return JSON.stringify(outputMeta);
      },
    });

    app.use(async (ctx: Context, next: Next) => {
      if (ctx.path === '/starttime') ctx.starttime = Date.now();
      if (ctx.path === '/performance_starttime') ctx.performanceStarttime = performance.now();
      (ctx as unknown as Record<string, unknown>).logger = new EggContextLogger(
        ctx,
        (app as unknown as { logger: EggLogger }).logger,
      );
      (ctx as unknown as Record<string, unknown>).cLogger = new EggContextLogger(
        ctx,
        (app as unknown as { cLogger: EggLogger }).cLogger,
      );
      (ctx as unknown as Record<string, unknown>).ccLogger = new EggContextLogger(
        ctx,
        (app as unknown as { ccLogger: EggLogger }).ccLogger,
      );
      await next();
    });

    app.use(async (ctx: Context) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      (ctx as unknown as { logger: EggContextLogger }).logger.info('info foo');
      await new Promise((resolve) => setTimeout(resolve, 10));
      (ctx as unknown as { logger: EggContextLogger }).logger.warn('warn foo');
      await new Promise((resolve) => setTimeout(resolve, 10));
      (ctx as unknown as { logger: EggContextLogger }).logger.write('[foo] hi raw log here');
      await new Promise((resolve) => setTimeout(resolve, 10));
      (ctx as unknown as { cLogger: EggContextLogger }).cLogger.info('ctx');
      await new Promise((resolve) => setTimeout(resolve, 10));
      (ctx as unknown as { ccLogger: EggContextLogger }).ccLogger.info('ctx');
      await new Promise((resolve) => setTimeout(resolve, 10));
      ctx.body = 'done';
    });

    Object.defineProperty(app.request, 'ip', { value: '127.0.0.1' });
    app.on('error', (err) => console.log(err));
  });

  afterEach(async () => {
    await rimraf(path.dirname(filepath));
    mm.restore();
    (app as unknown as { logger: EggLogger }).logger.reload();
    (app as unknown as { cLogger: EggLogger }).cLogger.reload();
    (app as unknown as { ccLogger: EggLogger }).ccLogger.reload();
  });

  it('should write ctx log to log file', async () => {
    const res = await request(app.callback()).get('/');
    assert.strictEqual(res.text, 'done');
    assert.match(
      fs.readFileSync(filepath, 'utf8'),
      /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2},\d{3} INFO \d+ \[-\/127.0.0.1\/-\/0ms GET \/\] info foo\n/,
    );
  });

  it('should contains userId/traceId on ctx log', async () => {
    mm(app.context, 'userId', '123123');
    mm(app.context, 'tracer', { traceId: 'aabbccdd' });
    const res = await request(app.callback()).get('/');
    assert.strictEqual(res.text, 'done');
    assert.match(fs.readFileSync(filepath, 'utf8'), /123123\/127.0.0.1\/aabbccdd\/0ms GET \/\] info foo\n/);
  });

  it('should auto log request spent time', async () => {
    const res = await request(app.callback()).get('/starttime');
    assert.strictEqual(res.text, 'done');
    assert.match(fs.readFileSync(filepath, 'utf8'), /\[-\/127.0.0.1\/-\/\d*ms GET \/starttime\] info foo\n/);
  });

  it('should format context logger', async () => {
    const res = await request(app.callback()).get('/');
    assert.strictEqual(res.text, 'done');
    const content = fs.readFileSync(filepathc, 'utf8');
    assert(content.includes('message=ctx&level=INFO&path=/\n'));
  });

  it('should format context logger as json', async () => {
    const res = await request(app.callback()).get('/');
    assert.strictEqual(res.text, 'done');
    const content = fs.readFileSync(filepathcc, 'utf8');
    assert(content.includes('"message":"ctx"'));
    assert(!content.includes('"ctx":'));
  });
});
