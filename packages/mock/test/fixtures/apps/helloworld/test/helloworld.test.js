import { app } from '../../../../../dist/esm/bootstrap.js';

describe('bootstrap test', () => {
  it('should GET /', () => {
    return app.httpRequest()
      .get('/')
      .expect({
        hello: 'world',
      });
  });
});
