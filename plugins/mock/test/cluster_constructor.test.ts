import { strict as assert } from 'node:assert';

import { beforeEach, describe, it, vi } from 'vitest';

const coffeeOptions = vi.hoisted(() => [] as any[]);
const messageHandlers = vi.hoisted(() => [] as any[]);

vi.mock('coffee', () => {
  class Coffee {
    proc = {
      on(event: string, handler: any) {
        if (event === 'message') {
          messageHandlers.push(handler);
        }
        return this;
      },
    };

    constructor(options: any) {
      coffeeOptions.push(options);
    }

    debug() {}

    coverage() {}

    emit() {}

    end(callback: () => void) {
      callback();
      return this;
    }
  }

  return { Coffee };
});

import { ClusterApplication, getMockClusterPortStart } from '../src/lib/cluster.ts';

describe('test/cluster_constructor.test.ts', () => {
  beforeEach(() => {
    coffeeOptions.length = 0;
    messageHandlers.length = 0;
  });

  it('should compute a deterministic mock cluster port window', () => {
    const port = getMockClusterPortStart(1000, 2);
    assert.equal(port, 17000 + ((1000 * 31 + 2 * 37) % 480) * 100);
    assert.equal(port % 100, 0);
    assert(port >= 17000);
    assert(port < 65000);
  });

  it('should preserve child process env overrides', () => {
    process.env.EGG_MOCK_INHERITED_ENV_TEST = 'should-not-be-forced';
    try {
      new ClusterApplication({
        baseDir: '/tmp/mock-cluster-app',
        cache: false,
        clean: false,
        coverage: false,
        opt: {
          env: {
            EGG_HOME: '/tmp/custom-egg-home',
            HOME: '/tmp/custom-home',
            CUSTOM_ENV: 'custom',
          },
        },
      } as any);

      const options = coffeeOptions[0];
      const startOptions = JSON.parse(options.args[0]);
      assert.equal(options.opt.env.EGG_HOME, '/tmp/custom-egg-home');
      assert.equal(options.opt.env.HOME, '/tmp/custom-home');
      assert.equal(options.opt.env.CUSTOM_ENV, 'custom');
      assert.equal(options.opt.env.EGG_MOCK_INHERITED_ENV_TEST, undefined);
      assert.equal(options.method, 'fork');
      assert.equal(startOptions.baseDir, '/tmp/mock-cluster-app');
      assert(startOptions.port >= 10000);
      assert(startOptions.port < 16000);
      assert.equal(typeof startOptions.clusterPort, 'number');
    } finally {
      delete process.env.EGG_MOCK_INHERITED_ENV_TEST;
    }
  });

  it('should leave child process env unset so fork inherits the formatted process env', () => {
    new ClusterApplication({
      baseDir: '/tmp/mock-cluster-app',
      cache: false,
      clean: false,
      coverage: false,
      opt: {
        execArgv: [],
      },
    } as any);

    assert.equal(coffeeOptions[0].opt.env, undefined);
  });

  it('should update port from egg-ready url address', async () => {
    const app = new ClusterApplication({
      baseDir: '/tmp/mock-cluster-app',
      cache: false,
      clean: false,
      coverage: false,
      port: 12000,
    } as any);

    await new Promise((resolve) => process.nextTick(resolve));
    messageHandlers.at(-1)({
      action: 'egg-ready',
      data: {
        address: 'http://127.0.0.1:12001',
      },
    });

    assert.equal(app.address().port, 12001);
    assert.equal(app.url, 'http://127.0.0.1:12001');
  });

  it('should update port from egg-ready data when address is missing', async () => {
    const app = new ClusterApplication({
      baseDir: '/tmp/mock-cluster-app',
      cache: false,
      clean: false,
      coverage: false,
      port: 12000,
    } as any);

    await new Promise((resolve) => process.nextTick(resolve));
    messageHandlers.at(-1)({
      action: 'egg-ready',
      data: {
        port: 12002,
      },
    });

    assert.equal(app.address().port, 12002);
  });

  it('should keep port when egg-ready address is not a url', async () => {
    const app = new ClusterApplication({
      baseDir: '/tmp/mock-cluster-app',
      cache: false,
      clean: false,
      coverage: false,
      port: 12000,
    } as any);

    await new Promise((resolve) => process.nextTick(resolve));
    messageHandlers.at(-1)({
      action: 'egg-ready',
      data: {
        address: 'mock.sock',
      },
    });

    assert.equal(app.address().port, 12000);
    assert.equal(app.url, 'mock.sock');
  });
});
