'use strict';

const utils = require('../../utils');
const request = require('supertest');
const assert = require('assert');

let app;
describe('test/app/extend/response.test.js', () => {

  before(() => {
    app = utils.app('apps/response');
    return app.ready();
  });

  after(() => app.close());

  describe('length and type', () => {
    it('should get lower case header', () => {
      return request(app.callback())
      .get('/')
      .expect(200)
      .expect(res => {
        assert(res.res.rawHeaders.indexOf('content-type') >= 0);
        assert(res.res.rawHeaders.indexOf('content-length') >= 0);
      });
    });
  });
});
