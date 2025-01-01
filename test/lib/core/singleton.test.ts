import { strict as assert } from 'node:assert';
import { scheduler } from 'node:timers/promises';
import { Singleton } from '../../../src/lib/core/singleton.js';

class DataService {
  config: any;
  constructor(config: any) {
    this.config = config;
  }

  async query() {
    return {};
  }
}

function create(config: any) {
  return new DataService(config);
}

async function asyncCreate(config: any) {
  await scheduler.wait(10);
  return new DataService(config);
}

describe('test/lib/core/singleton.test.ts', () => {
  afterEach(() => {
    delete (DataService as any).prototype.createInstance;
    delete (DataService as any).prototype.createInstanceAsync;
  });

  describe('sync singleton creation tests', () => {
    it('should init with client', async () => {
      const name = 'dataService';

      const clients = [
        { foo: 'bar' },
      ];
      for (const client of clients) {
        const app: any = { config: { dataService: { client } } };
        const singleton = new Singleton({
          name,
          app,
          create,
        });
        singleton.init();
        assert(app.dataService instanceof DataService);
        assert.equal(app.dataService.config.foo, 'bar');
        assert.equal(typeof app.dataService.createInstance, 'function');
      }
    });

    it('should init with clients', async () => {
      const name = 'dataService';

      const clients = {
        first: { foo: 'bar1' },
        second: { foo: 'bar2' },
      };

      const app: any = { config: { dataService: { clients } } };
      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();
      assert(app.dataService instanceof Singleton);
      assert.equal(app.dataService.get('first').config.foo, 'bar1');
      assert.equal(app.dataService.get('second').config.foo, 'bar2');
      assert.equal(typeof app.dataService.createInstance, 'function');
    });

    it('should client support default', async () => {
      const app: any = {
        config: {
          dataService: {
            client: { foo: 'bar' },
            default: { foo1: 'bar1' },
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();
      assert(app.dataService instanceof DataService);
      assert.equal(app.dataService.config.foo, 'bar');
      assert.equal(app.dataService.config.foo1, 'bar1');
      assert.equal(typeof app.dataService.createInstance, 'function');
    });

    it('should clients support default', async () => {
      const app: any = {
        config: {
          dataService: {
            clients: {
              first: { foo: 'bar1' },
              second: { },
            },
            default: { foo: 'bar' },
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();
      assert(app.dataService instanceof Singleton);
      assert(app.dataService.get('first').config.foo === 'bar1');
      assert(app.dataService.getSingletonInstance('first').config.foo === 'bar1');
      assert(app.dataService.get('first'), app.dataService.getSingletonInstance('first'));
      assert(app.dataService.get('second').config.foo === 'bar');
      assert(app.dataService.getSingletonInstance('second').config.foo === 'bar');
      assert(app.dataService.get('second'), app.dataService.getSingletonInstance('second'));
      assert(typeof app.dataService.createInstance === 'function');
    });

    it('should createInstance without client/clients support default', async () => {
      const app: any = {
        config: {
          dataService: {
            default: { foo: 'bar' },
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();
      assert(app.dataService === singleton);
      assert(app.dataService instanceof Singleton);
      app.dataService = app.dataService.createInstance({ foo1: 'bar1' });
      assert(app.dataService instanceof DataService);
      assert(app.dataService.config.foo1 === 'bar1');
      assert(app.dataService.config.foo === 'bar');
    });

    it('should work with unextensible', async () => {
      function create(config: any) {
        const d = new DataService(config);
        Object.preventExtensions(d);
        return d;
      }
      const app: any = {
        config: {
          dataService: {
            client: { foo: 'bar' },
            default: { foo: 'bar' },
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();
      const dataService = await app.dataService.createInstanceAsync({ foo1: 'bar1' });
      assert(dataService instanceof DataService);
      assert(dataService.config.foo1 === 'bar1');
      assert(dataService.config.foo === 'bar');
    });

    it('should work with frozen', async () => {
      function create(config: any) {
        const d = new DataService(config);
        Object.freeze(d);
        return d;
      }
      const app: any = {
        config: {
          dataService: {
            client: { foo: 'bar' },
            default: { foo: 'bar' },
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();

      const dataService = await app.dataService.createInstanceAsync({ foo1: 'bar1' });
      assert(dataService instanceof DataService);
      assert(dataService.config.foo1 === 'bar1');
      assert(dataService.config.foo === 'bar');
    });

    it('should work with no prototype and frozen', async () => {
      let warn = false;
      function create() {
        const d = Object.create(null);
        Object.freeze(d);
        return d;
      }
      const app: any = {
        config: {
          dataService: {
            client: { foo: 'bar' },
            default: { foo: 'bar' },
          },
        },
        coreLogger: {
          warn(_msg: string, name?: string) {
            if (name) {
              assert.equal(name, 'dataService');
              warn = true;
            }
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();

      assert(!app.dataService.createInstance);
      assert(!app.dataService.createInstanceAsync);
      assert(warn);
    });

    it('should return client name when create', async () => {
      let success = true;
      const name = 'dataService';
      const clientName = 'customClient';
      function create(_config: any, _app: any, client: string) {
        if (client !== clientName) {
          success = false;
        }
      }
      const app: any = {
        config: {
          dataService: {
            clients: {
              customClient: { foo: 'bar1' },
            },
          },
        },
      };
      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();

      assert(success);
    });
  });

  describe('async singleton creation tests', () => {
    it('should init with client', async () => {
      const name = 'dataService';

      const clients = [
        { foo: 'bar' },
      ];
      for (const client of clients) {
        const app: any = { config: { dataService: { client } } };
        const singleton = new Singleton({
          name,
          app,
          create: asyncCreate,
        });
        await singleton.init();
        assert(app.dataService instanceof DataService);
        assert(app.dataService.config.foo === 'bar');
        assert(typeof app.dataService.createInstance === 'function');
      }
    });


    it('should init with clients', async () => {
      const name = 'dataService';

      const clients = {
        first: { foo: 'bar1' },
        second: { foo: 'bar2' },
      };

      const app: any = { config: { dataService: { clients } } };
      const singleton = new Singleton({
        name,
        app,
        create: asyncCreate,
      });
      await singleton.init();
      assert(app.dataService instanceof Singleton);
      assert(app.dataService.get('first').config.foo === 'bar1');
      assert(app.dataService.get('second').config.foo === 'bar2');
      assert(typeof app.dataService.createInstance === 'function');
    });

    it('should createInstanceAsync without client/clients support default', async () => {
      const app: any = {
        config: {
          dataService: {
            default: { foo: 'bar' },
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create: asyncCreate,
      });
      await singleton.init();
      assert(app.dataService === singleton);
      assert(app.dataService instanceof Singleton);
      app.dataService = await app.dataService.createInstanceAsync({ foo1: 'bar1' });
      assert(app.dataService instanceof DataService);
      assert(app.dataService.config.foo1 === 'bar1');
      assert(app.dataService.config.foo === 'bar');
    });

    it('should createInstanceAsync throw error', async () => {
      const app: any = {
        config: {
          dataService: {
            default: { foo: 'bar' },
          },
        },
      };
      const name = 'dataService';

      const singleton = new Singleton({
        name,
        app,
        create: asyncCreate,
      });
      await singleton.init();
      assert(app.dataService === singleton);
      assert(app.dataService instanceof Singleton);
      try {
        app.dataService = await app.dataService.createInstance({ foo1: 'bar1' });
        throw new Error('should not execute');
      } catch (err: any) {
        assert.equal(err.message,
          'egg:singleton dataService only support create asynchronous, please use createInstanceAsync');
      }
    });

    it('should return client name when create', async () => {
      let success = true;
      const name = 'dataService';
      const clientName = 'customClient';

      async function _create(_config: any, _app: any, client: string) {
        if (client !== clientName) {
          success = false;
        }
      }
      const app: any = {
        config: {
          dataService: {
            clients: {
              customClient: { foo: 'bar1' },
            },
          },
        },
      };
      const singleton = new Singleton({
        name,
        app,
        create: _create,
      });

      await singleton.init();

      assert(success);
    });
  });
});
