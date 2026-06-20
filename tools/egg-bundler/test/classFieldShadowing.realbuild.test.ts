import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { PackRunner } from '../src/lib/PackRunner.ts';

const execFileAsync = promisify(execFile);

// REAL @utoo/pack build regression test for the ORM class-field shadowing fix.
//
// This is intentionally a real build (not a mocked one): the fix relies entirely
// on where the `useDefineForClassFields: false` tsconfig lands relative to how
// @utoo/pack resolves it. A mock cannot catch a @utoo/pack upgrade that changes
// that behavior, nor a regression that moves the tsconfig back to the output dir.
//
// The model mirrors a leoric `Bone`: a base class installs a get/set accessor on
// the prototype whose setter has a side effect (records the column for INSERT),
// and the subclass declares the attribute without an initializer. If the bare
// field survives as a native own property it shadows the setter and the column is
// silently dropped — exactly the production bug. No decorators are used so the
// build needs no `@swc/helpers` (unresolvable under the pnpm test sandbox).
const MODEL = `
class Base {
  #columns = {};
  get createdAt() { return this.#columns.createdAt; }
  set createdAt(value) { this.#columns.createdAt = value; }
  toSQLValues() { return { ...this.#columns }; }
}
export class User extends Base {
  createdAt;
}
`;

const CREATED_AT = '2020-01-01T00:00:00.000Z';

describe('class field shadowing — real @utoo/pack build', () => {
  let baseDir: string;

  beforeEach(async () => {
    // realpath: on macOS os.tmpdir() is a /var -> /private/var symlink and
    // Turbopack's path math rejects the mismatch.
    baseDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'egg-bundler-classfields-')));
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('erases the shadowing class field and preserves the prototype setter (column kept on INSERT)', async () => {
    await fs.mkdir(path.join(baseDir, 'app'), { recursive: true });
    const entryDir = path.join(baseDir, '.egg-bundle', 'entries');
    await fs.mkdir(entryDir, { recursive: true });
    await fs.writeFile(path.join(baseDir, 'app', 'model.ts'), MODEL);

    // The application's OWN tsconfig — target es2022, NO useDefineForClassFields.
    // This is the bug condition: it must be left untouched and must be ignored
    // in favour of the compiler tsconfig PackRunner writes into the project dir.
    await fs.writeFile(
      path.join(baseDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { target: 'es2022' } }, null, 2),
    );

    const entry = path.join(entryDir, 'worker.entry.ts');
    await fs.writeFile(
      entry,
      `import { User } from '../../app/model.ts';\n` +
        `const u = new User();\n` +
        `u.createdAt = '${CREATED_AT}';\n` +
        `process.stdout.write(JSON.stringify(u.toSQLValues()));\n`,
    );

    const outputDir = path.join(baseDir, 'dist');
    const result = await new PackRunner({
      entries: [{ name: 'worker', filepath: entry }],
      outputDir,
      externals: {},
      projectPath: entryDir, // build-managed; PackRunner writes the compiler tsconfig here
      rootPath: baseDir, // app sources + node_modules above the entry dir stay resolvable
    }).run();

    // The application's own tsconfig must NOT have been overwritten.
    const appTsconfig = JSON.parse(await fs.readFile(path.join(baseDir, 'tsconfig.json'), 'utf8'));
    expect(appTsconfig.compilerOptions.useDefineForClassFields).toBeUndefined();

    // The emitted class body must not carry the shadowing own field.
    let combined = '';
    for (const rel of result.files.filter((f) => f.endsWith('.js'))) {
      combined += await fs.readFile(path.join(outputDir, rel), 'utf8');
    }
    expect(combined).toMatch(/class\s+User\s+extends\s+Base\s*\{\s*\}/);
    expect(combined).not.toMatch(/class\s+User\b[\s\S]{0,80}?\bcreatedAt\s*;/);

    // Runtime proof: executing the bundle, the setter ran and the column is
    // present in toSQLValues() (the INSERT payload).
    const { stdout } = await execFileAsync(process.execPath, [path.join(outputDir, 'worker.js')], { cwd: outputDir });
    expect(JSON.parse(stdout)).toEqual({ createdAt: CREATED_AT });
  }, 60_000);
});
