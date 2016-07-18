'use strict';

const request = require('supertest-as-promised');
const utils = require('../../utils');

describe('test/lib/plugins/validate.test.js', () => {
  let app;
  before(() => {
    app = utils.app('apps/validate_form');
    return app.ready();
  });
  after(() => app.close());

  it('should return invalid_param when body empty', () => {
    return request(app.callback())
      .get('/users.json')
      .expect({
        code: 'invalid_param',
        message: 'Validation Failed',
        errors: [
          { field: 'username', code: 'missing_field', message: 'required' },
          { field: 'password', code: 'missing_field', message: 'required' },
        ],
      })
      .expect(422);
  });
});
