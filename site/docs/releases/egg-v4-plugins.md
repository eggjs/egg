---
title: 'Plugin Upgrades'
description: 'Plugin configuration, validation, and resource lifecycles in Egg 4'
---

# Plugin Upgrades

Plugins supply much of Egg's practical functionality: sessions, uploads, static assets, error handling, databases, and template engines. During Egg 4's development, these capabilities have gradually moved into the shared monorepo, with TypeScript source, @eggjs package names, and importable configuration factories. Users gain clearer ways to discover, configure, and verify plugins. Authors need to express types, dependencies, and initialization timing more explicitly.

Applications can enable optional features through factories, connect validation and types with TypeBox, and replace Redis clients in tests. Plugin authors can maintain types, dependencies, and resource lifecycles through the same interfaces.

## Built-in features and optional integrations

Moving a plugin into the official repository changes how it is maintained. Related code can be updated, tested, and released with core; plugin configuration still determines whether an application loads it. The current plugins directory contains 18 packages, and traditional built-in configuration references 12 of them, covering existing features such as error handling, sessions, security, uploads, and development support. development is restricted to local, so a plugin in the [default configuration](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/packages/egg/src/config/plugin.ts) may not run in every environment.

Redis, TypeBox validation, Nunjucks, CORS, and tracer are optional integrations; Mock supports testing. This distinction matters in practice: built-in view provides an abstraction, but an application still needs a renderer such as Nunjucks. Including redis in the repository does not automatically create Redis connections in every application. Tegg has its own default integrations, so inspect the framework and application's final configuration when checking whether a capability is enabled.

Official plugins use the @eggjs namespace. Existing applications do not need individual enable declarations for every built-in feature. Review old egg-* packages that the application explicitly installs, overrides, or imports, and check their compatibility with the current Egg major version.

## Importable plugin configuration

Traditional configuration often depends on plugin names, package-name strings, and package.json metadata. Official plugins can now export factories directly, letting applications import a plugin and spread its returned configuration. This config/plugin.ts enables two optional plugins. Editors and module resolvers can check the imports, and users can navigate to the plugin declarations:

```typescript
// config/plugin.ts
import redisPlugin from '@eggjs/redis';
import typeboxPlugin from '@eggjs/typebox-validate';

export default {
  ...redisPlugin(),
  ...typeboxPlugin(),
};
```

## Metadata and overrides in one factory

Plugin authors use Egg's definePluginFactory to declare name, enable, and path, with optional dependencies, optionalDependencies, and env. Redis sets path to import.meta.dirname so its load path follows its module location. The factory returns an object keyed by plugin name and sets skipMerge to prevent the loader from merging package.json's eggPlugin fields again.

An application can call redisPlugin({ enable: false }) or override dependency and environment metadata. The factory keeps the name fixed. Overrides use shallow spreading: an array replaces the original array rather than appending to it. Authors should declare actual startup dependencies, and applications should be careful when overriding dependencies so they preserve required ordering.

The factory provides an explicit entry point for new plugins, while traditional enable and package declarations remain in compatibility configuration. Migrate incrementally: upgrade and inspect exports, adopt factory calls, then inspect the merged configuration. Keep two configuration concerns distinct: [redisPlugin()](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/redis/src/index.ts) controls plugin loading, while connection settings in config.redis control its behavior. This excerpt defines the Redis factory:

```typescript
import { definePluginFactory } from 'egg';

export default definePluginFactory({
  name: 'redis',
  enable: true,
  path: import.meta.dirname,
});
```

## One schema for validation and types

TypeScript applications often define HTTP input twice: runtime validation rules and static business types. Separate definitions can diverge when fields are added or optionality changes. [@eggjs/typebox-validate](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/typebox-validate/README.md) describes data with a TypeBox schema and derives TypeScript types through Static, allowing both to reference one definition.

With the plugin enabled, ctx.tValidate(schema, data) invokes the application's Ajv validator. Failure throws an error with status 422 and code invalid_param. To handle failure yourself, use tValidateWithoutThrow, which returns a boolean. The current tValidate signature also returns boolean; it is not a TypeScript asserts function. After validating unknown input, explicitly assign the schema-derived type.

This controller keeps the schema outside the class so it is not recreated per request. The plugin depends on typebox 1.x, having migrated from @sinclair/typebox. Projects importing the old package should review package names, schema APIs, and custom formats together. The example uses the plugin's typebox subpath, which re-exports typebox's named members:

```typescript
import { Controller } from 'egg';
import { Type, type Static } from '@eggjs/typebox-validate/typebox';

const UserSchema = Type.Object({
  name: Type.String(),
  nickname: Type.Optional(Type.String()),
});

export default class UserController extends Controller {
  async create() {
    const input: unknown = this.ctx.request.body;
    this.ctx.tValidate(UserSchema, input);
    const user = input as Static<typeof UserSchema>;
    this.ctx.body = { name: user.name };
  }
}
```

## Replacing Redis clients in tests

A real Redis service adds local and CI setup costs when unit tests only need to verify cache behavior. @eggjs/redis accepts a client class through config.redis.Redis, allowing [ioredis-mock](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/redis/README.md#using-ioredis-mock-for-unit-tests) in tests. Business code continues to use app.redis; the replacement lives in test configuration.

Configure readiness explicitly when replacing the client. The plugin normally waits for ready or error, but ioredis-mock can emit ready synchronously during construction, before the startup check registers. Set weakDependent: true explicitly inside client so that instance does not block startup. Replacing the Redis class alone does not enable this option; the plugin checks the client's options.weakDependent.

The following README-based configuration can go in config/config.unittest.ts. Install ioredis-mock and its types as test dependencies. This is useful for business behavior using common commands; integration tests should still cover connection failures, deployment configuration, and client/server compatibility. In production, weakDependent changes how Redis readiness affects application readiness, so choose it according to the application's actual dependency requirements.

```typescript
import RedisMock from 'ioredis-mock';
import type { EggAppInfo, PartialEggConfig } from 'egg';

export default function (_appInfo: EggAppInfo): PartialEggConfig {
  return {
    redis: {
      Redis: RedisMock,
      client: {
        host: '127.0.0.1',
        port: 6379,
        password: '',
        db: 0,
        weakDependent: true,
      },
    },
  };
}
```

## Security behavior depends on configuration

[@eggjs/cors](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/plugins/cors/src/app.ts) illustrates cooperation between official plugins. When cors.origin is not explicitly configured, it uses security's safe-domain check to decide whether to return the request Origin. If the security check method is unavailable, it retains that Origin. An explicit origin overrides this default logic. Test permitted and rejected origins against your existing security configuration during an upgrade, particularly when setting a broad origin value.

@eggjs/security also fixes POSIX single-quote escaping in escapeShellArg, preserving input as one argument. Its scope is one argument in a POSIX shell; Windows cmd and PowerShell have different escaping rules. For applications launching programs, the README recommends execFile or spawn with an argument array to reduce manual command-string construction.

Plugin upgrade checks extend beyond importable APIs. Verify the security behaviors your application uses, including custom CORS origins, error responses, and external commands. CSRF, XSS, and security headers can also be maintained and regression-tested with core, reducing verification costs across packages.

## Initialization for bundles and snapshots

As deployment moves from file trees to bundles or startup snapshots, hidden plugin assumptions become visible. Reading templates at import time, dynamically scanning implementation files, or starting watchers in constructors can interfere with a build. Official plugins have made concrete adjustments: onerror and development inline their default page templates, watcher imports its class directly, and clusterWrapper and watch-related resources are created in configDidLoad.

Plugin authors should follow this [lifecycle boundary](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/AGENTS.md). Snapshot builds stop after configWillLoad; restoration resumes at configDidLoad. Constructors and configWillLoad should prepare serializable configuration and metadata. Create sockets, file watchers, timers, and other runtime resources in later stages. If a plugin consumes another plugin's runtime instance, declare the dependency to establish initialization order. Third-party plugins still need their own checks for import side effects and resource creation.

For an existing plugin, first verify the Node.js 22.18.0 baseline and Egg 4 compatibility, then review exports, metadata, and type declarations. Use a real application fixture to verify loading, error handling, and shutdown. Add bundle or snapshot checks when those deployment modes are used. Tests integrating current Mock with Vitest must also align with Vitest ^5.0.1; this is a test-environment requirement.

Application developers can start with explicitly declared plugins, retain defaults for built-in capabilities, and migrate optional integrations individually. Plugin authors should maintain loading metadata, types, and resource lifecycles together as public interfaces. The shared repository makes these changes easier to verify and failures easier to locate.
