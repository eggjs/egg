import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { describe, it } from 'vitest';

import { ModuleDescriptorDumper } from '../src/index.js';
import type { ModuleDescriptor } from '../src/index.js';

describe('test/ModuleDescriptorDumper.test.ts', () => {
  describe('stringifyDescriptor()', () => {
    it('should emit valid JSON for clazz without filePath', () => {
      class MissingFilePath {}
      const desc: ModuleDescriptor = {
        name: 'no-file-path',
        unitPath: '/tmp/no-file-path',
        clazzList: [MissingFilePath as any],
        multiInstanceClazzList: [],
        innerObjectClazzList: [],
        protos: [],
      };

      const json = JSON.parse(ModuleDescriptorDumper.stringifyDescriptor(desc));
      assert.deepEqual(json.clazzList, [{ name: 'MissingFilePath' }]);
    });
  });

  describe('getDecoratedFiles()', () => {
    const loadUnitPath = path.join(__dirname, 'fixtures/modules/load-unit');

    it('should return empty array for empty descriptor', () => {
      const desc: ModuleDescriptor = {
        name: 'empty',
        unitPath: '/tmp/empty',
        clazzList: [],
        multiInstanceClazzList: [],
        innerObjectClazzList: [],
        protos: [],
      };
      const files = ModuleDescriptorDumper.getDecoratedFiles(desc);
      assert.deepStrictEqual(files, []);
    });

    it('should return relative file paths from clazzList', async () => {
      // Import to trigger decorator registration
      const mod = await import('./fixtures/modules/load-unit/AppRepo.js');
      const AppRepo = mod.default;
      const filePath = PrototypeUtil.getFilePath(AppRepo);
      assert.ok(filePath, 'AppRepo should have a file path');

      const desc: ModuleDescriptor = {
        name: 'load-unit',
        unitPath: loadUnitPath,
        clazzList: [AppRepo],
        multiInstanceClazzList: [],
        innerObjectClazzList: [],
        protos: [],
      };

      const files = ModuleDescriptorDumper.getDecoratedFiles(desc);
      assert(files.length > 0);
      for (const file of files) {
        assert(!path.isAbsolute(file), `expected relative path, got: ${file}`);
        assert(!file.startsWith('..'), `expected path within module, got: ${file}`);
      }
      assert(files.includes('AppRepo.ts'));
    });

    it('should deduplicate file paths', async () => {
      const mod = await import('./fixtures/modules/load-unit/AppRepo.js');
      const AppRepo = mod.default;

      const desc: ModuleDescriptor = {
        name: 'load-unit',
        unitPath: loadUnitPath,
        clazzList: [AppRepo],
        multiInstanceClazzList: [AppRepo],
        innerObjectClazzList: [],
        protos: [],
      };

      const files = ModuleDescriptorDumper.getDecoratedFiles(desc);
      const uniqueFiles = [...new Set(files)];
      assert.equal(files.length, uniqueFiles.length);
    });

    it('should filter out files outside unitPath', async () => {
      const mod = await import('./fixtures/modules/load-unit/AppRepo.js');
      const AppRepo = mod.default;

      const desc: ModuleDescriptor = {
        name: 'fake',
        unitPath: '/tmp/fake-module',
        clazzList: [],
        multiInstanceClazzList: [AppRepo],
        innerObjectClazzList: [],
        protos: [],
      };

      // File is outside /tmp/fake-module so relative path starts with ..
      const files = ModuleDescriptorDumper.getDecoratedFiles(desc);
      assert.equal(files.length, 0);
    });
  });

  describe('dump()', () => {
    it('should write descriptor to deterministic path and cleanup temp dir', async () => {
      const dumpDir = await fs.mkdtemp(path.join(tmpdir(), 'module-desc-dump-'));
      try {
        const desc: ModuleDescriptor = {
          name: 'dumped',
          unitPath: '/tmp/dumped',
          clazzList: [],
          multiInstanceClazzList: [],
          innerObjectClazzList: [],
          protos: [],
        };

        await ModuleDescriptorDumper.dump(desc, { dumpDir });

        const dumpPath = ModuleDescriptorDumper.dumpPath(desc, { dumpDir });
        const json = JSON.parse(await fs.readFile(dumpPath, 'utf8'));
        assert.equal(json.name, 'dumped');
        const dumpEntries = await fs.readdir(path.join(dumpDir, '.egg'));
        assert.deepEqual(dumpEntries, ['dumped_module_desc.json']);
      } finally {
        await fs.rm(dumpDir, { recursive: true, force: true });
      }
    });
  });
});
