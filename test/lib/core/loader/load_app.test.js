'use strict';

const should = require('should');
const utils = require('../../../utils');

describe('test/lib/core/loader/load_app.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/loader-plugin');
    return app.ready();
  });
  after(() => app.close());

  it('should load app.js', () => {
    app.b.should.equal('plugin b');
    app.c.should.equal('plugin c');
    app.app.should.equal('app');
  });

  it('should load plugin app.js first', () => {
    (app.dateB <= app.date).should.equal(true);
    (app.dateC <= app.date).should.equal(true);
  });

  it('should not load disable plugin', () => {
    should.not.exists(app.a);
  });
});
