import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, describe, it } from 'vitest';

import { getFixtures } from '../../utils.ts';

describe('test/app/extends/sjs.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-sjs-app'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  describe('helper.sjs()', () => {
    it('should convert special chars on js context and not convert chart in whitelists', () => {
      return app.httpRequest().get('/sjs').expect(200).expect('true');
    });

    it('should not convert when chars in whitelists', () => {
      return app.httpRequest().get('/sjs-2').expect(200).expect('true');
    });

    it('should convert all special chars on js context except for special', () => {
      return app.httpRequest().get('/sjs-3').expect(200).expect('true');
    });

    it('should only convert special chars plus /', () => {
      return app.httpRequest().get('/sjs-4').expect(200).expect('true');
    });
  });
});
