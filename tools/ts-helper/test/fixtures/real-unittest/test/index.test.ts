

import { mm } from '@eggjs/mock';
import { app } from '@eggjs/mock/bootstrap';

describe('index.test.js', () => {
  beforeEach(() => {
    app.mockCsrf();
  });

  afterEach(() => {
    mm.restore();
  });

  it('should visit / without error', () => {
    return app
      .httpRequest()
      .get('/')
      .expect(200);
  });
});
