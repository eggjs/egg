import fs from 'node:fs';
import path from 'node:path';
import { triggerBin, getOutput, tsc } from '../utils';
import assert from 'node:assert';

describe('cmd/clean.test.ts', () => {
  it('should works with clean command correctly', async () => {
    const appPath = path.resolve(__dirname, '../fixtures/app9');
    await tsc(appPath);
    assert(fs.existsSync(path.resolve(appPath, './test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/app/test.js')));

    assert(fs.existsSync(path.resolve(appPath, './testtsx.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/testtsx.js')));
    assert(fs.existsSync(path.resolve(appPath, './app/app/testtsx.js')));

    await new Promise(resolve => triggerBin('clean', '-c', appPath).on('exit', resolve));
    assert(fs.existsSync(path.resolve(appPath, './test2.js')));
    assert(!fs.existsSync(path.resolve(appPath, './test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/test.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/app/test.js')));

    assert(!fs.existsSync(path.resolve(appPath, './testtsx.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/testtsx.js')));
    assert(!fs.existsSync(path.resolve(appPath, './app/app/testtsx.js')));
  });

  it('should deprecated clean command without error', async () => {
    const stdout = await getOutput('clean', '-c', path.resolve(__dirname, '../fixtures/app9'));
    assert(stdout.includes('`ets clean` has been deprecated'));
  });
});
