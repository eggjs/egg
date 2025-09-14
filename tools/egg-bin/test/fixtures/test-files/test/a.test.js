const fs = require('fs');
const a = require('../lib/a');

describe('a.test.js', () => {
  it('should success', () => {
    a(true);
  });

  it('should show tmp', () => {
    const tmpdir = process.env.TMPDIR;
    console.log(tmpdir, fs.existsSync(tmpdir));
  });
});
