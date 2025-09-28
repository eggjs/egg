import del from 'del';
import fs from 'node:fs';
import path from 'node:path';
import { triggerBin, getOutput, sleep } from '../utils';
import assert from 'node:assert';

describe('cmd/init.test.ts', () => {
  const appPath = path.resolve(__dirname, '../fixtures/init');
  const runInit = type => {
    const cp = triggerBin('init', '-c', appPath);
    cp.stdin!.write(type + '\n');
    // cp.stdout.pipe(process.stdout);
    return new Promise(resolve => cp.on('exit', resolve));
  };

  afterEach(() => {
    del.sync(path.resolve(appPath, './*.json'));
  });

  it('prompt can be cancel', async () => {
    const cp = triggerBin('init', '-c', appPath);
    let stdout = '';
    await sleep(1000);
    cp.stdout!.on('data', data => (stdout += data.toString()));
    cp.stdin!.write('\x03');
    await sleep(1000);
    assert(stdout.includes('cancel initialization'));
  });

  it('ts & prompt', async () => {
    await runInit('typescript');
    assert(fs.existsSync(path.resolve(appPath, 'package.json')));
    assert(fs.existsSync(path.resolve(appPath, 'tsconfig.json')));
    const pkg = JSON.parse(fs.readFileSync(path.resolve(appPath, 'package.json')).toString());
    assert(pkg.egg.typescript);
    assert(pkg.egg.declarations);
  });

  it('js & prompt', async () => {
    await runInit('javascript');
    assert(fs.existsSync(path.resolve(appPath, 'package.json')));
    assert(fs.existsSync(path.resolve(appPath, 'jsconfig.json')));
    const pkg = JSON.parse(fs.readFileSync(path.resolve(appPath, 'package.json')).toString());
    assert(!pkg.egg.typescript);
    assert(pkg.egg.declarations);
  });

  it('tsconfig exist & without prompt', async () => {
    const alreadyJsonStr = JSON.stringify({});
    fs.writeFileSync(path.resolve(appPath, 'tsconfig.json'), alreadyJsonStr);
    await getOutput('init', 'typescript', '-c', appPath);
    assert(fs.readFileSync(path.resolve(appPath, 'tsconfig.json')).toString() === alreadyJsonStr);
  });

  it('jsconfig exist & prompt', async () => {
    const alreadyJsonStr = JSON.stringify({});
    fs.writeFileSync(path.resolve(appPath, 'jsconfig.json'), alreadyJsonStr);
    await runInit('javascript');
    assert(fs.readFileSync(path.resolve(appPath, 'jsconfig.json')).toString() === alreadyJsonStr);
  });

  it('jsconfig exist & without prompt', async () => {
    const alreadyJsonStr = JSON.stringify({});
    fs.writeFileSync(path.resolve(appPath, 'jsconfig.json'), alreadyJsonStr);
    await getOutput('init', 'javascript', '-c', appPath);
    assert(fs.readFileSync(path.resolve(appPath, 'jsconfig.json')).toString() === alreadyJsonStr);
  });

  it('egg.require exist', async () => {
    fs.writeFileSync(path.resolve(appPath, 'package.json'), JSON.stringify({
      egg: { require: [ 'egg-ts-helper/register' ] },
    }));
    await runInit('javascript');
    const newPkg = JSON.parse(fs.readFileSync(path.resolve(appPath, 'package.json')).toString());
    assert(newPkg.egg.require.length === 1);
    assert(newPkg.egg.require[0] === 'egg-ts-helper/register');
    assert(!newPkg.egg.declarations);
  });
});
