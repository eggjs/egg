import assert from 'node:assert/strict';
import path from 'node:path';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { describe, it } from 'vitest';

import { ModuleDescriptorDumper } from '../src/index.js';
import type { ModuleDescriptor } from '../src/index.js';

describe('test/ModuleDescriptorDumper.test.ts', () => {
  describe('getDecoratedFiles()', () => {
    const loadUnitPath = path.join(__dirname, 'fixtures/modules/load-unit');

    it('should return empty array for empty descriptor', () => {
      const desc: ModuleDescriptor = {
        name: 'empty',
        unitPath: '/tmp/empty',
        clazzList: [],
        multiInstanceClazzList: [],
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
        protos: [],
      };

      // File is outside /tmp/fake-module so relative path starts with ..
      const files = ModuleDescriptorDumper.getDecoratedFiles(desc);
      assert.equal(files.length, 0);
    });
  });
});
