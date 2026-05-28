import { LoaderUtil } from '@eggjs/tegg-loader';
import type { Application } from 'egg';
import { afterEach, describe, expect, it, vi } from 'vitest';

import ControllerAppBootHook from '../src/app.ts';
import { CONTROLLER_LOAD_UNIT } from '../src/lib/ControllerLoadUnit.ts';

type ControllerLoaderCreator = (unitPath: string) => unknown;
type GlobOptions = { cwd?: string | URL };

class RecordingLoaderFS {
  readonly globCalls: Array<{ patterns: string | string[]; cwd: string | undefined }> = [];

  glob(patterns: string | string[], options?: GlobOptions): string[] {
    this.globCalls.push({ patterns, cwd: options?.cwd ? String(options.cwd) : undefined });
    return ['home.ts'];
  }

  async loadFile(): Promise<unknown> {
    return {};
  }
}

class ThrowingLoaderFS {
  private readonly error: NodeJS.ErrnoException;

  constructor(error: NodeJS.ErrnoException) {
    this.error = error;
  }

  glob(): string[] {
    throw this.error;
  }

  async loadFile(): Promise<unknown> {
    return {};
  }
}

function createApp(manifest?: { globFiles(unitPath: string, discoverFiles: () => string[]): string[] }) {
  let registeredLoader: ControllerLoaderCreator | undefined;
  const app = {
    config: {
      coreMiddleware: [],
      security: {
        csrf: false,
      },
    },
    plugins: {
      mcpProxy: {
        enable: false,
      },
    },
    loader: {
      manifest,
    },
    logger: {},
    eggPrototypeCreatorFactory: {
      registerPrototypeCreator: vi.fn(),
    },
    loadUnitLifecycleUtil: {
      registerLifecycle: vi.fn(),
    },
    eggPrototypeLifecycleUtil: {
      registerLifecycle: vi.fn(),
    },
    eggObjectFactory: {
      registerEggObjectCreateMethod: vi.fn(),
    },
    loaderFactory: {
      registerLoader: vi.fn((type: string, loaderCreator: ControllerLoaderCreator) => {
        if (type === CONTROLLER_LOAD_UNIT) {
          registeredLoader = loaderCreator;
        }
      }),
    },
    loadUnitFactory: {
      registerLoadUnitCreator: vi.fn(),
    },
    loadUnitInstanceFactory: {
      registerLoadUnitInstanceClass: vi.fn(),
    },
  } as unknown as Application;

  return {
    app,
    getRegisteredLoader() {
      if (!registeredLoader) {
        throw new Error('controller loader was not registered');
      }
      return registeredLoader;
    },
  };
}

describe('plugin/controller/test/app.test.ts', () => {
  afterEach(() => {
    LoaderUtil.setConfig({});
  });

  it('should register controller loader with manifest-backed discovery', () => {
    const loaderFS = new RecordingLoaderFS();
    LoaderUtil.setConfig({ loaderFS: loaderFS as any });
    const manifest = {
      globFiles: vi.fn((_unitPath: string, discoverFiles: () => string[]) => discoverFiles()),
    };
    const { app, getRegisteredLoader } = createApp(manifest);

    new ControllerAppBootHook(app).configWillLoad();
    const loader = getRegisteredLoader()('/app/controller');

    expect(loader).toBeDefined();
    expect(manifest.globFiles).toHaveBeenCalledWith('/app/controller', expect.any(Function));
    expect(loaderFS.globCalls).toHaveLength(1);
    expect(loaderFS.globCalls[0].cwd).toBe('/app/controller');
  });

  it('should treat missing controller directory as an empty file list', () => {
    const error = Object.assign(new Error('missing'), { code: 'ENOENT' });
    LoaderUtil.setConfig({ loaderFS: new ThrowingLoaderFS(error) as any });
    const { app, getRegisteredLoader } = createApp();

    new ControllerAppBootHook(app).configWillLoad();
    const loader = getRegisteredLoader()('/missing/app/controller');

    expect(loader).toBeDefined();
  });

  it('should rethrow non-missing controller discovery errors', () => {
    const error = Object.assign(new Error('denied'), { code: 'EACCES' });
    LoaderUtil.setConfig({ loaderFS: new ThrowingLoaderFS(error) as any });
    const { app, getRegisteredLoader } = createApp();

    new ControllerAppBootHook(app).configWillLoad();

    expect(() => getRegisteredLoader()('/denied/app/controller')).toThrow('denied');
  });
});
