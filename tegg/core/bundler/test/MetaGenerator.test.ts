import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ControllerMetadataUtil, HTTPControllerMeta } from '@eggjs/controller-decorator';
import { PrototypeUtil } from '@eggjs/core-decorator';
import { ClassProtoDescriptor, GlobalGraph, GlobalModuleNodeBuilder } from '@eggjs/metadata';
import { HTTPMethodEnum } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { DependencyResolver } from '../src/DependencyResolver.ts';
import { MetaGenerator } from '../src/MetaGenerator.ts';
import { MethodAnalyzer } from '../src/MethodAnalyzer.ts';
// Multi-module fixtures (for @HTTPBody, @HTTPQuery and pure-method tests)
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

async function buildGraph(): Promise<GlobalGraph> {
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

describe('MetaGenerator', () => {
  const metaGenerator = new MetaGenerator();
  const analyzer = new MethodAnalyzer();

  it('should generate correct meta for getUser method', async () => {
    const graph = await buildGraph();
    const resolver = new DependencyResolver(graph);

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto, 'UserController proto should exist');

    const controllerMeta = ControllerMetadataUtil.getControllerMetadata(UserController);
    assert(controllerMeta instanceof HTTPControllerMeta);

    const getUserMethod = controllerMeta.methods.find((m) => m.name === 'getUser');
    assert(getUserMethod, 'getUser method should exist');

    const filePath = PrototypeUtil.getFilePath(UserController)!;
    const accessedProps = analyzer.analyze(filePath, 'UserController', 'getUser');
    const deps = resolver.resolve(controllerProto, accessedProps);

    const meta = metaGenerator.generate(controllerMeta, getUserMethod, deps, controllerProto, accessedProps);

    assert.equal(meta.methodName, 'getUser');
    assert.equal(meta.http.method, HTTPMethodEnum.GET);
    assert.equal(meta.http.path, '/:id');
    assert.equal(meta.http.fullPath, '/api/users/:id');

    // Should have id and fields params
    assert(meta.http.params.length >= 1, 'should have at least 1 param');
    const idParam = meta.http.params.find((p) => p.name === 'id');
    assert(idParam, 'should have id param');

    // Should only include userService in dependencies
    const depNames = meta.dependencies.map((d) => d.protoName);
    assert(depNames.includes('userService'), 'meta should list userService dep');
    assert(!depNames.includes('adminService'), 'meta should NOT list adminService dep');
  });

  it('should generate correct meta for adminAction method', async () => {
    const graph = await buildGraph();
    const resolver = new DependencyResolver(graph);

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto, 'UserController proto should exist');

    const controllerMeta = ControllerMetadataUtil.getControllerMetadata(UserController);
    assert(controllerMeta instanceof HTTPControllerMeta);

    const adminActionMethod = controllerMeta.methods.find((m) => m.name === 'adminAction');
    assert(adminActionMethod, 'adminAction method should exist');

    const filePath = PrototypeUtil.getFilePath(UserController)!;
    const accessedProps = analyzer.analyze(filePath, 'UserController', 'adminAction');
    const deps = resolver.resolve(controllerProto, accessedProps);

    const meta = metaGenerator.generate(controllerMeta, adminActionMethod, deps, controllerProto, accessedProps);

    assert.equal(meta.methodName, 'adminAction');
    assert.equal(meta.http.method, HTTPMethodEnum.POST);
    assert.equal(meta.http.path, '/admin');
    assert.equal(meta.http.fullPath, '/api/users/admin');

    // Should include both services
    const depNames = meta.dependencies.map((d) => d.protoName);
    assert(depNames.includes('userService'), 'meta should list userService dep');
    assert(depNames.includes('adminService'), 'meta should list adminService dep');
  });

  describe('HTTP param decorators (multi-module-app)', () => {
    it('should capture @HTTPParam and @HTTPQuery params for fetchUser', async () => {
      const graph = await buildMultiModuleGraph();
      const resolver = new DependencyResolver(graph);

      const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
      const controllerProto = barProtos.find(
        (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
      );
      assert(controllerProto, 'BarController proto should exist');

      const controllerMeta = ControllerMetadataUtil.getControllerMetadata(BarController);
      assert(controllerMeta instanceof HTTPControllerMeta);

      const fetchUserMethod = controllerMeta.methods.find((m) => m.name === 'fetchUser');
      assert(fetchUserMethod, 'fetchUser method should exist');

      const filePath = PrototypeUtil.getFilePath(BarController)!;
      const accessedProps = analyzer.analyze(filePath, 'BarController', 'fetchUser');
      const deps = resolver.resolve(controllerProto, accessedProps);
      const meta = metaGenerator.generate(controllerMeta, fetchUserMethod, deps, controllerProto, accessedProps);

      assert.equal(meta.methodName, 'fetchUser');
      assert.equal(meta.http.method, HTTPMethodEnum.GET);

      // fetchUser has @HTTPParam() id and @HTTPQuery() fields
      const paramNames = meta.http.params.map((p) => p.name);
      assert(paramNames.includes('id'), 'should have id (@HTTPParam)');
      assert(paramNames.includes('fields'), 'should have fields (@HTTPQuery)');

      // Should include fooService and fooRepository (transitive cross-module dep)
      const depNames = meta.dependencies.map((d) => d.protoName);
      assert(depNames.includes('fooService'), 'meta should list fooService');
      assert(depNames.includes('fooRepository'), 'meta should list fooRepository (transitive)');
    });

    it('should capture @HTTPBody param for createUser', async () => {
      const graph = await buildMultiModuleGraph();
      const resolver = new DependencyResolver(graph);

      const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
      const controllerProto = barProtos.find(
        (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
      );
      assert(controllerProto, 'BarController proto should exist');

      const controllerMeta = ControllerMetadataUtil.getControllerMetadata(BarController);
      assert(controllerMeta instanceof HTTPControllerMeta);

      const createUserMethod = controllerMeta.methods.find((m) => m.name === 'createUser');
      assert(createUserMethod, 'createUser method should exist');

      const filePath = PrototypeUtil.getFilePath(BarController)!;
      const accessedProps = analyzer.analyze(filePath, 'BarController', 'createUser');
      const deps = resolver.resolve(controllerProto, accessedProps);
      const meta = metaGenerator.generate(controllerMeta, createUserMethod, deps, controllerProto, accessedProps);

      assert.equal(meta.methodName, 'createUser');
      assert.equal(meta.http.method, HTTPMethodEnum.POST);

      // createUser has @HTTPBody() body parameter
      // BodyParamMeta has no name — match by type 'BODY'
      assert(meta.http.params.length >= 1, 'should have at least 1 param');
      const bodyParam = meta.http.params.find((p) => p.type === 'BODY');
      assert(bodyParam, 'should have a BODY param (@HTTPBody)');
    });

    it('should generate empty deps meta for healthCheck (pure method)', async () => {
      const graph = await buildMultiModuleGraph();
      const resolver = new DependencyResolver(graph);

      const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
      const controllerProto = barProtos.find(
        (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
      );
      assert(controllerProto, 'BarController proto should exist');

      const controllerMeta = ControllerMetadataUtil.getControllerMetadata(BarController);
      assert(controllerMeta instanceof HTTPControllerMeta);

      const healthCheckMethod = controllerMeta.methods.find((m) => m.name === 'healthCheck');
      assert(healthCheckMethod, 'healthCheck method should exist');

      const filePath = PrototypeUtil.getFilePath(BarController)!;
      const accessedProps = analyzer.analyze(filePath, 'BarController', 'healthCheck');
      const deps = resolver.resolve(controllerProto, accessedProps);
      const meta = metaGenerator.generate(controllerMeta, healthCheckMethod, deps, controllerProto, accessedProps);

      assert.equal(meta.methodName, 'healthCheck');
      assert.equal(meta.http.method, HTTPMethodEnum.GET);
      assert.equal(meta.dependencies.length, 0, 'healthCheck should have no dependencies');
    });
  });
});
