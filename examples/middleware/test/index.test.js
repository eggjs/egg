'use strict';

const path = require('path');
const request = require('supertest');
const mm = require('egg-mock');

describe('example middleware test', () => {
  let app;

  before(() => {
    const baseDir = path.dirname(__dirname);
    const customEgg = path.join(baseDir, '../..');
    app = mm.app({
      baseDir,
      customEgg,
    });
    return app.ready();
  });

  after(() => app.close());

  it('should GET / 200', () => {
    return request(app.callback())
      .get('/')
      .expect(200)
      .expect(app.config.hello.text);
  });
});
