---
title: 'Tegg Modules'
description: 'Module boundaries, dependency injection, and hosts in Egg 4'
---

# Tegg Modules

When an Egg application contains dozens of business modules, directory layout is only part of the problem. Can orders access the payment implementation? When are request objects destroyed? Can tests start two applications without sharing state? These decisions determine whether a project can keep evolving. Egg 4's Tegg integration brings module boundaries, dependency injection, and object lifecycles into a shared application model. The same business capabilities can also serve HTTP, MCP, and standalone Worker hosts.

Business modules participate in assembly through shared object and lifecycle rules, then expose capabilities through the chosen protocol. Extensions can use those rules for dependency injection, AOP, and data access too.

## Module capabilities in the default application

Tegg is maintained with Egg in the same monorepo, and default plugins integrate its foundational module capabilities. It extends Egg's loading and lifecycle conventions with declarative instantiation, access levels, and dependencies for business classes. Infrastructure that applications previously assembled themselves can now be tested and evolved with the framework. Existing Controller and Service classes remain a starting point; teams can introduce Tegg first in new business areas with clear boundaries.

Default configuration includes nine foundational plugins: teggConfig, tegg, teggAjv, teggAop, teggController, teggDal, teggEventbus, teggOrm, and teggSchedule. DISABLE_TEGG_PLUGINS=true disables the group. Default enablement prepares loading, validation, controllers, and supporting facilities; actual business objects still depend on module contents and configuration. LangChain, MCP client, MCP proxy, and DNS cache require explicit application integration.

This layering helps teams assess dependency costs. MCP Server registration is already in the Controller plugin; calling external MCP Servers from business code involves client functionality. DAL provides modular data access and table mapping, while ORM integrates Leoric, with different setup paths. Review configuration around the features you actually use.

## Declaring object boundaries and interfaces

Tegg identifies a module through eggModule.name in package.json. Decorated classes form an object graph: [ContextProto](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tegg/README.md) creates one instance per context, SingletonProto creates an application-lifetime singleton, and MultiInstanceProto permits multiple instances of a class. Services are module-private by default. Use AccessLevel.PUBLIC when a service needs an explicit boundary for access from other modules.

This example places a greeting service and an [HTTP Controller](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/examples/helloworld-service-worker/app/HelloController.ts) in one module. The fragments are its package.json, HelloService.ts, and HelloController.ts respectively. The surrounding application still needs normal Egg or standalone host configuration. Import the decorators from @eggjs/tegg:

```json
{
  "name": "greeting-module",
  "type": "module",
  "eggModule": { "name": "greeting" }
}
```

```typescript
import { ContextProto } from '@eggjs/tegg';

@ContextProto()
export class HelloService {
  hello(name: string): string {
    return `hello, ${name}`;
  }
}
```

```typescript
import { HTTPController, HTTPMethod, HTTPMethodEnum, HTTPQuery, Inject } from '@eggjs/tegg';
import { HelloService } from './HelloService.ts';

@HTTPController({ path: '/hello' })
export class HelloController {
  @Inject()
  private readonly helloService: HelloService;

  @HTTPMethod({ method: HTTPMethodEnum.GET, path: '/' })
  async hello(@HTTPQuery({ name: 'name' }) name: string) {
    return { message: this.helloService.hello(name ?? 'Egg') };
  }
}
```

Inject asks the container to provide helloService, while HTTPController and HTTPMethod declare endpoint metadata. For a request, the framework resolves the service in the current context, leaving business methods to handle arguments and results. As dependencies grow, constructor injection, optional injection, and Qualifier can select implementations without scattering lookup logic across methods.

Choose scope according to the lifetime of state. Objects holding request data suit context scope. Components reused across requests without request-specific state may suit singletons. Mutable singleton fields are shared between requests; decorators do not automatically prevent concurrent access problems. Modules make these choices reviewable and put dependencies into a graph the framework can check.

For example, keep payment-channel adapters private and expose the application service needed to complete a payment. Upstream modules depend on a stable business interface, while channel implementations can change internally. Use qualifiers when several implementations have similar responsibilities. A small public surface makes dependencies easier to understand in reviews and tests.

## Extensions share the assembly lifecycle

Injecting business objects is only the beginning for framework authors. AOP must be applied before object creation, data access needs to supply foundational objects before graph construction, and cleanup must run while required resources still exist. Manual wiring in host startup files makes these responsibilities harder to reuse across hosts.

Declarative Module Plugins let an ordinary eggModule declare internal objects with InnerObjectProto and injectable lifecycle handlers with EggLifecycleProto. Handlers cover five kinds of objects: LoadUnit, LoadUnitInstance, EggPrototype, EggObject, and EggContext. Extensions can therefore be discovered, assembled, and destroyed with business modules.

Ordering matters. The framework first scans business graph nodes, then instantiates internal objects and registers lifecycle hooks, then builds and sorts the graph and creates business objects. Internal hook objects are released last during destruction. Registering hooks after graph construction starts, or building the graph twice, fails immediately. Related fixes for AOP and Controller middleware reinforce this lifecycle boundary.

Multi-application isolation establishes another boundary. AsyncLocalStorage carries each application's scope bag, and major factories, dependency graphs, singleton managers, lifecycle utilities, and controller state belong to that application. This supports parallel tests and multiple applications embedded in one process. Extensions remain responsible for their own global Maps. Timers, emitter callbacks, and calls detached from a request chain must retain the correct application scope. Missing scope in a multi-application scenario throws in development and warns in production.

Large graphs also receive targeted optimizations. Traversal state avoids revisiting shared subgraphs, and a name index speeds up prototype lookup. These improve specific graph-building steps. Total startup still depends on module count, object initialization, and external connections. Measure your own module structure before applying microbenchmark speedups to an application's startup estimate.

## MCP and Agent services reuse modules

HTTP is one entry point into the object graph. [MCPController](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/examples/helloworld-service-worker/app/CalcMCPController.ts) registers module methods as Tools, Prompts, or Resources while retaining the same dependency injection and lifecycle rules. This tool returns a greeting using the earlier HelloService. Decorators come from @eggjs/tegg, and the method returns MCP's content structure. Choose transport and access control for the actual host:

```typescript
import { Inject, MCPController, MCPTool } from '@eggjs/tegg';
import { HelloService } from './HelloService.ts';

@MCPController({ name: 'greeting' })
export class GreetingMCPController {
  @Inject()
  private readonly helloService: HelloService;

  @MCPTool({ description: 'Return a greeting' })
  async hello() {
    return { content: [{ type: 'text' as const, text: this.helloService.hello('MCP') }] };
  }
}
```

Existing systems can use the same domain service from HTTP and MCP controllers, sharing authorization checks and data access where appropriate. Tool descriptions, parameter schemas, and result envelopes remain at the protocol boundary. Tool calls accept external input, so applications still need authentication, authorization, validation, and execution limits appropriate to their business.

Agent services add a runtime model for threads, runs, cancellation, and streaming. AgentController organizes the routes, while [AgentRuntime](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tegg/core/agent-runtime/src/AgentRuntime.ts) supports synchronous, asynchronous, and SSE modes and stream-event replay using lastSeq. Applications provide createStore() and execRun() to determine state storage and model or workflow execution. The optional LangChain plugin integrates graphs, nodes, edges, and model bindings with modules; credentials, storage, and runtime policy remain application configuration.

AgentRuntime holds active tasks in a process Map and writes stream events to local JSONL files. These facilities manage local execution and reconnection state. Cross-node takeover and distributed task scheduling need additional infrastructure. Projects using early prerelease Agent APIs should migrate message types to AgentMessage.

## Standalone Workers keep host differences at the boundary

Standalone hosting and Agent APIs are prerelease features; choose compatible package versions when integrating them.

Decoupling controller registration from the Egg host makes a lighter entry point possible. The host-neutral controller-runtime and @eggjs/service-worker supply standalone hosting. [ServiceWorkerApp](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tegg/standalone/service-worker/README.md) can serve in Node, or accept a Fetch Request and return a Response, without starting a full Egg Application.

The standalone host retains request-parameter mapping, dependency injection, and request-object lifecycles. Contexts remain alive until streaming responses finish. HTTP results can be a Response, string, binary value, stream, or JSON. The host supplies authentication, HTTP clients, and error mapping through innerObjectHandlers, making dependencies between domain services and runtime facilities explicit.

Check the host features you use before migrating. Fetch transport supports only unsigned Cookie reads and writes. Default MCP uses stateless Streamable HTTP, creating a new server and transport per request; GET and DELETE return 405. The Cloudflare example uses a module worker, a prebuild, and nodejs_compat. This adds deployment options for services suited to Fetch; applications relying on full Egg plugin behavior need to assess and adapt their dependencies.

## Plan migration around current usage

Start with one independent business module. Define its public services, object scopes, and protocols, then test object creation, concurrent requests, and destruction. A few explicit public interfaces make module cooperation easier to verify. Keep regression tests for traditional applications as well, checking that default plugins do not conflict with custom loading.

Test module boundaries directly. Keep separate tests for calling the same service through HTTP and MCP to verify business semantics. Check context isolation during concurrent requests. Create two applications in one process and close them independently to verify that cleanup in one does not affect the other. For background work and streaming, observe the order of request completion and object destruction.

Framework extension authors should check specific API changes. StandaloneApp replaces the old standalone Runner application class, while the @Runner() decorator remains. main()'s options.innerObjects becomes innerObjectHandlers, and logger has its own option. Ordinary handlers cannot override framework-owned objects such as config and moduleConfig. DAL removed app.mysqlDataSourceManager and the related ./app export; inject MysqlDataSourceManager or resolve it within the correct application scope.

Review package names against dependencies too: @eggjs/tegg-aop-plugin becomes @eggjs/aop-plugin, and plugin configuration names use current names such as teggAop. Complete these migrations before extending to additional hosts or AI service entry points. Acceptance should center on explicit boundaries, correct assembly order, and reliable resource cleanup.
