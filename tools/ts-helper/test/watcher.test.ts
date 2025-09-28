import { default as TsHelper, createTsHelperInstance, getDefaultGeneratorConfig } from '../dist';
import Watcher, { WatchItem } from '../dist/watcher';
import path from 'node:path';
import assert from 'node:assert';

describe('watcher.test.ts', () => {
  let watcher: Watcher;
  let tsHelper: TsHelper;

  const defaultWatchDir = getDefaultGeneratorConfig();

  before(() => {
    tsHelper = createTsHelperInstance({
      cwd: path.resolve(__dirname, './fixtures/app'),
      watch: false,
      execAtInit: true,
      autoRemoveJs: false,
    });
  });

  afterEach(() => {
    watcher.destroy();
  });

  it('should works without error', () => {
    watcher = new Watcher(tsHelper);
    watcher.init({
      ...defaultWatchDir.model as WatchItem,
      name: 'xxx',
    });
    assert(!!watcher.execute().dist);
    const content = watcher.execute().content;
    assert(!!content);
    assert(content.includes('Person: ReturnType<typeof ExportPerson>;'));
    assert(content.includes('User: ReturnType<typeof ExportUser>;'));
  });

  it('should works with ignore option without error', () => {
    watcher = new Watcher(tsHelper);
    watcher.init({
      ...defaultWatchDir.model as WatchItem,
      name: 'xxx',
      pattern: [ '*.ts' ],
      ignore: [ 'User.ts' ],
    });
    assert(!!watcher.execute().dist);
    const content = watcher.execute().content;
    assert(!!content);
    assert(content.includes('Person: ReturnType<typeof ExportPerson>;'));
    assert(!content.includes('User: ReturnType<typeof ExportUser>;'));
  });

  it('should watch multiple times without error', () => {
    watcher = new Watcher(tsHelper);
    watcher.init({
      ...defaultWatchDir.model as WatchItem,
      name: 'xxx',
    });
    watcher.watch();
    const oldWatcher = watcher.fsWatcher!;
    watcher.watch();
    assert(oldWatcher !== watcher.fsWatcher);
  });

  it('should throttle without error', () => {
    watcher = new Watcher(tsHelper);
    watcher.init({
      ...defaultWatchDir.model as WatchItem,
      name: 'xxx',
    });

    watcher.watch();
    watcher.fsWatcher!.emit('add', 'fff');
    watcher.fsWatcher!.emit('add', 'fff');
    watcher.fsWatcher!.emit('add', 'fff2');
    assert(watcher.throttleStack.length === 2);
  });

  it('should throw error if generator is not exist', () => {
    watcher = new Watcher(tsHelper);
    try {
      watcher.init({
        ...defaultWatchDir.model as WatchItem,
        name: 'xxx',
        generator: '666',
      });
    } catch {
      return;
    }

    throw new Error('should throw error');
  });
});
