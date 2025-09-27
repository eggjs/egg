import { mm, type MockApplication } from '@eggjs/mock';
import { beforeAll, afterAll, describe, it } from 'vitest';

import { getFixtures } from '../../utils.ts';

describe('test/app/extends/spath.test.ts', () => {
  let app: MockApplication;
  beforeAll(async () => {
    app = mm.app({
      baseDir: getFixtures('apps/helper-spath-app'),
    });
    await app.ready();
  });

  afterAll(() => app.close());

  describe('helper.spath()', () => {
    it('should pass when filepath is safe', () => {
      return app.httpRequest().get('/safepath').expect(200).expect('true');
    });

    it('should return null when filepath is not safe(contains ..)', () => {
      return app.httpRequest().get('/unsafepath').expect(200).expect('true');
    });

    it('should return null when filepath is not safe(contains /)', () => {
      return app.httpRequest().get('/unsafepath2').expect(200).expect('true');
    });

    it('should decode first when filepath contains %', () => {
      return app.httpRequest().get('/unsafepath3').expect(200).expect('true');
    });

    it('should decode until filepath does not contains %', () => {
      return app.httpRequest().get('/unsafepath4').expect(200).expect('true');
    });

    it('should not affect function when filepath decoding failed', () => {
      return app.httpRequest().get('/unsafepath5').expect(200).expect('true');
    });

    it('should return source code when filepath argument is not a string', () => {
      return app.httpRequest().get('/unsafepath6').expect(200).expect('true');
    });

    it('should return source path when filepath contained % but judged to be safe', () => {
      return app.httpRequest().get('/unsafepath7').expect(200).expect('true');
    });
  });
});
