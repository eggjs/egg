---
title: 'Developer Toolchain'
description: 'Testing, builds, and workspace commands in Egg 4'
---

# Developer Toolchain

For application authors, testing is the most visible toolchain change in Egg 4. For contributors, the changes extend from dependency installation to library builds, tests, and documentation publishing. Understanding these stages helps you keep your business structure and focus an upgrade on the commands, configuration, and lifecycle behavior that actually change.

Egg combines Vitest, [VitePress](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/site/.vitepress/config.mts), rolldown-vite, tsdown, and utoo in one workspace. They handle test execution, documentation builds, the underlying build layer, library artifacts, and dependency management respectively. Application delivery also has Egg Bundler, built on @utoo/pack. Knowing these responsibilities helps you choose the tools your application needs.

## Where the Vite ecosystem fits

Testing changed first. Egg and several foundational packages gradually adopted Vitest; later, @eggjs/bin v8 moved test and cov to Vitest and V8 coverage. The catalog declares Vitest, coverage, and UI packages at ^5.0.1, and the current application CLI integration requires Vitest 5. Review the test runner and its related packages as a compatible set when upgrading.

The documentation site moved from Dumi to VitePress, currently 2.0.0-alpha.15. It handles English and Chinese content, local search, and page builds. LLM text output and Markdown copy and download features also make the same technical content available to editors and AI-assisted development. Contributors can review documentation and code together, keeping documentation closer to the implementation.

Workspace overrides replace vite with rolldown-vite for tools that use Vite. This belongs to repository development dependencies. Egg applications still use Egg's startup, loading, and request handling; upgrading the framework does not require adding a Vite development server.

## Library builds and application bundles

The framework repository uses [tsdown workspace mode](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tsdown.config.ts) for library builds. The root configuration walks core packages, plugins, tools, and Tegg workspaces. Its default entries are `src/**/*.ts`, with unbundle and external enabled. The resulting packages remain consumable by module, with egg and @eggjs/* dependencies externalized. Configuration and Markdown-only packages are excluded, while create-egg has its own bundle override. After changing types or exports across packages, contributors can build from the root and check the published structure.

Egg Bundler has a separate role: it turns a conventionally loaded application into deployment artifacts. Its PackRunner invokes @utoo/pack's build implementation. @utoo/pack and the utoo package manager share a brand but are separate packages used at different stages. One handles application modules and deployment entry points; the other handles dependency trees and workspace commands. Validate plugins and dynamic loading when adopting bundle deployment; your package manager can be evaluated separately.

The shared build also shapes debugging. Workspace development can import neighboring source exports, while published packages load JavaScript and declarations from dist. If a change passes repository tests but fails after installation, check that its entry point was built, its subpath is in the published exports, and external dependencies are declared. The root publint integration checks this package structure, which a runtime test alone may miss.

## Workspace commands for contributors

The main CI uses [utoo's ut command](https://github.com/eggjs/egg/blob/f390cc011ce1c70d7460227459ec3825ca3d09f1/README.md) for installation and tasks. package.json defines workspace patterns and overrides, and .utoo.toml defines the catalog; internal packages use workspace:*. CI installs the latest utoo, and the old pnpm configuration remains a migration reference. Once utoo is available, run:

```bash
ut install
ut run test
ut run typecheck
ut run build
```

Each command checks a different concern. test verifies runtime behavior, typecheck checks types, and build verifies release artifacts. Source tests run without a prior build. Stale dist directories may be scanned twice, so root pretest cleans them; putting the build after source checks is simpler. Root lint uses oxlint and formatting uses oxfmt. Running them separately makes failures easier to locate. Release scripts still invoke npm publish, resolving workspace and catalog versions and applying publishConfig independently of dependency installation.

Ordinary Egg applications can retain their package manager and npm scripts. These repository changes primarily reduce repeated installation and verification work across packages. Application teams can evaluate utoo for their own environment. Installation and test timings in historical PRs reflect particular CI measurements; measure cold installs, cache hits, and the full pipeline in your project.

## Migrating application tests to Vitest

Applications using [egg-bin test](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md#L110-L185) can keep familiar commands and first upgrade compatible versions of @eggjs/bin, @eggjs/mock, and Vitest. The CLI discovers test/.setup.ts or .js. For an Egg application where @eggjs/mock can be resolved, it injects setup_vitest. This setup waits for app.ready, restores mocks after tests, and handles application cleanup according to worker mode. Tegg projects also receive the relevant runner and context setup.

The following package.json fragment is for applications choosing egg-bin as the test entry point. The HTTP assertion follows the TypeScript template; replace its homepage response with your actual API contract when migrating it to your project.

```json
"scripts": {
  "test": "egg-bin test",
  "cov": "egg-bin cov"
}
```

```typescript
import { app } from '@eggjs/mock/bootstrap';
import { test, expect } from 'vitest';

test('should GET / status 200', async () => {
  const res = await app.httpRequest().get('/').expect(200);
  expect(res.text).toBe('hi, egg, TypeScript');
});
```

Start with one file, then expand to the full suite to distinguish startup failures from assertion changes. Options such as grep, timeout, bail, and changed retain corresponding CLI entry points, and watch supports repeated development runs. Coverage is written to coverage, with summary, JSON, LCOV, and Cobertura formats among the options. Check exclusions relative to the application root.

A migration may also expose class identity mismatches: a test imports a class with the same name as one loaded by the application, yet object lookup fails. Separate module instances created by the test runner and native dynamic import can affect Tegg resolution. The integration addresses module graph identity. If this occurs, first align runner, Mock, and CLI versions and entry points, then inspect custom loaders rather than weakening business assertions.

```bash
npm test -- test/app/controller/home.test.ts
npm test -- --grep "GET /"
npm run cov
```

## Choose the entry point before configuring it

The new TypeScript template runs vitest run directly and includes [vitest.config.ts](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/create-egg/src/templates/simple-ts/vitest.config.ts) and test/setup.ts. Direct Vitest and egg-bin test have distinct configuration paths. With direct Vitest, the application owns configuration and setup. With egg-bin, the CLI generates inline configuration and passes config:false to disable config discovery. An existing vitest.config.ts is therefore not automatically merged by egg-bin. Check the command actually executed in package.json before deciding where configuration belongs.

Lifecycle behavior also depends on that entry point. New tests should import hooks such as beforeAll and afterAll explicitly from vitest for readability and type checking. @eggjs/mock/setup_vitest currently provides global before and after aliases, so some older tests continue working with automatic setup. Direct Vitest or a custom boot process should not assume those aliases exist. Also avoid relying on automatic setup while registering app.close again, which can close a shared application too early.

Validate parallelism separately. egg-bin defaults to threads with isolate:false; file parallelism is enabled only when EGG_FILE_PARALLELISM=true. For older tests sharing databases, ports, files, or global mocks, establish correctness under the defaults before increasing parallelism deliberately. Use --pool forks when needed. Read the framework repository's own Vitest project configuration separately from these application defaults.

Mock restoration does not clear business databases or remove files created by tests. Shared state across files, unfinished background work, and unreleased ports may appear only in a full suite or thread mode. Keep resource ownership explicit, prepare data per test, and release resources in the appropriate hook. This usually makes failures easier to explain than adding retries first.

## Review automation before completing the migration

Remove [obsolete Mocha and c8 options](https://github.com/eggjs/egg/blob/a11a6d5046c445307767086cd437f4456af04224/tools/egg-bin/README.md#L242-L273) individually, especially --parallel, --jobs, --auto-agent, --prerequire, and --c8. Update CI scripts using MOCHA_FILE or searching logs for “N passing.” TEST_REPORTER=json now writes to .vitest/json/output.json in the application directory. Monitoring and upload steps should read structured results and also check the process exit code.

Review coverage scope as well. If source and compiled artifacts coexist, confirm what is measured and how it relates to released code. Separate fixtures and generated files from business branches requiring coverage. Historical percentages may change with the runner or exclusion rules. Establish a consistent measurement scope before comparing trends.

A useful acceptance sequence is: verify Node.js 22.18.0 or later; get application startup and a real endpoint test working; run the full suite and coverage; then exercise a CI failure and ensure it blocks publishing. Framework contributors should also run workspace type checks and builds. This makes the upgrade's behavior observable through test contracts.
