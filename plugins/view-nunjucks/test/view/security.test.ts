import path from 'node:path';

import { mock, type MockApplication } from '@eggjs/mock';
import { describe, it, expect, beforeAll, afterAll, afterEach } from '@voidzero-dev/vite-plus/test';
import { load } from 'cheerio';
import { stripIndent } from 'common-tags';

function getFixtures(name: string): string {
  return path.join(import.meta.dirname, '../fixtures', name);
}

// TODO: windows will return \r\n, not \n
// Node.js v20: SyntaxError: Unexpected identifier 'SingleModeApplication'
describe.skipIf(process.platform === 'win32' || process.version.startsWith('v20.'))(
  'test/view/security.test.ts',
  () => {
    let app: MockApplication;

    beforeAll(async () => {
      app = mock.app({
        baseDir: getFixtures('security'),
        framework: getFixtures('framework'),
      });
      await app.ready();
    });

    afterAll(() => app.close());
    afterEach(() => mock.restore());

    it('should escape', () => {
      // - https://snyk.io/vuln/npm:nunjucks:20160906
      // - https://github.com/mozilla/nunjucks/issues/835
      return app
        .httpRequest()
        .get('/escape')
        .expect(200)
        .expect(
          stripIndent`
        &lt;html&gt;
        &lt;p&gt;arr&lt;/p&gt;
        &lt;p&gt;obj&lt;/p&gt;
        --
        <html>
        <p>arr</p>
        <p>obj</p>
        --
        <html>
        <p>arr</p>
        <p>obj</p>
      `,
        );
    });

    it('should render xss', () => {
      return app
        .httpRequest()
        .get('/xss')
        .expect(200)
        .expect(
          stripIndent`
        http://eggjs.github.io/index.html?a=&lt;div&gt;
        http://eggjs.github.io/index.html?a=<div>
        http://eggjs.github.io/index.html?a=&lt;div&gt;
        &lt;div id=&quot;a&quot;&gt;&#39;a&#39;&lt;/div&gt;
      `,
        );
    });

    it('should render sjs', () => {
      return app.httpRequest().get('/sjs').expect(200).expect('var foo = "\\x22hello\\x22";');
    });

    it('should render shtml', () => {
      return app.httpRequest().get('/shtml').expect(200).expect('<img><h1>foo</h1>');
    });

    it('should inject csrf hidden field in form', async () => {
      const result = await app.httpRequest().get('/form_csrf').expect(200);

      const $ = load(result.text);
      expect($('#form1 input').length).toBe(2);
      expect($('#form1 [name=_csrf]').attr('name')).toBe('_csrf');
      expect($('#form1 [name=_csrf]').val()!.toString().length).toBeGreaterThan(1);
      expect($('#form2 input').length).toBe(1);
      expect($('#form2 input').attr('data-a')).toBe('a');
      expect($('#form2 input').val()!.toString().length).toBeGreaterThan(1);
    });

    it('should inject nonce attribute to script tag', async () => {
      const result = await app.httpRequest().get('/nonce').expect(200);

      const $ = load(result.text);
      const expectedNonce = $('#input1').val();
      expect($('#script1').attr('nonce')).toBe(expectedNonce);
      expect($('#script2').attr('nonce')).toBe(expectedNonce);
      expect($('#script3').attr('nonce')).toBe(expectedNonce);
    });

    // http://disse.cting.org/2016/08/02/2016-08-02-sandbox-break-out-nunjucks-template-engine
    describe('sandbox-break-out-nunjucks-template-engine', () => {
      it('allow {{7*7}}', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ tpl: '{{7*7}}' })
          .expect(/hi, 49/)
          .expect(200);
      });

      it('name.prototype.toString.constructor', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{name.prototype.toString.constructor(\"return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(/Unable to call `name\["prototype"\]\["toString"\]\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('name.prototype.toString[name]', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'constructor' })
          .query({
            tpl: "{{name.prototype.toString[name](\"return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(/Unable to call `name\["prototype"\]\["toString"\]\["name"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('name.prototype.toString["constructor"]', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: '{{name.prototype.toString["constructor"]("return global.process.mainModule.require(\'child_process\').execSync(\'tail /etc/passwd\')")()}}',
          })
          .expect(/Unable to call `name\["prototype"\]\["toString"\]\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it("name.prototype.toString['constructor']", () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{name.prototype.toString['constructor'](\"return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(/Unable to call `name\["prototype"\]\["toString"\]\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it("name.prototype.toString['cons' + 'tructor']", () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{name.prototype.toString['cons' + 'tructor'](\"return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(
            /Unable to call `name\["prototype"\]\["toString"\]\["--expression--"\]`, which is undefined or falsey/,
          )
          .expect(500);
      });

      it('foo{{range.constructor', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "foo{{range.constructor(\"return process.mainModule.require('child_process').execSync('tail /etc/passwd')\")() + name}}",
          })
          .expect(/Unable to call `range\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('range.constructor', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{range.constructor(\"return process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(/Unable to call `range\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('range.constructor global', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{range.constructor(\"return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(/Unable to call `range\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('cycler.constructor', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{cycler.constructor(\"return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(/Unable to call `cycler\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('joiner.constructor', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{joiner.constructor(\"return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')\")()}}",
          })
          .expect(/Unable to call `joiner\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      // https://github.com/epinna/tplmap/blob/master/plugins/engines/nunjucks.py#L8
      it('global.process.mainModule.require', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{global.process.mainModule.require('child_process').execSync('tail /etc/passwd')}}",
          })
          .expect(/Unable to call `global\["process"\]\["mainModule"\]\["require"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('global.process.mainModule.require (duplicate test)', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{global.process.mainModule.require('child_process').execSync('tail /etc/passwd')}}",
          })
          .expect(/Unable to call `global\["process"\]\["mainModule"\]\["require"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('process.mainModule.require', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{process.mainModule.require('child_process').execSync('tail /etc/passwd')}}",
          })
          .expect(/Unable to call `process\["mainModule"\]\["require"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('global.process.mainModule.require with os.platform', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: "{{global.process.mainModule.require('os').platform()}}",
          })
          .expect(/Unable to call `global\["process"\]\["mainModule"\]\["require"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('set value', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ name: 'bar' })
          .query({
            tpl: `
            {% set username = joiner.constructor("return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')")() %}
            {{username}}
          `,
          })
          .expect(/Unable to call `joiner\["constructor"\]`, which is undefined or falsey/)
          .expect(500);
      });

      it('set value with name', () => {
        return app
          .httpRequest()
          .get('/sandbox')
          .query({ fooname: 'constructor' })
          .query({
            tpl: `
            {% set username = joiner[fooname]("return global.process.mainModule.require('child_process').execSync('tail /etc/passwd')")() %}
            {{username}}
          `,
          })
          .expect(/Unable to call `joiner\["fooname"\]`, which is undefined or falsey/)
          .expect(500);
      });
    });
  },
);
