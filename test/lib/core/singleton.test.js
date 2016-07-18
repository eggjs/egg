'use strict';

const Singleton = require('../../../lib/core/singleton');

class DataService {
  constructor(config) {
    this.config = config;
  }

  * query() {
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
    (app.dataService instanceof DataService).should.be.ok;
    app.dataService.config.foo.should.equal('bar');
    (typeof app.dataService.createInstance).should.equal('function');
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
    (app.dataService instanceof Singleton).should.be.ok;
    app.dataService.get('first').config.foo.should.equal('bar1');
    app.dataService.get('second').config.foo.should.equal('bar2');
    (typeof app.dataService.createInstance).should.equal('function');
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
    (app.dataService instanceof DataService).should.be.ok;
    app.dataService.config.foo.should.equal('bar');
    app.dataService.config.foo1.should.equal('bar1');
    (typeof app.dataService.createInstance).should.equal('function');
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
    (app.dataService instanceof Singleton).should.be.ok;
    app.dataService.get('first').config.foo.should.equal('bar1');
    app.dataService.get('second').config.foo.should.equal('bar');
    (typeof app.dataService.createInstance).should.equal('function');
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
    app.dataService.should.equal(singleton);
    (app.dataService instanceof Singleton).should.be.ok;
    app.dataService = app.dataService.createInstance({ foo1: 'bar1' });
    (app.dataService instanceof DataService).should.be.ok;
    app.dataService.config.foo1.should.equal('bar1');
    app.dataService.config.foo.should.equal('bar');
  });
});
