'use strict';

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

describe('test/lib/core/singleton.test.js', () => {
  it('should init with client', () => {
    const app = {
      config: {
        dataService: {
          client: { foo: 'bar' },
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
    assert(typeof app.dataService.createInstance === 'function');
  });

  it('should init with clients', () => {
    const app = {
      config: {
        dataService: {
          clients: {
            first: { foo: 'bar1' },
            second: { foo: 'bar2' },
          },
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
    assert(app.dataService.get('second').config.foo === 'bar2');
    assert(typeof app.dataService.createInstance === 'function');
  });

  it('should client support default', () => {
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

  it('should clients support default', () => {
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

  it('should createInstance without client/clients support default', () => {
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
});
