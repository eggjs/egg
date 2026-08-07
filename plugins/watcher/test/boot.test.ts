import { EventEmitter } from 'node:events';

import type { EggApplicationCore } from 'egg';
import { describe, expect, it, vi } from 'vitest';

import { Boot } from '../src/lib/boot.ts';

describe('test/boot.test.ts', () => {
  it('should create the watcher during configDidLoad', async () => {
    const watcher = Object.assign(new EventEmitter(), {
      ready: vi.fn(async () => {}),
    });
    const wrapper = {
      delegate: vi.fn(() => wrapper),
      create: vi.fn(() => watcher),
    };
    const clusterWrapper = vi.fn(() => wrapper);
    const coreLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };
    const app = {
      clusterWrapper,
      config: { watcher: { type: 'default' } },
      coreLogger,
      type: 'agent',
    } as unknown as EggApplicationCore;

    const boot = new Boot(app);
    expect(clusterWrapper).not.toHaveBeenCalled();

    boot.configDidLoad();
    expect(clusterWrapper).toHaveBeenCalledOnce();
    expect(wrapper.delegate).toHaveBeenCalledWith('watch', 'subscribe');
    expect(wrapper.create).toHaveBeenCalledWith(app.config);
    expect(app.watcher).toBe(watcher);

    watcher.emit('info', 'watcher info', 1);
    watcher.emit('warn', 'watcher warning', 2);
    watcher.emit('error', 'watcher error', 3);
    expect(coreLogger.info).toHaveBeenCalledWith('watcher info', 1);
    expect(coreLogger.warn).toHaveBeenCalledWith('watcher warning', 2);
    expect(coreLogger.error).toHaveBeenCalledWith('watcher error', 3);

    await boot.didLoad();
    expect(watcher.ready).toHaveBeenCalledOnce();
    expect(coreLogger.info).toHaveBeenCalledWith('[@eggjs/watcher:%s] watcher start success', 'agent');
  });
});
