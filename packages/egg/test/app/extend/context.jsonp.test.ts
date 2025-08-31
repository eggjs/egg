import { createApp, MockApplication } from '../../utils.js';

describe('test/app/extend/context.jsonp.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = createApp('apps/demo');
    return app.ready();
  });
  after(() => app.close());

  it('should response jsonp', () => {
    return app.httpRequest()
      .get('/user.json?_callback=$jQuery110208780175377614796_1406016639408&ctoken=123')
      .set('Cookie', 'ctoken=123')
      .expect('Content-Type', 'application/javascript; charset=utf-8')
      .expect('X-Content-Type-Options', 'nosniff')
      .expect('/**/ typeof $jQuery110208780175377614796_1406016639408 === \'function\' && $jQuery110208780175377614796_1406016639408({"name":"fengmk2"});')
      .expect(200);
  });

  it('should response json body when callback empty', () => {
    return app.httpRequest()
      .get('/user.json?_callback=&ctoken=123')
      .set('Cookie', 'ctoken=123')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect('{"name":"fengmk2"}')
      .expect(200);
  });

  it('should response json body when callback missing', () => {
    return app.httpRequest()
      .get('/user.json?callback=&ctoken=123')
      .set('Cookie', 'ctoken=123')
      .expect('Content-Type', 'application/json; charset=utf-8')
      .expect('{"name":"fengmk2"}')
      .expect(200);
  });
});
