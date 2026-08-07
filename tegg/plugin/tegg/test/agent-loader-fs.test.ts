import assert from 'node:assert/strict';
import path from 'node:path';

import { ManifestLoaderFS, RealLoaderFS, type LoaderFS } from '@eggjs/core';
import TeggAgentBoot from '@eggjs/tegg-plugin/agent';
import type { TeggManifest } from '@eggjs/tegg-types';
import type { Agent } from 'egg';
import { describe, it } from 'vitest';

function createAgent(baseDir: string, teggManifest?: TeggManifest) {
  let loaderFS: LoaderFS = new RealLoaderFS();
  const initialLoaderFS = loaderFS;
  const loader = {
    manifest: {
      getExtension(name: string): unknown {
        return name === 'tegg' ? teggManifest : undefined;
      },
    },
    get loaderFS(): LoaderFS {
      return loaderFS;
    },
    set loaderFS(nextLoaderFS: LoaderFS) {
      loaderFS = nextLoaderFS;
    },
  };
  return {
    agent: { baseDir, loader } as unknown as Agent,
    initialLoaderFS,
    loader,
  };
}

describe('TeggAgentBoot LoaderFS', () => {
  it('installs the tegg manifest view before agent-side decorated files are loaded', () => {
    const baseDir = path.join(process.cwd(), 'virtual-tegg-agent-app');
    const unitPath = 'modules/schedules';
    const { agent, initialLoaderFS, loader } = createAgent(baseDir, {
      moduleReferences: [{ name: 'schedules', path: unitPath }],
      moduleDescriptors: [
        {
          name: 'schedules',
          unitPath,
          decoratedFiles: ['app/schedule/CleanupSchedule.ts'],
        },
      ],
    });

    new TeggAgentBoot(agent).configDidLoad();

    assert.ok(loader.loaderFS instanceof ManifestLoaderFS);
    assert.notEqual(loader.loaderFS, initialLoaderFS);
    assert.deepEqual(loader.loaderFS.glob('**/*.ts', { cwd: path.join(baseDir, unitPath) }), [
      'app/schedule/CleanupSchedule.ts',
    ]);
  });

  it('keeps the host LoaderFS when no tegg manifest extension exists', () => {
    const { agent, initialLoaderFS, loader } = createAgent(process.cwd());

    new TeggAgentBoot(agent).configDidLoad();

    assert.equal(loader.loaderFS, initialLoaderFS);
  });
});
