import path from 'node:path';
import {
  EggPrototypeLifecycleUtil,
  LoadUnitLifecycleUtil,
} from '@eggjs/tegg-metadata';
import { Runner, RunnerOptions, StandaloneContext } from '@eggjs/tegg-standalone';
import type { Logger } from '@eggjs/tegg-types';
import { getDefaultHttpClient } from 'urllib';
import { ContextProtoProperty } from './constants.ts';
import { FetchRouter } from './http/FetchRouter.ts';
import { RootProtoManager } from './controller/RootProtoManager.ts';
import { ControllerMetadataManager } from './controller/ControllerMetadataManager.ts';
import { ControllerRegisterFactory } from './controller/ControllerRegisterFactory.ts';
import { ContextProtoLoadUnitHook } from './hook/ContextProtoLoadUnitHook.ts';
import { ControllerPrototypeHook } from './hook/ControllerPrototypeHook.ts';
import { ControllerLoadUnitHook } from './hook/ControllerLoadUnitHook.ts';
import { HTTPControllerRegister } from './http/HTTPControllerRegister.ts';
import { MCPControllerRegister } from './mcp/MCPControllerRegister.ts';
import { LoadUnitInnerClassHook } from './hook/LoadUnitInnerClassHook.ts';
import { ServiceWorkerRunner } from './ServiceWorkerRunner.ts';
import { StandaloneEggObjectFactory } from './StandaloneEggObjectFactory.ts';
import { FetchEventHandler } from './http/FetchEventHandler.ts';

export interface ServiceWorkerAppOptions {
  innerObjectHandlers?: RunnerOptions['innerObjectHandlers'];
  logger?: Logger;
}

export class ServiceWorkerApp {
  private readonly runner: Runner;
  private readonly contextProtoLoadUnitHook: ContextProtoLoadUnitHook;
  private readonly controllerPrototypeHook: ControllerPrototypeHook;
  private readonly controllerLoadUnitHook: ControllerLoadUnitHook;
  private readonly fetchRouter: FetchRouter;
  private readonly rootProtoManager: RootProtoManager;
  private readonly controllerMetadataManager: ControllerMetadataManager;
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  private readonly loadUnitInnerClassHook: LoadUnitInnerClassHook;

  constructor(cwd: string, options?: ServiceWorkerAppOptions & RunnerOptions) {
    // Create shared objects
    this.fetchRouter = new FetchRouter();
    this.rootProtoManager = new RootProtoManager();
    this.controllerMetadataManager = new ControllerMetadataManager();
    this.controllerRegisterFactory = new ControllerRegisterFactory();

    // Create lifecycle hooks
    this.contextProtoLoadUnitHook = new ContextProtoLoadUnitHook('serviceWorker');
    this.controllerPrototypeHook = new ControllerPrototypeHook();
    this.controllerLoadUnitHook = new ControllerLoadUnitHook(
      this.controllerRegisterFactory,
      this.rootProtoManager,
      this.controllerMetadataManager,
      this.fetchRouter,
    );

    // Register lifecycle hooks
    LoadUnitLifecycleUtil.registerLifecycle(this.contextProtoLoadUnitHook);
    LoadUnitLifecycleUtil.registerLifecycle(this.controllerLoadUnitHook);
    EggPrototypeLifecycleUtil.registerLifecycle(this.controllerPrototypeHook);

    // Build dependencies list - include this package as a framework dependency
    const frameworkDep = { baseDir: path.join(__dirname, '..'), extraFilePattern: [ '!**/test' ] };
    const deps = [ ...(options?.dependencies || []), frameworkDep ];

    // Register FetchRouter and RootProtoManager as inner objects so they can be @Inject()-ed
    const innerObjectHandlers: RunnerOptions['innerObjectHandlers'] = {
      ...options?.innerObjectHandlers,
      fetchRouter: [{ obj: this.fetchRouter }],
      rootProtoManager: [{ obj: this.rootProtoManager }],
    };

    // Provide default logger (fallback to console) and httpclient (urllib singleton)
    if (!innerObjectHandlers.logger) {
      innerObjectHandlers.logger = [{ obj: options?.logger || console }];
    }
    if (!innerObjectHandlers.httpclient) {
      innerObjectHandlers.httpclient = [{ obj: getDefaultHttpClient() }];
    }

    this.loadUnitInnerClassHook = new LoadUnitInnerClassHook([ StandaloneEggObjectFactory, ServiceWorkerRunner, FetchEventHandler ]);

    LoadUnitLifecycleUtil.registerLifecycle(this.loadUnitInnerClassHook);

    this.runner = new Runner(cwd, {
      ...options,
      dependencies: deps,
      innerObjectHandlers,
    });
  }

  async init() {
    await this.runner.init();
  }

  async handleEvent<T = unknown>(event: Event) {
    const context = new StandaloneContext();
    context.set(ContextProtoProperty.Event.contextKey, event);

    return await this.runner.run<T>(context);
  }

  async destroy() {
    // Clean up static singletons
    HTTPControllerRegister.clean();
    MCPControllerRegister.clean();

    // Unregister lifecycle hooks
    LoadUnitLifecycleUtil.deleteLifecycle(this.contextProtoLoadUnitHook);
    LoadUnitLifecycleUtil.deleteLifecycle(this.controllerLoadUnitHook);
    LoadUnitLifecycleUtil.deleteLifecycle(this.loadUnitInnerClassHook);
    EggPrototypeLifecycleUtil.deleteLifecycle(this.controllerPrototypeHook);

    await this.runner.destroy();
  }
}
