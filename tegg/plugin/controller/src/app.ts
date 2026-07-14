import assert from 'node:assert';

import { ControllerMetaBuilderFactory } from '@eggjs/controller-decorator';
import {
  CONTROLLER_LOAD_UNIT,
  ControllerLoadUnit,
  ControllerMetadataManager,
  middlewareGraphHook,
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
    // Controller boot registers lifecycle hooks and a per-app-capturing load-unit
    // creator, all of which must land in this app's TeggScope.
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
      // Only the MCP config wiring that must land in configWillLoad; the router
      // mount + register wiring happen in didLoad / EggMCPRegisterProvider.

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
    // Mount the per-app RootProtoManager (and, when MCP is on, the router) on
    // `app` BEFORE the inner-object graph builds: they become `() => app[name]`
    // APP compat protos, so inner objects inject them the same way business
    // modules inject `app.router`. `app.rootProtoManager` also backs the
    // teggRootProto middleware, which is plain egg middleware and cannot inject.
    this.app.rootProtoManager = new RootProtoManager();
    if (this.mcpEnable()) {
      this.app.mcpRouter = new EggMcpRouter(this.app);
    }
    await this.app.moduleHandler.ready();
    await TeggScope.run(this.app._teggScopeBag, async () => {
      // HTTP controller registration is driven by EggHTTPControllerRegistrar when
      // the CONTROLLER_LOAD_UNIT instance is created inside ready() below — every
      // controller proto is collected by then.
      this.controllerLoadUnitHandler = new ControllerLoadUnitHandler(this.app);
      await this.controllerLoadUnitHandler.ready();

      // Guarded like every other config.mcp access — when MCP is disabled
      // config.mcp may be absent, and there is no router to publish hooks for.
      if (this.mcpEnable()) {
        this.app.config.mcp.hooks = EggMcpRouter.hooks;
      }
    });
  }

  configDidLoad(): void {
    // The per-app GlobalGraph does not exist yet (it is created inside
    // moduleHandler.init() during didLoad), so registering on the graph here
    // would be a silent no-op and cross-module controller middleware inject
    // edges would never be woven. Buffer the hook on moduleHandler instead —
    // it is flushed onto the graph right after creation, before build() runs.
    // moduleHandler is created in the tegg plugin's configDidLoad, which runs
    // before ours (teggController declares a dependency on tegg).
    this.app.moduleHandler.registerGlobalGraphBuildHook(middlewareGraphHook);
  }

  mcpEnable(): boolean {
    return !!this.app.plugins.mcpProxy?.enable;
  }

  async beforeClose(): Promise<void> {
    await TeggScope.run(this.app._teggScopeBag, async () => {
      if (this.controllerLoadUnitHandler) {
        await this.controllerLoadUnitHandler.destroy();
      }
      // The module-declared controller hooks, the httpRegisterProvider (and its
      // HTTPControllerRegister), and the MCP register/router all deregister /
      // tear down with the InnerObjectLoadUnit and the app bag — no static
      // instance to clean.
      ControllerMetadataManager.instance.clear();
    });
  }
}
