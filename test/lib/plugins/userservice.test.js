'use strict';

const request = require('supertest-as-promised');
const utils = require('../../utils');

describe.skip('test/lib/plugins/userservice.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/userservice');
    return app.ready();
  });
  after(() => app.close());

  it('should get user and userId', () => {
    return request(app.callback())
      .get('/?uid=456&name=fengmk2')
      .expect({
        userId: '456',
        user: {
          uid: '456',
          name: 'fengmk2',
        },
      })
      .expect(200);
  });
});
