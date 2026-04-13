import { strict as assert } from 'node:assert';

import { describe, it, afterAll, beforeAll } from 'vitest';

import { singleProcessApp, type SingleModeApplication } from './utils.ts';

describe('test/start.test.ts', () => {
  describe('metadataOnly mode', () => {
    let app: SingleModeApplication;

    beforeAll(async () => {
      app = await singleProcessApp('apps/metadata-only-app', { metadataOnly: true });
    });

    afterAll(async () => {
      await app.close();
    });

    it('should only call loadMetadata, not normal lifecycle hooks', () => {
      assert.deepStrictEqual(app.bootLog, ['loadMetadata']);
    });

    it('should skip loadRouter — no routes registered', () => {
      assert.strictEqual(app.router.stack.length, 0);
    });

    it('should not create agent', () => {
      assert.strictEqual(app.agent, undefined);
    });
  });

  describe('normal mode (baseline)', () => {
    let app: SingleModeApplication;

    beforeAll(async () => {
      app = await singleProcessApp('apps/metadata-only-app');
    });

    afterAll(async () => {
      await app.close();
    });

    it('should call normal lifecycle hooks, not loadMetadata', () => {
      assert(app.bootLog.includes('configDidLoad'));
      assert(app.bootLog.includes('didLoad'));
      assert(app.bootLog.includes('willReady'));
      assert(!app.bootLog.includes('loadMetadata'));
    });

    it('should register routes', () => {
      assert(app.router.stack.length > 0);
    });

    it('should create agent', () => {
      assert(app.agent);
    });
  });
});
