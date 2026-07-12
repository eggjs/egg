import assert from 'node:assert';

import { ControllerMetaBuilderFactory, ControllerType, type MCPControllerMeta } from '@eggjs/controller-decorator';
import {
  CONTROLLER_LOAD_UNIT,
  ControllerLoadUnit,
  ControllerMetadataManager,
  ControllerRegisterDefaults,
  type ControllerRegisterFactory,
  MCPControllerRegister,
  middlewareGraphHook,
  type RootProtoManager,
} from '@eggjs/controller-runtime';
import { EggPrototypeFactory, type LoadUnitLifecycleContext } from '@eggjs/metadata';
import {
  EggContainerFactory,
  type LoadUnitInstanceLifecycleContext,
  ModuleLoadUnitInstance,
} from '@eggjs/tegg-runtime';
import { AGENT_CONTROLLER_PROTO_IMPL_TYPE, TeggScope } from '@eggjs/tegg-types';
import type { Application, ILifecycleBoot } from 'egg';

import { AgentControllerObject } from './lib/AgentControllerObject.ts';
import { AgentControllerProto } from './lib/AgentControllerProto.ts';
import { ControllerLoadUnitHandler } from './lib/ControllerLoadUnitHandler.ts';
import { EggControllerLoader } from './lib/EggControllerLoader.ts';
import type { EggHTTPRegisterProvider } from './lib/impl/http/EggHTTPRegisterProvider.ts';
import { EggMcpRouter } from './lib/impl/mcp/EggMcpRouter.ts';

// Load Controller process
// 1. await add load unit is ready, controller may depend other load unit
// 2. load ${app_base_dir}app/controller file
// 3. ControllerRegister register controller implement

export default class ControllerAppBootHook implements ILifecycleBoot {
  private readonly app: Application;
  private controllerLoadUnitHandler: ControllerLoadUnitHandler;

  constructor(app: Application) {
    this.app = app;
    // rootProtoManager / controllerRegisterFactory / the controller hooks are
    // declared by the controller MODULE (lib/ControllerModule.ts) and
    // instantiated in the InnerObjectLoadUnit — didLoad() below backfills the
    // per-app instances onto the app surface.
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
      // One EggMcpRouter + one collect-only MCPControllerRegister per app,
      // created lazily on the first MCP controller proto (during didLoad, when
      // app.router/app.config.mcp are ready). The router owns all egg transport;
      // the register only collects records and delegates to the router.
      let eggMcpRouter: EggMcpRouter | undefined;
      let mcpRegister: MCPControllerRegister | undefined;
      ControllerRegisterDefaults.enqueue(ControllerType.MCP, (proto, meta) => {
        eggMcpRouter ??= new EggMcpRouter(this.app);
        mcpRegister ??= new MCPControllerRegister(meta as MCPControllerMeta, eggMcpRouter);
        mcpRegister.addControllerProto(proto);
        return mcpRegister;
      });
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
    await this.app.moduleHandler.ready();
    // ControllerLoadUnitHandler extends sdk-base (its ctor kicks off async _init
    // that touches the per-app factories), and the HTTP/MCP registers below are
    // per-app — run the whole flow inside this app's scope.
    await TeggScope.run(this.app._teggScopeBag, async () => {
      // The controller module owns these protos; expose the per-app instances
      // on the app surface for the teggRootProto middleware and downstream
      // consumers.
      const factoryProto = EggPrototypeFactory.instance.getPrototype('controllerRegisterFactory');
      this.app.controllerRegisterFactory = (await EggContainerFactory.getOrCreateEggObject(factoryProto))
        .obj as ControllerRegisterFactory;
      const rootProtoManagerProto = EggPrototypeFactory.instance.getPrototype('rootProtoManager');
      this.app.rootProtoManager = (await EggContainerFactory.getOrCreateEggObject(rootProtoManagerProto))
        .obj as RootProtoManager;

      // Resolve the HTTP register provider up front: its @LifecyclePostInject
      // plugs the HTTP register creator into the factory, which the load-unit
      // hook needs when ControllerLoadUnitHandler processes controller protos
      // below. (MCP's creator is plugged in by the factory's own drain of the
      // configWillLoad enqueue.)
      const httpProviderProto = EggPrototypeFactory.instance.getPrototype('httpRegisterProvider');
      const httpRegisterProvider = (await EggContainerFactory.getOrCreateEggObject(httpProviderProto))
        .obj as EggHTTPRegisterProvider;

      this.controllerLoadUnitHandler = new ControllerLoadUnitHandler(this.app);
      await this.controllerLoadUnitHandler.ready();

      // The real register HTTP controller/method, after every controller proto
      // has been collected. HTTP methods are sorted by priority inside.
      httpRegisterProvider.doRegister(this.app.rootProtoManager);

      this.app.config.mcp.hooks = EggMcpRouter.hooks;
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
