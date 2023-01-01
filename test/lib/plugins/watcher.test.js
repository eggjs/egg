const assert = require('assert');
const mm = require('egg-mock');
const fs = require('fs');
const utils = require('../../utils');
const file_path1 = utils.getFilepath('apps/watcher-development-app/tmp.txt');
const file_path2 = utils.getFilepath('apps/watcher-development-app/tmp/tmp.txt');
const file_path1_agent = utils.getFilepath('apps/watcher-development-app/tmp-agent.txt');

describe('test/lib/plugins/watcher.test.js', () => {
  describe('default', () => {
    let app;
    beforeEach(() => {
      app = utils.cluster('apps/watcher-development-app');
      app.coverage(false);
      return app.ready();
    });

    afterEach(() => app.close());
    afterEach(mm.restore);

    it('should app watcher work', async () => {
      let count = 0;

      await app.httpRequest()
        .get('/app-watch')
        .expect(200)
        .expect('app watch success');

      await utils.sleep(5000);
      fs.writeFileSync(file_path1, 'aaa');
      await utils.sleep(5000);

      await app.httpRequest()
        .get('/app-msg')
        .expect(200)
        .expect(function(res) {
          const lastCount = count;
          count = parseInt(res.text);
          assert(count > lastCount);
        });

      fs.writeFileSync(file_path2, 'aaa');
      await utils.sleep(5000);

      await app.httpRequest()
        .get('/app-msg')
        .expect(200)
        .expect(function(res) {
          const lastCount = count;
          count = parseInt(res.text);
          assert(count > lastCount);
        });
    });

    it('should agent watcher work', async () => {
      let count = 0;
      await app.httpRequest()
        .get('/agent-watch')
        .expect(200)
        .expect('agent watch success');

      fs.writeFileSync(file_path1_agent, 'bbb');
      await utils.sleep(5000);

      await app.httpRequest()
        .get('/agent-msg')
        .expect(200)
        .expect(res => {
          const lastCount = count;
          count = parseInt(res.text);
          assert(count > lastCount);
        });
    });
  });

  describe('config.watcher.type is default', () => {
    let app;
    before(() => {
      app = utils.cluster('apps/watcher-type-default');
      app.coverage(false);
      return app.ready();
    });

    after(() => app.close());

    it('should warn user', async () => {
      await utils.sleep(3000);
      const logPath = utils.getFilepath('apps/watcher-type-default/logs/watcher-type-default/egg-agent.log');
      const content = fs.readFileSync(logPath, 'utf8');
      assert(content.includes('defaultEventSource watcher will NOT take effect'));
    });
  });
});
