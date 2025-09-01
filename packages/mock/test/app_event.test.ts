import assert from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { pending } from 'pedding';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

const baseDir = getFixtures('app-event');

describe('test/app_event.test.ts', () => {
  afterEach(mm.restore);

  describe('after ready', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(async () => {
      await app.close();
    });

    it('should listen by eventByRequest', done => {
      done = pending(3, done);
      app.once('eventByRequest', done);
      app.on('eventByRequest', done);

      app.httpRequest()
        .get('/event')
        .expect(200)
        .expect('done', done);
    });
  });

  describe('before ready', () => {
    let app: MockApplication;
    beforeEach(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
    });
    afterEach(() => app.ready());
    afterEach(() => app.close());

    it('should listen after app ready', done => {
      done = pending(2, done);
      app.once('appReady', done);
      app.on('appReady', done);
    });

    it('should listen after app instantiate', done => {
      done = pending(2, done);
      app.once('appInstantiated', done);
      app.on('appInstantiated', done);
    });
  });

  describe('throw before app init', () => {
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

    it('should listen using app.on', done => {
      app.on('error', err => {
        assert.equal(err.message, 'start error');
        done();
      });
    });

    it('should listen using app.once', done => {
      app.once('error', err => {
        assert(err.message === 'start error');
        done();
      });
    });

    it('should throw error from ready', async () => {
      try {
        await app.ready();
      } catch (err: any) {
        assert(err.message === 'start error');
      }
    });

    it('should close when app init failed', async () => {
      app.once('error', () => {});
      await scheduler.wait(1000);
      // app._app is undefined
      await app.close();
    });
  });
});
