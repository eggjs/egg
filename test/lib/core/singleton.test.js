'use strict';

const sleep = require('mz-modules/sleep');
const assert = require('assert');

const Singleton = require('../../../lib/core/singleton');

class DataService {
  constructor(config) {
    this.config = config;
  }

  async query() {
    return {};
  }
}

function create(config) {
  return new DataService(config);
}

async function asyncCreate(config) {
  await sleep(10);
  return new DataService(config);
}

describe('test/lib/core/singleton.test.js', () => {
  it('should init with client', async () => {
    const name = 'dataService';

    const clients = [
      { foo: 'bar' },
    ];
    for (const client of clients) {
      const app = { config: { dataService: { client } } };
      const singleton = new Singleton({
        name,
        app,
        create,
      });
      singleton.init();
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

    const app = { config: { dataService: { clients } } };
    const singleton = new Singleton({
      name,
      app,
      create,
    });
    singleton.init();
    assert(app.dataService instanceof Singleton);
    assert(app.dataService.get('first').config.foo === 'bar1');
    assert(app.dataService.get('second').config.foo === 'bar2');
    assert(typeof app.dataService.createInstance === 'function');
  });

  it('should client support default', async () => {
    const app = {
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
    assert(app.dataService.config.foo === 'bar');
    assert(app.dataService.config.foo1 === 'bar1');
    assert(typeof app.dataService.createInstance === 'function');
  });

  it('should clients support default', async () => {
    const app = {
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
    assert(app.dataService.get('second').config.foo === 'bar');
    assert(typeof app.dataService.createInstance === 'function');
  });

  it('should createInstance without client/clients support default', async () => {
    const app = {
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

  it('should createInstanceAsync without client/clients support default', async () => {
    const app = {
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
    app.dataService = await app.dataService.createInstanceAsync({ foo1: 'bar1' });
    assert(app.dataService instanceof DataService);
    assert(app.dataService.config.foo1 === 'bar1');
    assert(app.dataService.config.foo === 'bar');
  });

  describe('async create', () => {
    it('should init with client', async () => {
      const name = 'dataService';

      const clients = [
        { foo: 'bar' },
      ];
      for (const client of clients) {
        const app = { config: { dataService: { client } } };
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

      const app = { config: { dataService: { clients } } };
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
      const app = {
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

    it('should createInstance throw error', async () => {
      const app = {
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
      } catch (err) {
        assert(err.message === 'egg:singleton dataService only support create asynchronous, please use createInstanceAsync');
      }
    });
  });
});
