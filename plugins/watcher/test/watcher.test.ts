import { strict as assert } from 'node:assert';
import fs from 'node:fs';

import { mm, type MockApplication } from '@eggjs/mock';
import { describe, it, afterEach } from 'vitest';

import type { ChangeInfo } from '../src/index.ts';
import DefaultEventSource from '../src/lib/event-sources/default.ts';
import DevelopmentEventSource from '../src/lib/event-sources/development.ts';
import { getFilePath } from './utils.ts';

describe('test/watcher.test.ts', () => {
  let app: MockApplication;
  afterEach(() => app && app.close());

  it('should warn user if config.watcher.type is default', async () => {
    app = mm.app({
      // plugin: 'watcher',
      baseDir: getFilePath('apps/watcher-type-default'),
    });
    await app.ready();
    const content = fs.readFileSync(
      getFilePath('apps/watcher-type-default/logs/watcher-type-default/egg-agent.log'),
      'utf8',
    );
    assert.match(content, /defaultEventSource watcher will NOT take effect/);
  });

  it.skip('should work if config.watcher.type is custom', async () => {
    app = mm.app({
      // plugin: 'watcher',
      baseDir: getFilePath('apps/watcher-custom-event-source'),
    });
    await app.ready();

    const p1 = new Promise<void>((resolve) => {
      app.watcher.watch('xxxx', (info: ChangeInfo) => {
        assert.equal(info.path, 'xxxx');
        // ensure use config.custom
        assert.equal(info.foo, 'bar');

        const content = fs.readFileSync(
          getFilePath('apps/watcher-custom-event-source/logs/watcher-custom-event-source/egg-agent.log'),
          'utf8',
        );
        assert.match(content, /warn12345/);
        assert.match(content, /info12345/);
        resolve();
      });
    });

    const p2 = new Promise<void>((resolve) => {
      app.watcher.watch('xxxx', (info: ChangeInfo) => {
        // watch again success
        assert.equal(info.path, 'xxxx');
        resolve();
      });
    });
    await Promise.all([p1, p2]);
  });

  it.skip('should work if config.watcher.type is custom(fuzzy)', async () => {
    app = mm.app({
      // plugin: 'watcher',
      baseDir: getFilePath('apps/watcher-custom-event-source-fuzzy'),
    });
    await app.ready();

    await new Promise<void>((resolve) => {
      app.watcher.watch(['/home/admin/xxx'], (info: ChangeInfo) => {
        assert.equal(info.path, '/home/admin');

        // ensure use config.custom
        assert.equal(info.foo, 'bar');

        const content = fs.readFileSync(
          getFilePath('apps/watcher-custom-event-source-fuzzy/logs/watcher-custom-event-source-fuzzy/egg-agent.log'),
          'utf8',
        );
        assert(content.includes('warn12345'));
        assert(content.includes('info12345'));
        resolve();
      });
    });
  });

  it('should handle built-in event source no-op paths', async () => {
    const defaultEventSource = new DefaultEventSource();
    const messages: string[] = [];
    defaultEventSource.on('info', (msg) => messages.push(msg));
    defaultEventSource.unwatch();
    assert(messages.includes('[@eggjs/watcher] using defaultEventSource watcher.unwatch() does NOTHING'));

    const developmentEventSource = new DevelopmentEventSource();
    developmentEventSource.watch(getFilePath('not-exists'));
    developmentEventSource.unwatch('');
  });
});
