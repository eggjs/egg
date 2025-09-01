import assert from 'node:assert';
import { scheduler } from 'node:timers/promises';
import mm, { MockApplication } from '../src/index.js';
import { getFixtures } from './helper.js';

const baseDir = getFixtures('app-proxy');

describe('test/app_proxy.test.ts', () => {
  afterEach(mm.restore);

  describe('when before ready', () => {
    let app: MockApplication;
    const baseDir = getFixtures('app-proxy-ready');
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
    });
    after(async () => {
      await app.ready();
      await app.close();
    });

    it('should not get property', async () => {
      assert.throws(() => {
        app.config;
      }, /can't get config before ready/);
    });

    it('should not set property', async () => {
      assert.throws(() => {
        (app as any).curl = async function mockCurl() {
          return 'mock';
        };
      }, /can't set curl before ready/);
    });

    it('should not define property', async () => {
      assert.throws(() => {
        Object.defineProperty(app, 'config', {
          value: {},
        });
      }, /can't defineProperty config before ready/);
    });

    it('should not delete property', async () => {
      assert.throws(() => {
        delete (app as any).config;
      }, /can't delete config before ready/);
    });

    it('should not getOwnPropertyDescriptor property', async () => {
      assert.throws(() => {
        Object.getOwnPropertyDescriptor(app, 'config');
      }, /can't getOwnPropertyDescriptor config before ready/);
    });

    it('should not getPrototypeOf property', async () => {
      assert.throws(() => {
        Object.getPrototypeOf(app);
      }, /can't getPrototypeOf before ready/);
    });
  });

  describe('handler.get', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should get property', () => {
      assert(app.getter === 'getter');
      assert(app.method() === 'method');
    });

    it('should ignore when get property on MockApplication', async () => {
      assert.equal(app.isClosed, false);
      assert.equal(app.closed, false);
      await app.close();
      assert.equal(app.isClosed, true);
      assert.equal(app.closed, true);
    });
  });

  describe('handler.set', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should override property with setter', async () => {
      (app as any).curl = async function mockCurl() {
        return 'mock';
      };
      const data = await app.curl('http://127.0.0.1:7001');
      assert.equal(data, 'mock');
    });

    it('should ignore when set property on MockApplication', async () => {
      app.isClosed = true;
      assert(app.isClosed === false);
      await app.close();
    });
  });

  describe('handler.defineProperty', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should defineProperty', async () => {
      assert(app.prop === 1);
      Object.defineProperty(app, 'prop', {
        get() {
          if (!this._prop) {
            this._prop = 0;
          }
          return this._prop++;
        },
        set(prop) {
          if (this._prop) {
            this._prop = this._prop + prop;
          }
        },
      });

      assert(app.prop === 0);
      assert(app.prop === 1);
      app.prop = 2;
      assert(app.prop === 4);
      app.prop = 2;
      assert(app.prop === 7);
    });

    it('should ignore when defineProperty on MockApplication', async () => {
      assert(app.isClosed === false);
      Object.defineProperty(app, 'isClosed', {
        value: true,
      });
      assert(app.isClosed === false);
      assert(!app._app.closed && !app._app.isClosed);
    });
  });

  describe('handler.deleteProperty', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should delete property', () => {
      assert(app.shouldBeDelete === true);
      delete app.shouldBeDelete;
      assert(app.shouldBeDelete === undefined);
    });

    it('should ignore when delete property on MockApplication', async () => {
      assert(!app._app.closed);
      assert(app.isClosed === false);
      delete app.isClosed;
      assert(!app._app.closed);
      assert(app.isClosed === false);
    });
  });

  describe('handler.getOwnPropertyDescriptor', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should getOwnPropertyDescriptor', () => {
      const d = Object.getOwnPropertyDescriptor(app, 'a')!;
      assert(typeof d.get === 'function');
      assert(typeof d.set === 'function');
    });

    it('should ignore when getOwnPropertyDescriptor on MockApplication', async () => {
      const d = Object.getOwnPropertyDescriptor(app, 'closed')!;
      assert.equal(d, undefined);
    });
  });

  describe('handler.getPrototypeOf', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should getPrototypeOf', () => {
      assert(Object.getPrototypeOf(app) === Object.getPrototypeOf(app._app));
    });
  });

  describe('MOCK_APP_METHOD', () => {
    let app: MockApplication;
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should be used on MockApplication', () => {
      const MOCK_APP_METHOD = [
        'ready',
        'isClosed',
        'closed',
        'close',
        '_agent',
        '_app',
        'on',
        'once',
      ];
      for (const key of MOCK_APP_METHOD) {
        assert(app[key] !== app._app[key]);
      }
    });
  });

  describe.skip('messenger binding on app() mode', () => {
    let app: MockApplication;
    const baseDir = getFixtures('messenger-binding');
    before(() => {
      app = mm.app({
        baseDir,
        cache: false,
      });
      return app.ready();
    });
    after(() => app.close());

    it('should send message from app to agent', async () => {
      await scheduler.wait(2000);
      assert.deepEqual(app._agent.received, [
        'send data when app starting',
        'send data when app started',
        'send data to a random agent',
      ]);
    });

    it('should send message from agent to app', () => {
      assert.deepEqual(app._app.received, [
        'send data to app when server started',
        'send data to a random app',
      ]);
    });

    it('should receive egg-ready', () => {
      assert(app._app.eggReady === true);
      assert(app._agent.eggReady === true);
      assert(app._agent.eggReadyData.baseDir === baseDir);
      assert(app._app.eggReadyData.baseDir === baseDir);
    });

    it('should broadcast message successfully', () => {
      assert(app._app.recievedBroadcastAction === true);
      assert(app._agent.recievedBroadcastAction === true);
      assert(app._app.recievedAgentRecievedAction === true);
    });

    it('should send message from app to app', () => {
      assert(app._app.recievedAppAction === true);
    });
  });

  describe('messenger binding on cluster() mode', () => {
    let app: MockApplication;
    const baseDir = getFixtures('messenger-binding');
    before(() => {
      app = mm.cluster({
        baseDir,
        cache: false,
      });
      app.debug();
      return app.ready();
    });
    after(() => app.close());

    // cannot get the app.agent
    it.skip('should send message from app to agent', async () => {
      assert.deepEqual(app._agent.received, [
        'send data when app starting',
        'send data when app started',
        'send data to a random agent',
      ]);
    });

    it('should send message from agent to app', async () => {
      // wait for message received
      await scheduler.wait(500);
      assert.deepEqual(app.getAppInstanceProperty('received'), [
        'send action to all app',
        'send data to app when server started',
        'send data to a random app',
      ]);
    });

    it('should receive egg-ready', () => {
      assert.equal(app.getAppInstanceProperty('eggReady'), true);
    });

    it('should broadcast message successfully', () => {
      assert.equal(app.getAppInstanceProperty('recievedBroadcastAction'), true);
      assert.equal(app.getAppInstanceProperty('recievedAgentRecievedAction'), true);
    });

    it('should send message from app to app', () => {
      assert.equal(app.getAppInstanceProperty('recievedAppAction'), true);
    });
  });
});
