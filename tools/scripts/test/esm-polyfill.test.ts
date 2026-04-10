import { strict as assert } from 'node:assert';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { describe, it } from 'vitest';

import { applyEsmPolyfill } from '../src/commands/snapshot-build.ts';

describe('test/esm-polyfill.test.ts', () => {
  const absPath = path.resolve('/tmp/snapshot-fixtures/pkg/src/index.ts');
  const dirname = path.dirname(absPath);
  const url = pathToFileURL(absPath).href;

  describe('ESM detection', () => {
    it('detects top-level import', () => {
      const src = "import fs from 'node:fs';\nconst x = __dirname;";
      const out = applyEsmPolyfill(src, absPath);
      assert.equal(out, `import fs from 'node:fs';\nconst x = ${JSON.stringify(dirname)};`);
    });

    it('detects top-level export', () => {
      const src = 'export const foo = __dirname;';
      const out = applyEsmPolyfill(src, absPath);
      assert.equal(out, `export const foo = ${JSON.stringify(dirname)};`);
    });

    it('detects import.meta.*', () => {
      const src = 'const u = import.meta.url;\nconst d = __dirname;';
      const out = applyEsmPolyfill(src, absPath);
      assert.equal(out, `const u = ${JSON.stringify(url)};\nconst d = ${JSON.stringify(dirname)};`);
    });

    it('leaves CJS sources untouched', () => {
      const src = "const fs = require('node:fs');\nmodule.exports = { dir: __dirname };";
      assert.equal(applyEsmPolyfill(src, absPath), null);
    });

    it('returns null when ESM file has no substitutable tokens', () => {
      const src = "import fs from 'node:fs';\nconsole.log(fs.readFileSync);";
      assert.equal(applyEsmPolyfill(src, absPath), null);
    });
  });

  describe('__dirname patterns', () => {
    it('koa-onerror: typeof __dirname === "string" guard', () => {
      const src = [
        "import path from 'node:path';",
        "import { fileURLToPath } from 'node:url';",
        'function getSourceDirname() {',
        "  if (typeof __dirname === 'string') {",
        '    return __dirname;',
        '  }',
        '  const __filename = fileURLToPath(import.meta.url);',
        '  return path.dirname(__filename);',
        '}',
      ].join('\n');
      const out = applyEsmPolyfill(src, absPath);
      assert.ok(out);
      // __dirname both in the typeof check and the return substituted with literal
      assert.ok(out.includes(`typeof ${JSON.stringify(dirname)} === 'string'`));
      assert.ok(out.includes(`return ${JSON.stringify(dirname)};`));
      // __filename LOCAL DECLARATION preserved intact (critical — literal sub would break syntax)
      assert.ok(out.includes('const __filename = fileURLToPath('));
      // import.meta.url replaced
      assert.ok(out.includes(JSON.stringify(url)));
    });

    it('aws-sdk: typeof __dirname !== "undefined" ternary', () => {
      const src = "export const base = typeof __dirname !== 'undefined' ? __dirname : void 0;";
      const out = applyEsmPolyfill(src, absPath);
      assert.equal(
        out,
        `export const base = typeof ${JSON.stringify(dirname)} !== 'undefined' ? ${JSON.stringify(dirname)} : void 0;`,
      );
    });

    it('plain path.join(__dirname, ...)', () => {
      const src = "import path from 'node:path';\nexport const p = path.join(__dirname, 'templates');";
      const out = applyEsmPolyfill(src, absPath);
      assert.equal(
        out,
        `import path from 'node:path';\nexport const p = path.join(${JSON.stringify(dirname)}, 'templates');`,
      );
    });

    it('does NOT replace __filename anywhere', () => {
      const src = [
        "import { fileURLToPath } from 'node:url';",
        'const __filename = fileURLToPath(import.meta.url);',
        'console.log(__filename);',
      ].join('\n');
      const out = applyEsmPolyfill(src, absPath);
      assert.ok(out);
      assert.ok(out.includes('const __filename = fileURLToPath('));
      assert.ok(out.includes('console.log(__filename)'));
    });

    it('does not match __dirname as substring (word boundary)', () => {
      const src = 'export const my__dirname_alias = 1;\nexport const x = __dirname;';
      const out = applyEsmPolyfill(src, absPath);
      assert.ok(out);
      assert.ok(out.includes('my__dirname_alias'));
      assert.ok(out.includes(`export const x = ${JSON.stringify(dirname)};`));
    });
  });

  describe('import.meta.* replacements', () => {
    it('replaces import.meta.dirname, url, filename', () => {
      const src = [
        'export const d = import.meta.dirname;',
        'export const u = import.meta.url;',
        'export const f = import.meta.filename;',
      ].join('\n');
      const out = applyEsmPolyfill(src, absPath);
      assert.equal(
        out,
        [
          `export const d = ${JSON.stringify(dirname)};`,
          `export const u = ${JSON.stringify(url)};`,
          `export const f = ${JSON.stringify(absPath)};`,
        ].join('\n'),
      );
    });
  });
});
