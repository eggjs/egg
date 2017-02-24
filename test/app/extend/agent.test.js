'use strict';

const mm = require('egg-mock');
const utils = require('../../utils');

describe('test/app/extend/agent.test.js', () => {
  afterEach(mm.restore);

  describe('agent.addSingleton()', () => {
    let app;
    before(() => {
      app = utils.app('apps/singleton-demo');
      return app.ready();
    });
    after(() => app.close());

    it('should add singleton success', function* () {
      let config = yield app.agent.dataService.get('second').getConfig();
      config.foo.should.equal('bar');
      config.foo2.should.equal('bar2');

      const ds = app.agent.dataService.createInstance({ foo: 'barrr' });
      config = yield ds.getConfig();
      config.foo.should.equal('barrr');
    });
  });

});
