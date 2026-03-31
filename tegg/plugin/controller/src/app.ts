import assert from 'node:assert';

import { ControllerMetaBuilderFactory, ControllerType } from '@eggjs/controller-decorator';
import { GlobalGraph, type LoadUnitLifecycleContext } from '@eggjs/metadata';
import { type LoadUnitInstanceLifecycleContext, ModuleLoadUnitInstance } from '@eggjs/tegg-runtime';
import { AGENT_CONTROLLER_PROTO_IMPL_TYPE } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { AgentControllerObject } from './lib/AgentControllerObject.ts';
import { AgentControllerProto } from './lib/AgentControllerProto.ts';
import { AppLoadUnitControllerHook } from './lib/AppLoadUnitControllerHook.ts';
import { CONTROLLER_LOAD_UNIT, ControllerLoadUnit } from './lib/ControllerLoadUnit.ts';
import { ControllerLoadUnitHandler } from './lib/ControllerLoadUnitHandler.ts';
import { ControllerMetadataManager } from './lib/ControllerMetadataManager.ts';
import { ControllerRegisterFactory } from './lib/ControllerRegisterFactory.ts';
import { EggControllerLoader } from './lib/EggControllerLoader.ts';
import { EggControllerPrototypeHook } from './lib/EggControllerPrototypeHook.ts';
import { HTTPControllerRegister } from './lib/impl/http/HTTPControllerRegister.ts';
import { MCPControllerRegister } from './lib/impl/mcp/MCPControllerRegister.ts';
import { middlewareGraphHook } from './lib/MiddlewareGraphHook.ts';
import { RootProtoManager } from './lib/RootProtoManager.ts';

// Load Controller process
// 1. await add load unit is ready, controller may depend other load unit
// 2. load ${app_base_dir}app/controller file
// 3. ControllerRegister register controller implement

export default class ControllerAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private readonly loadUnitHook: AppLoadUnitControllerHook;
  private readonly controllerRegisterFactory: ControllerRegisterFactory;
  private controllerLoadUnitHandler: ControllerLoadUnitHandler;
  private readonly controllerPrototypeHook: EggControllerPrototypeHook;

  constructor(app: Application) {
    this.app = app;
    this.controllerRegisterFactory = new ControllerRegisterFactory(this.app);
    this.app.rootProtoManager = new RootProtoManager();
    this.app.controllerRegisterFactory = this.controllerRegisterFactory;
    this.app.controllerMetaBuilderFactory = ControllerMetaBuilderFactory;
    this.loadUnitHook = new AppLoadUnitControllerHook(this.controllerRegisterFactory, this.app.rootProtoManager);
    this.controllerPrototypeHook = new EggControllerPrototypeHook();
    this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(
      AGENT_CONTROLLER_PROTO_IMPL_TYPE,
      AgentControllerProto.createProto,
    );
    AgentControllerObject.setLogger(this.app.logger);
  }

  configWillLoad(): void {
    this.app.loadUnitLifecycleUtil.registerLifecycle(this.loadUnitHook);
    this.app.eggPrototypeLifecycleUtil.registerLifecycle(this.controllerPrototypeHook);
    this.app.eggObjectFactory.registerEggObjectCreateMethod(AgentControllerProto, AgentControllerObject.createObject);
    this.app.loaderFactory.registerLoader(CONTROLLER_LOAD_UNIT, (unitPath) => {
      return new EggControllerLoader(unitPath);
    });
    this.controllerRegisterFactory.registerControllerRegister(ControllerType.HTTP, HTTPControllerRegister.create);
    this.app.loadUnitFactory.registerLoadUnitCreator(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitLifecycleContext): ControllerLoadUnit => {
        return new ControllerLoadUnit(
          `tegg-app-controller:${ctx.unitPath}`,
          ctx.unitPath,
          ctx.loader,
          this.app.eggPrototypeFactory,
          this.app.eggPrototypeCreatorFactory,
        );
      },
    );
    this.app.loadUnitInstanceFactory.registerLoadUnitInstanceClass(
      CONTROLLER_LOAD_UNIT,
      (ctx: LoadUnitInstanceLifecycleContext): ModuleLoadUnitInstance => {
        return new ModuleLoadUnitInstance(ctx.loadUnit);
      },
    );

    if (this.app.config.security?.csrf !== void 0) {
      assert(
        typeof this.app.config.security.csrf === 'boolean' || typeof this.app.config.security.csrf === 'object',
        'csrf must be boolean or object',
      );

      if (typeof this.app.config.security.csrf === 'boolean') {
        (this.app.config.security as any).csrf = {
          enable: this.app.config.security.csrf,
        };
      }
    }

    // init http root proto middleware
    this.prepareMiddleware(this.app.config.coreMiddleware);
    if (this.mcpEnable()) {
      this.controllerRegisterFactory.registerControllerRegister(ControllerType.MCP, MCPControllerRegister.create);
      // Don't let the mcp's body be consumed
      this.app.config.coreMiddleware.unshift('mcpBodyMiddleware');

      if (this.app.config.security.csrf.ignore) {
        if (Array.isArray(this.app.config.security.csrf.ignore)) {
          this.app.config.security.csrf.ignore = [
            /^\/mcp\//,
            this.app.config.mcp.sseInitPath,
            this.app.config.mcp.sseMessagePath,
            this.app.config.mcp.streamPath,
            this.app.config.mcp.statelessStreamPath,
            ...(Array.isArray(this.app.config.security.csrf.ignore)
              ? this.app.config.security.csrf.ignore
              : [this.app.config.security.csrf.ignore]),
          ];
        }
      } else {
        this.app.config.security.csrf.ignore = [
          /^\/mcp\//,
          this.app.config.mcp.sseInitPath,
          this.app.config.mcp.sseMessagePath,
          this.app.config.mcp.streamPath,
          this.app.config.mcp.statelessStreamPath,
        ];
      }

      if (this.app.config.mcp.multipleServer) {
        for (const name of Object.keys(this.app.config.mcp.multipleServer)) {
          ['sseInitPath', 'sseMessagePath', 'streamPath', 'statelessStreamPath'].forEach((key) => {
            if (this.app.config.mcp.multipleServer[name][key])
              (this.app.config.security.csrf.ignore as any[]).push(this.app.config.mcp.multipleServer[name][key]);
          });
        }
      }
    }
  }

  prepareMiddleware(middlewareNames: string[]): string[] {
    if (!middlewareNames.includes('teggCtxLifecycleMiddleware')) {
      middlewareNames.unshift('teggCtxLifecycleMiddleware');
    }

    const index = middlewareNames.indexOf('teggCtxLifecycleMiddleware');
    middlewareNames.splice(index, 0, 'teggRootProto');
    return middlewareNames;
  }

  async didLoad(): Promise<void> {
    await this.app.moduleHandler.ready();
    this.controllerLoadUnitHandler = new ControllerLoadUnitHandler(this.app);
    await this.controllerLoadUnitHandler.ready();

    // The real register HTTP controller/method.
    // HTTP method should sort by priority
    // The HTTPControllerRegister will collect all the methods
    // and register methods after collect is done.
    HTTPControllerRegister.instance?.doRegister(this.app.rootProtoManager);

    this.app.config.mcp.hooks = MCPControllerRegister.hooks;
  }

  configDidLoad(): void {
    GlobalGraph.instance?.registerBuildHook(middlewareGraphHook);
  }

  async willReady(): Promise<void> {
    if (this.mcpEnable()) {
      await MCPControllerRegister.connectStatelessStreamTransport();
      const names = MCPControllerRegister.instance?.mcpConfig.getMultipleServerNames();
      if (names && names.length > 0) {
        for (const name of names) {
          await MCPControllerRegister.connectStatelessStreamTransport(name);
        }
      }
    }
  }

  mcpEnable(): boolean {
    return !!this.app.plugins.mcpProxy?.enable;
  }

  async beforeClose(): Promise<void> {
    if (this.controllerLoadUnitHandler) {
      await this.controllerLoadUnitHandler.destroy();
    }
    this.app.loadUnitLifecycleUtil.deleteLifecycle(this.loadUnitHook);
    this.app.eggPrototypeLifecycleUtil.deleteLifecycle(this.controllerPrototypeHook);
    ControllerMetadataManager.instance.clear();
    HTTPControllerRegister.clean();
    MCPControllerRegister.clean();
  }
}
