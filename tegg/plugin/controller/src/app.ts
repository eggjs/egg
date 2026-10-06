import assert from 'node:assert';

import { ControllerMetaBuilderFactory } from '@eggjs/controller-decorator';
import {
  CONTROLLER_LOAD_UNIT,
  ControllerLoadUnit,
  ControllerMetadataManager,
  RootProtoManager,
} from '@eggjs/controller-runtime';
import type { LoadUnitLifecycleContext } from '@eggjs/metadata';
import { type LoadUnitInstanceLifecycleContext, ModuleLoadUnitInstance } from '@eggjs/tegg-runtime';
import { AGENT_CONTROLLER_PROTO_IMPL_TYPE, TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { AgentControllerObject } from './lib/AgentControllerObject.ts';
import { AgentControllerProto } from './lib/AgentControllerProto.ts';
import { ControllerLoadUnitHandler } from './lib/ControllerLoadUnitHandler.ts';
import { EggControllerLoader } from './lib/EggControllerLoader.ts';
import { EggMcpRouter } from './lib/impl/mcp/EggMcpRouter.ts';

export default class ControllerAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private controllerLoadUnitHandler: ControllerLoadUnitHandler;

  constructor(app: Application) {
    this.app = app;
    this.app.controllerMetaBuilderFactory = ControllerMetaBuilderFactory;
    this.app.eggPrototypeCreatorFactory.registerPrototypeCreator(
      AGENT_CONTROLLER_PROTO_IMPL_TYPE,
      AgentControllerProto.createProto,
    );
    AgentControllerObject.setLogger(this.app.logger);
  }

  configWillLoad(): void {
    // Keep all registered factories and hooks in this application's scope.
    TeggScope.run(this.app._teggScopeBag, () => {
      this.doConfigWillLoad();
    });
  }

  private doConfigWillLoad(): void {
    this.app.eggObjectFactory.registerEggObjectCreateMethod(AgentControllerProto, AgentControllerObject.createObject);
    this.app.loaderFactory.registerLoader(CONTROLLER_LOAD_UNIT, (unitPath) => {
      return new EggControllerLoader(unitPath);
    });
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
            ...this.app.config.security.csrf.ignore,
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
    // Publish host objects before the inner-object graph creates app compat protos.
    this.app.rootProtoManager = new RootProtoManager();
    if (this.mcpEnable()) {
      this.app.mcpRouter = new EggMcpRouter(this.app);
    }
    await this.app.moduleHandler.ready();
    await TeggScope.run(this.app._teggScopeBag, async () => {
      this.controllerLoadUnitHandler = new ControllerLoadUnitHandler(this.app);
      await this.controllerLoadUnitHandler.ready();

      if (this.mcpEnable()) {
        this.app.config.mcp.hooks = this.app.mcpRouter!.hooks;
      }
    });
  }

  mcpEnable(): boolean {
    return !!this.app.plugins.mcpProxy?.enable;
  }

  async beforeClose(): Promise<void> {
    await TeggScope.run(this.app._teggScopeBag, async () => {
      if (this.controllerLoadUnitHandler) {
        await this.controllerLoadUnitHandler.destroy();
      }
      ControllerMetadataManager.instance.clear();
    });
  }
}
