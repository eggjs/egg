'use strict';

const path = require('path');
const mm = require('egg-mock');
const cheerio = require('cheerio');
const assert = require('assert');
const stripIndent = require('common-tags').stripIndent;

describe('test/view/security.test.js', () => {
  let app;

  before(function* () {
    app = mm.app({
      baseDir: 'security',
      framework: path.join(__dirname, '../fixtures/framework'),
    });
    yield app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should escape', function* () {
    // - https://snyk.io/vuln/npm:nunjucks:20160906
    // - https://github.com/mozilla/nunjucks/issues/835
    yield app
      .httpRequest()
      .get('/escape')
      .expect(200)
      .expect(stripIndent`
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
      `);
  });

  it('should render xss', function* () {
    yield app
      .httpRequest()
      .get('/xss')
      .expect(200)
      .expect(stripIndent`
        http://eggjs.github.io/index.html?a=&lt;div&gt;
        http://eggjs.github.io/index.html?a=<div>
        http://eggjs.github.io/index.html?a=&lt;div&gt;
        &lt;div id=&quot;a&quot;&gt;&#39;a&#39;&lt;/div&gt;
      `);
  });

  it('should render sjs', function* () {
    yield app.httpRequest().get('/sjs').expect(200).expect('var foo = "\\x22hello\\x22";');
  });

  it('should render shtml', function* () {
    yield app.httpRequest().get('/shtml').expect(200).expect('<img><h1>foo</h1>');
  });

  it('should inject csrf hidden field in form', function* () {
    const result = yield app.httpRequest().get('/form_csrf').expect(200);

    const $ = cheerio.load(result.text);
    assert($('#form1 input').length === 2);
    assert($('#form1 [name=_csrf]').attr('name') === '_csrf');
    assert($('#form1 [name=_csrf]').val().length > 1);
    assert($('#form2 input').length === 1);
    assert($('#form2 input').attr('data-a') === 'a');
    assert($('#form2 input').val().length > 1);
  });

  it('should inject nonce attribute to script tag', function* () {
    const result = yield app.httpRequest().get('/nonce').expect(200);

    const $ = cheerio.load(result.text);
    const expectedNonce = $('#input1').val();
    assert($('#script1').attr('nonce') === expectedNonce);
    assert($('#script2').attr('nonce') === expectedNonce);
    assert($('#script3').attr('nonce') === expectedNonce);
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
        .expect(/Unable to call `name\["prototype"\]\["toString"\]\["--expression--"\]`, which is undefined or falsey/)
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
        .query({ tpl: "{{global.process.mainModule.require('child_process').execSync('tail /etc/passwd')}}" })
        .expect(/Unable to call `global\["process"\]\["mainModule"\]\["require"\]`, which is undefined or falsey/)
        .expect(500);
    });

    it('global.process.mainModule.require', () => {
      return app
        .httpRequest()
        .get('/sandbox')
        .query({ name: 'bar' })
        .query({ tpl: "{{global.process.mainModule.require('child_process').execSync('tail /etc/passwd')}}" })
        .expect(/Unable to call `global\["process"\]\["mainModule"\]\["require"\]`, which is undefined or falsey/)
        .expect(500);
    });

    it('process.mainModule.require', () => {
      return app
        .httpRequest()
        .get('/sandbox')
        .query({ name: 'bar' })
        .query({ tpl: "{{process.mainModule.require('child_process').execSync('tail /etc/passwd')}}" })
        .expect(/Unable to call `process\["mainModule"\]\["require"\]`, which is undefined or falsey/)
        .expect(500);
    });

    it('global.process.mainModule.require', () => {
      return app
        .httpRequest()
        .get('/sandbox')
        .query({ name: 'bar' })
        .query({ tpl: "{{global.process.mainModule.require('os').platform()}}" })
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
});
