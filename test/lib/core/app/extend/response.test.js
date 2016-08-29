'use strict';

const request = require('supertest');
const utils = require('../../../../utils');

describe('test/lib/core/app/extend/response.test.js', () => {
  describe('res.setRawHeader()', () => {
    it('should set headers success', function* () {
      const app = utils.app('apps/response-raw-header');
      yield app.ready();
      yield request(app.callback())
      .get('/')
      .expect(res => {
        res.headers.foo.should.equal('bar');
        res.headers.bar.should.equal('foo, bar');
        res.res.rawHeaders.filter(header => header === 'Foo-Bar').length.should.equal(2);
        res.headers['foo-bar'].should.equal('Foo, Bar');
      });
    });
  });
});
