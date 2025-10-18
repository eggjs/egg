'use strict';

const path = require('path');
const mm = require('egg-mock');

describe('test/view/custom.test.js', () => {
  let app;

  before(function* () {
    app = mm.app({
      baseDir: 'custom-tag',
      framework: path.join(__dirname, '../fixtures/framework'),
    });
    yield app.ready();
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should render markdown with custom tag', function* () {
    yield app.httpRequest().get('/markdown').expect(200).expect('<h2 id="hi-egg">hi egg</h2>\n');
  });
});
