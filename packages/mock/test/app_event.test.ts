import assert from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { once } from 'node:events';

import { describe, it, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';

import mm, { type MockApplication } from '../src/index.ts';
import { getFixtures } from './helper.ts';

const baseDir = getFixtures('app-event');

describe('test/app_event.test.ts', () => {
  afterEach(mm.restore);

  describe('after ready', () => {
    let app: MockApplication;
    beforeAll(async () => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      await app.ready();
    });
    afterAll(async () => {
      await app.close();
    });

    it('should work', async () => {
      await app.httpRequest().get('/event').expect(200).expect('done');
    });
  });

  describe.skip('before ready', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
    });
    afterEach(() => app.ready());
    afterEach(() => app.close());

    it('should listen after app ready and instantiate', async () => {
      await once(app, 'appReady');
      await once(app, 'appInstantiated');
    });
  });

  describe.skip('throw before app init', () => {
    let app: MockApplication;
    beforeEach(() => {
      const baseDir = getFixtures('app');
      const customEgg = getFixtures('error-framework');
      app = mm.app({
        baseDir,
        customEgg,
        cache: false,
      });
    });
    afterEach(() => app.close());

    it('should listen error event', async () => {
      // app.on('error', err => {
      //   assert.equal(err.message, 'start error');
      //   await once(app, 'error');
      // });
      await once(app, 'error');
    });

    it('should throw error from ready', async () => {
      await assert.rejects(async () => {
        await app.ready();
      }, /start error/);
    });

    it('should close when app init failed', async () => {
      app.once('error', () => {});
      await scheduler.wait(1000);
      // app._app is undefined
      await app.close();
    });
  });
});
