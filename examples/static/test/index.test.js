'use strict';

const path = require('path');
const request = require('supertest');
const mm = require('egg-mock');

describe('example static test', () => {
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
      .expect(/<li>Download <a href="\/public\/hi\.txt">hi\.txt<\/a>\.<\/li>/);
  });

  it('should GET /public/hi.txt', () => {
    return request(app.callback())
      .get('/public/hi.txt')
      .expect(200)
      .expect('hi egg.\n你好，蛋蛋。\n');
  });
});
