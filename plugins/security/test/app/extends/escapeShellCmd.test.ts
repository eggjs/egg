import { mm, MockApplication } from '@eggjs/mock';

describe('test/app/extends/escapeShellCmd.test.ts', () => {
  let app: MockApplication;
  before(() => {
    app = mm.app({
      baseDir: 'apps/helper-escapeShellCmd-app',
    });
    return app.ready();
  });

  after(() => app.close());

  afterEach(mm.restore);

  describe('helper.escapeShellCmd()', () => {
    it('should convert chars in blacklists', () => {
      return app.httpRequest().get('/escapeShellCmd').expect(200).expect('true');
    });

    it('should not affect normal cmd', () => {
      return app.httpRequest().get('/escapeShellCmd-2').expect(200).expect('true');
    });
  });
});
