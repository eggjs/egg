/**
 * EntryGenerator integration tests.
 *
 * These tests verify:
 * 1. The generated entry file content is syntactically correct and has the right imports.
 * 2. When bundled with esbuild, the output contains exactly the expected classes
 *    (method-level tree shaking: getUser bundle must NOT contain AdminService code).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { PrototypeUtil } from '@eggjs/core-decorator';
import { ClassProtoDescriptor, GlobalGraph, GlobalModuleNodeBuilder } from '@eggjs/metadata';
import type { ProtoDescriptor } from '@eggjs/tegg-types';
import { build } from 'esbuild';
import { afterEach, describe, it } from 'vitest';

import { DependencyResolver } from '../src/DependencyResolver.ts';
import { EntryGenerator } from '../src/EntryGenerator.ts';
import { MethodAnalyzer } from '../src/MethodAnalyzer.ts';
// Multi-module fixtures
import { BarController } from './fixtures/apps/multi-module-app/app/module/bar/BarController.ts';
import { FooRepository } from './fixtures/apps/multi-module-app/app/module/foo/FooRepository.ts';
import { FooService } from './fixtures/apps/multi-module-app/app/module/foo/FooService.ts';
import { AdminService } from './fixtures/apps/simple-app/app/module/user/AdminService.ts';
import { UserController } from './fixtures/apps/simple-app/app/module/user/UserController.ts';
import { UserService } from './fixtures/apps/simple-app/app/module/user/UserService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.join(__dirname, './fixtures/apps/simple-app/app/module/user');
const FOO_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/foo');
const BAR_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/bar');

async function buildSimpleGraph(): Promise<GlobalGraph> {
  const builder = GlobalModuleNodeBuilder.create(MODULE_PATH);
  builder.addClazz(UserController);
  builder.addClazz(UserService);
  builder.addClazz(AdminService);
  const graph = new GlobalGraph();
  graph.addModuleNode(builder.build());
  graph.build();
  graph.sort();
  return graph;
}

async function buildMultiModuleGraph(): Promise<GlobalGraph> {
  const fooBuilder = GlobalModuleNodeBuilder.create(FOO_MODULE_PATH);
  fooBuilder.addClazz(FooService);
  fooBuilder.addClazz(FooRepository);
  const barBuilder = GlobalModuleNodeBuilder.create(BAR_MODULE_PATH);
  barBuilder.addClazz(BarController);
  const graph = new GlobalGraph();
  graph.addModuleNode(fooBuilder.build());
  graph.addModuleNode(barBuilder.build());
  graph.build();
  graph.sort();
  return graph;
}

/**
 * Bundle an entry file with esbuild and return the output JS as a string.
 * Uses --bundle to inline all imports, --platform=node, TypeScript loader.
 */
async function esbuildBundle(entryPath: string, outputDir: string, name: string): Promise<string> {
  const outfile = path.join(outputDir, `${name}.js`);
  await build({
    entryPoints: [entryPath],
    bundle: true,
    platform: 'node',
    target: 'node20',
    outfile,
    format: 'esm',
    loader: { '.ts': 'ts' },
    // Suppress decorator metadata warnings — we only care about import inclusion
    logLevel: 'silent',
  });
  return fs.readFile(outfile, 'utf-8');
}

describe('EntryGenerator — entry file content', () => {
  const analyzer = new MethodAnalyzer();
  const entryGen = new EntryGenerator();

  it('getUser entry should import UserController and UserService, NOT AdminService', async () => {
    const graph = await buildSimpleGraph();
    const resolver = new DependencyResolver(graph);
    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(UserController)!;
    const accessed = analyzer.analyze(filePath, 'UserController', 'getUser');
    const deps = resolver.resolve(controllerProto, accessed);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-test-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, UserController, 'getUser', deps);
      const content = await fs.readFile(entryPath, 'utf-8');

      // Entry file must contain relative imports — no import starting with '/' (absolute)
      assert(!/import ['"]\//.test(content), 'entry should NOT contain absolute import paths');

      // Must import UserController (controller itself)
      assert(content.includes('UserController'), 'entry must reference UserController');

      // Must import UserService (direct dep)
      assert(content.includes('UserService'), 'entry must import UserService');

      // Must NOT import AdminService (not accessed by getUser)
      assert(!content.includes('AdminService'), 'entry must NOT import AdminService for getUser');

      // Must have an export of UserController
      assert(content.includes('export'), 'entry must export the controller');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('adminAction entry should import both UserService and AdminService', async () => {
    const graph = await buildSimpleGraph();
    const resolver = new DependencyResolver(graph);
    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(UserController)!;
    const accessed = analyzer.analyze(filePath, 'UserController', 'adminAction');
    const deps = resolver.resolve(controllerProto, accessed);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-test-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, UserController, 'adminAction', deps);
      const content = await fs.readFile(entryPath, 'utf-8');

      assert(!/import ['"]\//.test(content), 'entry should NOT contain absolute import paths');
      assert(content.includes('UserService'), 'adminAction entry must import UserService');
      assert(content.includes('AdminService'), 'adminAction entry must import AdminService');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('fetchUser entry should import FooService and FooRepository (cross-module transitive)', async () => {
    const graph = await buildMultiModuleGraph();
    const resolver = new DependencyResolver(graph);
    const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
    const controllerProto = barProtos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(BarController)!;
    const accessed = analyzer.analyze(filePath, 'BarController', 'fetchUser');
    const deps = resolver.resolve(controllerProto, accessed);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-test-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, BarController, 'fetchUser', deps);
      const content = await fs.readFile(entryPath, 'utf-8');

      assert(!/import ['"]\//.test(content), 'entry should NOT contain absolute import paths');
      assert(content.includes('FooService'), 'fetchUser entry must import FooService (cross-module)');
      assert(content.includes('FooRepository'), 'fetchUser entry must import FooRepository (transitive)');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('healthCheck entry should have no service imports (pure method)', async () => {
    const graph = await buildMultiModuleGraph();
    const resolver = new DependencyResolver(graph);
    const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
    const controllerProto = barProtos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(BarController)!;
    const accessed = analyzer.analyze(filePath, 'BarController', 'healthCheck');
    const deps = resolver.resolve(controllerProto, accessed);
    assert.equal(deps.length, 0);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-test-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, BarController, 'healthCheck', deps);
      const content = await fs.readFile(entryPath, 'utf-8');

      assert(!content.includes('FooService'), 'healthCheck entry must NOT import FooService');
      assert(!content.includes('FooRepository'), 'healthCheck entry must NOT import FooRepository');
      // Only BarController itself
      assert(content.includes('BarController'), 'healthCheck entry must still export controller');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

describe('EntryGenerator — esbuild bundle output (tree shaking verification)', () => {
  const analyzer = new MethodAnalyzer();
  const entryGen = new EntryGenerator();

  it('getUser bundle must NOT contain AdminService class', async () => {
    const graph = await buildSimpleGraph();
    const resolver = new DependencyResolver(graph);
    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(UserController)!;
    const accessed = analyzer.analyze(filePath, 'UserController', 'getUser');
    const deps = resolver.resolve(controllerProto, accessed);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-verify-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, UserController, 'getUser', deps);
      const bundleJs = await esbuildBundle(entryPath, tmpDir, 'getUser');

      // UserService must be in the bundle (it's a dep)
      assert(bundleJs.includes('UserService'), 'getUser bundle must contain UserService');
      // AdminService must NOT be in the bundle (not accessed by getUser)
      assert(!bundleJs.includes('AdminService'), 'getUser bundle must NOT contain AdminService');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('adminAction bundle must contain both UserService and AdminService', async () => {
    const graph = await buildSimpleGraph();
    const resolver = new DependencyResolver(graph);
    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(UserController)!;
    const accessed = analyzer.analyze(filePath, 'UserController', 'adminAction');
    const deps = resolver.resolve(controllerProto, accessed);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-verify-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, UserController, 'adminAction', deps);
      const bundleJs = await esbuildBundle(entryPath, tmpDir, 'adminAction');

      assert(bundleJs.includes('UserService'), 'adminAction bundle must contain UserService');
      assert(bundleJs.includes('AdminService'), 'adminAction bundle must contain AdminService');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('fetchUser bundle must contain FooService and FooRepository (cross-module)', async () => {
    const graph = await buildMultiModuleGraph();
    const resolver = new DependencyResolver(graph);
    const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
    const controllerProto = barProtos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(BarController)!;
    const accessed = analyzer.analyze(filePath, 'BarController', 'fetchUser');
    const deps = resolver.resolve(controllerProto, accessed);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-verify-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, BarController, 'fetchUser', deps);
      const bundleJs = await esbuildBundle(entryPath, tmpDir, 'fetchUser');

      assert(bundleJs.includes('FooService'), 'fetchUser bundle must contain FooService');
      assert(bundleJs.includes('FooRepository'), 'fetchUser bundle must contain FooRepository');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('healthCheck bundle must NOT contain any service code', async () => {
    const graph = await buildMultiModuleGraph();
    const resolver = new DependencyResolver(graph);
    const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
    const controllerProto = barProtos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
    );
    assert(controllerProto);

    const filePath = PrototypeUtil.getFilePath(BarController)!;
    const accessed = analyzer.analyze(filePath, 'BarController', 'healthCheck');
    const deps = resolver.resolve(controllerProto, accessed);

    // fs.realpath resolves macOS /var → /private/var symlink so path.relative() is correct
    const tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'bundle-verify-')));
    try {
      const entryPath = await entryGen.generate(tmpDir, BarController, 'healthCheck', deps);
      const bundleJs = await esbuildBundle(entryPath, tmpDir, 'healthCheck');

      assert(!bundleJs.includes('FooService'), 'healthCheck bundle must NOT contain FooService');
      assert(!bundleJs.includes('FooRepository'), 'healthCheck bundle must NOT contain FooRepository');
      // Controller itself is included (it's the export)
      assert(bundleJs.includes('BarController'), 'healthCheck bundle must contain BarController');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});

// Undecorated class — has no PrototypeUtil file path set
class PlainClass {}

describe('EntryGenerator — edge cases and error paths', () => {
  const entryGen = new EntryGenerator();
  let tmpDir: string;

  afterEach(async () => {
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('should deduplicate dependency imports when same dep appears twice', async () => {
    const graph = await buildSimpleGraph();
    const resolver = new DependencyResolver(graph);

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    const deps = resolver.resolve(controllerProto, new Set(['userService']));
    // Duplicate the dep list
    const depsWithDuplicate = [...deps, ...deps];

    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-dedup-')));
    const entryPath = await entryGen.generate(tmpDir, UserController, 'getUser', depsWithDuplicate);
    const content = await fs.readFile(entryPath, 'utf-8');

    const importLines = content.split('\n').filter((line) => /^import\s+["']/.test(line));
    // Controller + userService = 2 side-effect imports, no duplicates
    assert.equal(importLines.length, 2, 'should have exactly 2 imports (controller + userService, no dups)');
  });

  it('should skip non-ClassProtoDescriptor deps', async () => {
    // Create a mock ProtoDescriptor that is NOT a ClassProtoDescriptor
    const mockProto = {
      type: 'NOT_CLASS',
      name: 'mockService',
      injectObjects: [],
    } as unknown as ProtoDescriptor;

    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-nonclass-')));
    const entryPath = await entryGen.generate(tmpDir, UserController, 'getUser', [mockProto]);
    const content = await fs.readFile(entryPath, 'utf-8');

    const importLines = content.split('\n').filter((line) => /^import\s+["']/.test(line));
    // Should only have the controller import, non-class dep skipped
    assert.equal(importLines.length, 1, 'should have only 1 import (controller only, mock dep skipped)');
  });

  it('should skip deps without a file path', async () => {
    const graph = await buildSimpleGraph();
    const resolver = new DependencyResolver(graph);

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    const deps = resolver.resolve(controllerProto, new Set(['userService']));
    assert(deps.length > 0);

    // Temporarily clear the file path of the dep's class
    const dep = deps[0];
    assert(ClassProtoDescriptor.isClassProtoDescriptor(dep));
    const originalPath = PrototypeUtil.getFilePath(dep.clazz);
    PrototypeUtil.setFilePath(dep.clazz, undefined as unknown as string);

    try {
      tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-nopath-')));
      const entryPath = await entryGen.generate(tmpDir, UserController, 'getUser', deps);
      const content = await fs.readFile(entryPath, 'utf-8');

      const importLines = content.split('\n').filter((line) => /^import\s+["']/.test(line));
      // Should only have controller import, dep without path skipped
      assert.equal(importLines.length, 1, 'should skip dep without file path');
    } finally {
      // Restore the original file path
      if (originalPath) {
        PrototypeUtil.setFilePath(dep.clazz, originalPath);
      }
    }
  });

  it('should throw when controller class has no file path', async () => {
    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-throw-')));

    await assert.rejects(
      () => entryGen.generate(tmpDir, PlainClass, 'someMethod', []),
      (err: Error) => {
        assert(err.message.includes('Cannot find file path for controller class'));
        assert(err.message.includes('PlainClass'));
        return true;
      },
    );
  });

  it('should generate relative import paths (no absolute paths)', async () => {
    const graph = await buildSimpleGraph();
    const resolver = new DependencyResolver(graph);

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    const deps = resolver.resolve(controllerProto, new Set(['userService', 'adminService']));

    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-relpath-')));
    const entryPath = await entryGen.generate(tmpDir, UserController, 'adminAction', deps);
    const content = await fs.readFile(entryPath, 'utf-8');

    // Extract all import specifiers
    const importSpecifiers = [...content.matchAll(/import\s+(?:.*from\s+)?["']([^"']+)["']/g)].map((m) => m[1]);

    assert(importSpecifiers.length > 0, 'should have import specifiers');
    for (const specifier of importSpecifiers) {
      assert(
        specifier.startsWith('./') || specifier.startsWith('../'),
        `import specifier should be relative, got: ${specifier}`,
      );
    }
  });

  it('should not duplicate controller import when controller appears in deps', async () => {
    const graph = await buildSimpleGraph();

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto);

    tmpDir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'entry-ctrldup-')));
    // Pass controller proto itself as a dep
    const entryPath = await entryGen.generate(tmpDir, UserController, 'getUser', [controllerProto]);
    const content = await fs.readFile(entryPath, 'utf-8');

    const importLines = content.split('\n').filter((line) => /^import\s+["']/.test(line));
    // Should have only 1 side-effect import for the controller (not duplicated)
    assert.equal(importLines.length, 1, 'controller should not be imported twice');
  });
});
