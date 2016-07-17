'use strict';

const querystring = require('querystring');
const should = require('should');
const request = require('supertest');
const utils = require('../../../../utils');

describe('test/lib/core/app/middleware/body_parser.test.js', () => {
  let app;
  before(done => {
    app = utils.app('apps/body_parser_testapp');
    const that = this;

    app.ready(() => {
      request(app.callback())
      .get('/test/body_parser/user')
      .expect(200, (err, res) => {
        should.not.exist(err);
        that.csrf = res.body.csrf || '';
        // that.cookies = res.headers['set-cookie'].join(';');
        // res.headers['set-cookie'].forEach(function(cookie) {
        //   const item = cookie.split(';')[0].trim().split('=');
        //   if (item[0] === 'ctoken') {
        //     that.ctoken = item[1];
        //   }
        // });
        // should.exist(that.csrf);
        done();
      });
    });
  });

  after(() => {
    app.close();
  });

  it('should 200 when post form body below the limit', done => {
    request(app.callback())
    .post('/test/body_parser/user')
    // .set('Cookie', this.cookies)
    .set('Content-Type', 'application/x-www-form-urlencoded')
    .set('Accept', 'application/json')
    .send(querystring.stringify({ foo: 'bar', _csrf: this.csrf }))
    .expect({ foo: 'bar', _csrf: this.csrf })
    .expect(200, done);
  });

  it('should 200 when post json body below the limit', done => {
    request(app.callback())
    .post('/test/body_parser/user')
    // .set('Cookie', this.cookies)
    .set('Content-Type', 'application/json')
    .send({ foo: 'bar', _csrf: this.csrf })
    .expect({ foo: 'bar', _csrf: this.csrf })
    .expect(200, done);
  });
});
