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
import { build } from 'esbuild';
import { describe, it } from 'vitest';

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
