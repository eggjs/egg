import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ControllerMetadataUtil } from '@eggjs/controller-decorator';
import { ClassProtoDescriptor, GlobalGraph, GlobalModuleNodeBuilder } from '@eggjs/metadata';
import { ControllerType } from '@eggjs/tegg-types';
import { describe, it } from 'vitest';

import { DependencyResolver } from '../src/DependencyResolver.ts';
// EventBus fixtures
import { NotifierService } from './fixtures/apps/eventbus-app/app/module/notify/NotifierService.ts';
import { NotifyController } from './fixtures/apps/eventbus-app/app/module/notify/NotifyController.ts';
import { UserService as NotifyUserService } from './fixtures/apps/eventbus-app/app/module/notify/UserService.ts';
// Multi-module fixtures
import { BarController } from './fixtures/apps/multi-module-app/app/module/bar/BarController.ts';
import { FooRepository } from './fixtures/apps/multi-module-app/app/module/foo/FooRepository.ts';
import { FooService } from './fixtures/apps/multi-module-app/app/module/foo/FooService.ts';
import { AdminService } from './fixtures/apps/simple-app/app/module/user/AdminService.ts';
// Import fixtures so decorators run and register metadata
import { UserController } from './fixtures/apps/simple-app/app/module/user/UserController.ts';
import { UserService } from './fixtures/apps/simple-app/app/module/user/UserService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODULE_PATH = path.join(__dirname, './fixtures/apps/simple-app/app/module/user');
const FOO_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/foo');
const BAR_MODULE_PATH = path.join(__dirname, './fixtures/apps/multi-module-app/app/module/bar');
const NOTIFY_MODULE_PATH = path.join(__dirname, './fixtures/apps/eventbus-app/app/module/notify');

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

async function buildNotifyGraph(): Promise<GlobalGraph> {
  // EventBus is intentionally NOT added to the graph — it's a framework built-in
  const builder = GlobalModuleNodeBuilder.create(NOTIFY_MODULE_PATH);
  builder.addClazz(NotifyController);
  builder.addClazz(NotifierService);
  builder.addClazz(NotifyUserService);

  const graph = new GlobalGraph();
  graph.addModuleNode(builder.build());
  graph.build();
  graph.sort();
  return graph;
}

describe('DependencyResolver', () => {
  it('should resolve only userService for getUser method', async () => {
    const graph = await buildGraph();
    const resolver = new DependencyResolver(graph);

    // Find the controller proto
    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto, 'UserController proto should exist');

    // Only userService is accessed in getUser
    const accessedProps = new Set(['userService']);
    const deps = resolver.resolve(controllerProto, accessedProps);

    const depNames = deps.map((d) => String(d.name));
    assert(depNames.includes('userService'), 'should include userService');
    assert(!depNames.includes('adminService'), 'should NOT include adminService');
  });

  it('should resolve both services for adminAction method', async () => {
    const graph = await buildGraph();
    const resolver = new DependencyResolver(graph);

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto, 'UserController proto should exist');

    // Both services are accessed in adminAction
    const accessedProps = new Set(['userService', 'adminService']);
    const deps = resolver.resolve(controllerProto, accessedProps);

    const depNames = deps.map((d) => String(d.name));
    assert(depNames.includes('userService'), 'should include userService');
    assert(depNames.includes('adminService'), 'should include adminService');
  });

  it('should return empty deps when no props are accessed', async () => {
    const graph = await buildGraph();
    const resolver = new DependencyResolver(graph);

    const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
    const controllerProto = protos.find(
      (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
    );
    assert(controllerProto, 'UserController proto should exist');

    const deps = resolver.resolve(controllerProto, new Set());
    assert.equal(deps.length, 0, 'should have no deps when no props accessed');
  });

  it('should return controller meta with HTTP methods', async () => {
    const controllerMeta = ControllerMetadataUtil.getControllerMetadata(UserController);
    assert(controllerMeta, 'UserController should have controller metadata');
    assert.equal(controllerMeta.type, ControllerType.HTTP);
    assert.equal(controllerMeta.methods.length, 2);
  });

  describe('cross-module dependencies (multi-module-app)', () => {
    it('should resolve cross-module dep FooService and its transitive FooRepository', async () => {
      const graph = await buildMultiModuleGraph();
      const resolver = new DependencyResolver(graph);

      const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
      const barControllerProto = barProtos.find(
        (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
      );
      assert(barControllerProto, 'BarController proto should exist in bar module');

      // fetchUser accesses fooService (cross-module)
      const accessedProps = new Set(['fooService']);
      const deps = resolver.resolve(barControllerProto, accessedProps);

      const depNames = deps.map((d) => String(d.name));
      // FooService is directly accessed
      assert(depNames.includes('fooService'), 'should include fooService (cross-module dep)');
      // FooRepository is a transitive dep of FooService (private to foo module)
      assert(depNames.includes('fooRepository'), 'should include fooRepository (transitive dep)');
    });

    it('should return empty deps for healthCheck (no service access)', async () => {
      const graph = await buildMultiModuleGraph();
      const resolver = new DependencyResolver(graph);

      const barProtos = graph.moduleProtoDescriptorMap.get('bar') ?? [];
      const barControllerProto = barProtos.find(
        (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === BarController,
      );
      assert(barControllerProto, 'BarController proto should exist');

      const deps = resolver.resolve(barControllerProto, new Set());
      assert.equal(deps.length, 0, 'healthCheck should have no deps');
    });
  });

  describe('framework built-in graceful skip (eventbus-app)', () => {
    it('should include UserService but skip EventBus (not in GlobalGraph)', async () => {
      const graph = await buildNotifyGraph();
      const resolver = new DependencyResolver(graph);

      const notifyProtos = graph.moduleProtoDescriptorMap.get('notify') ?? [];
      const notifyControllerProto = notifyProtos.find(
        (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === NotifyController,
      );
      assert(notifyControllerProto, 'NotifyController proto should exist');

      // notifyUser accesses notifierService
      const accessedProps = new Set(['notifierService']);
      const deps = resolver.resolve(notifyControllerProto, accessedProps);

      const depNames = deps.map((d) => String(d.name));
      // NotifierService is directly accessed
      assert(depNames.includes('notifierService'), 'should include notifierService');
      // UserService is a transitive dep of NotifierService
      assert(depNames.includes('userService'), 'should include userService (transitive dep)');
      // EventBus is NOT in GlobalGraph — must be silently skipped without crashing
      assert(!depNames.includes('eventBus'), 'should NOT include eventBus (framework built-in)');
    });
  });

  describe('edge cases', () => {
    it('should return empty deps when accessedProps do not match any inject object', async () => {
      const graph = await buildGraph();
      const resolver = new DependencyResolver(graph);

      const protos = graph.moduleProtoDescriptorMap.get('user') ?? [];
      const controllerProto = protos.find(
        (p) => ClassProtoDescriptor.isClassProtoDescriptor(p) && p.clazz === UserController,
      );
      assert(controllerProto, 'UserController proto should exist');

      // Pass prop names that do not match any inject refName
      const accessedProps = new Set(['nonExistentService', 'anotherMissing']);
      const deps = resolver.resolve(controllerProto, accessedProps);

      assert.equal(deps.length, 0, 'should return empty deps when no inject matches');
    });
  });
});
