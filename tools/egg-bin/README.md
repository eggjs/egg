# @eggjs/bin

[![NPM version][npm-image]][npm-url]
[![Known Vulnerabilities][snyk-image]][snyk-url]
[![npm download][download-image]][download-url]
[![Node.js Version][node-version-image]][node-version-url]
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/bin.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/bin
[snyk-image]: https://snyk.io/test/npm/@eggjs/bin/badge.svg?style=flat-square
[snyk-url]: https://snyk.io/test/npm/@eggjs/bin
[download-image]: https://img.shields.io/npm/dm/@eggjs/bin.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/bin
[node-version-image]: https://img.shields.io/node/v/@eggjs/bin.svg?style=flat-square
[node-version-url]: https://nodejs.org/en/download/

egg developer tool, base on [oclif](https://oclif.io/).

---

## Install

```bash
npm i @eggjs/bin --save-dev
```

## Usage

Add `egg-bin` to `package.json` scripts:

```json
{
  "scripts": {
    "dev": "egg-bin dev",
    "test-local": "egg-bin test",
    "test": "npm run lint -- --fix && npm run test-local",
    "cov": "egg-bin cov",
    "bundle": "egg-bin bundle",
    "lint": "eslint .",
    "ci": "npm run lint && npm run cov"
  }
}
```

## Command

All the commands support these specific options:

- `--inspect`
- `--inspect-brk`
- `--typescript` / `--ts` enable typescript support. Auto detect from `package.json`'s `pkg.egg.typescript`,
  or `pkg.dependencies.typescript`/`pkg.devDependencies.typescript`.
- `--base` / `--baseDir` application's root path, default to `process.cwd()`.
- `--require` will add to `execArgv`, support multiple. Also support read from `package.json`'s `pkg.egg.require`
- `--dry-run` / `-d` whether dry-run the test command, just show the command

```bash
egg-bin [command] --inspect
egg-bin [command] --inspect-brk
egg-bin [command] --typescript
egg-bin [command] --base /foo/bar
```

### dev

Start dev cluster on `local` env, it will start a master, an agent and a worker.

```bash
egg-bin dev
```

#### dev options

- `--framework` egg web framework root path.
- `--port` server port. If not specified, the port is obtained in the following order: [_egg.js_ configuration](https://eggjs.org/basics/config) `config/config.*.js` > `process.env.EGG_BIN_DEFAULT_PORT` > 7001 > other available ports.
- `--workers` worker process number, default to `1` worker at local mode.
- `--sticky` start a sticky cluster server, default to `false`.

#### debug/inspect on VSCode

Create `.vscode/launch.json` file:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Egg Debug",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev", "--", "--inspect-brk"],
      "console": "integratedTerminal",
      "restart": true,
      "autoAttachChildProcesses": true
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Egg Test",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "test-local", "--", "--inspect-brk"],
      "autoAttachChildProcesses": true
    }
  ]
}
```

### test

Using [vitest] to run test.

```bash
egg-bin test [...files] [options]
```

- `files` is optional, default to `test/**/*.test.ts`
- `test/fixtures`, `test/node_modules` is always excluded.

#### auto load `test/.setup.ts`

If `test/.setup.ts` (or `.setup.js`) exists, it will be auto-added as the first vitest `setupFile`.

```bash
test
  ├── .setup.ts
  └── foo.test.ts
```

#### auto-inject `@eggjs/mock/setup_vitest`

For egg applications, `@eggjs/mock/setup_vitest` is automatically registered as a vitest setup file when `@eggjs/mock` is installed, handling app lifecycle (`beforeAll` / `afterEach` / `afterAll`).

#### auto use `@eggjs/tegg-vitest/runner`

If `@eggjs/tegg-vitest` is installed in the project, its runner is automatically detected and injected into the vitest config.

#### test options

- `--timeout` / `-t` milliseconds, default to `60000`
- `--no-timeout` disable timeout
- `--grep` / `-g` only run tests matching pattern
- `--bail` / `-b` stop after first test failure
- `--changed` / `-c` only run tests for changed files (matches `test/**/*.test.(js|ts)`)
- `--watch` / `-w` run in watch mode

#### test environment

You can set `TESTS` env to specify test files, supports comma-separated glob patterns.

```bash
TESTS=test/a.test.ts egg-bin test
```

The reporter can be set with `TEST_REPORTER` env (any vitest reporter), default is `default`.

```bash
TEST_REPORTER=verbose egg-bin test
```

The test timeout can be set with `TEST_TIMEOUT` env, default is `60000` ms.

```bash
TEST_TIMEOUT=2000 egg-bin test
```

### cov

Using [vitest] with [v8 coverage] to run code coverage. Supports all `test` options above.

Coverage reports are written to `coverage/` and include: `text-summary`, `json-summary`, `json`, `lcov`, `cobertura`.

#### cov options

- `-x` add a glob pattern to exclude from coverage, supports multiple
- also supports all test options above.

#### cov environment

You can set `COV_EXCLUDES` env to add glob patterns to exclude from coverage (comma-separated).

```bash
COV_EXCLUDES="app/plugins/c*,app/autocreate/**" egg-bin cov
```

### bundle

Bundle an Egg application into a deployable artifact with `@eggjs/egg-bundler`.

```bash
egg-bin bundle
egg-bin bundle --output ./dist-bundle
egg-bin bundle --mode development
egg-bin bundle --framework egg --output ./out
egg-bin bundle --pack-alias some-package=./node_modules/some-package/index.js
```

The command writes the bundle to `./dist-bundle` by default. The generated
artifact can be started with Node from the output directory:

```bash
cd dist-bundle
node worker.js
```

#### bundle options

- `--output` / `-o` output directory, default to `./dist-bundle`
- `--manifest` path to `manifest.json`, default to `<baseDir>/.egg/manifest.json`
- `--framework` / `-f` framework name or absolute path
- `--mode` build mode, `production` or `development`, default to `production`
- `--no-tegg` accepted by the CLI, but not applied by the current bundler
  implementation yet
- `--force-external` package name to always keep external, supports multiple
- `--inline-external` package name to force inline, supports multiple
- `--pack-alias` `@utoo/pack` resolve alias in `<specifier>=<target>` form,
  supports multiple. Dot-relative targets such as `./target.js` and
  `../target.js` are resolved from the application base directory

See [`@eggjs/egg-bundler`](../egg-bundler/README.md) for the programmatic API
and output structure.

## Breaking Changes (v8)

### Migrated from Mocha to Vitest

The `test` and `cov` commands now use [vitest] instead of [Mocha](https://mochajs.org). This brings native TypeScript support, faster execution, and built-in watch mode, but removes some Mocha-specific options:

**Removed flags:**

| Old flag            | Reason                                                          |
| ------------------- | --------------------------------------------------------------- |
| `--parallel` / `-p` | Vitest handles parallelism natively via worker pools            |
| `--jobs` / `-j`     | Replaced by vitest's built-in pool configuration                |
| `--auto-agent`      | Mocha-specific, no equivalent needed in vitest                  |
| `--prerequire`      | Use `test/.setup.ts` setupFile instead                          |
| `--c8`              | Coverage is now configured inside vitest, use `-x` for excludes |

**Removed environment variables:**

| Old env var  | Reason                                         |
| ------------ | ---------------------------------------------- |
| `MOCHA_FILE` | Mocha-specific, vitest runner is auto-detected |

**Changed output format:**

Test output now follows vitest's format. Assertions in test scripts that match mocha output (e.g. `"N passing"`) should be updated to vitest output (e.g. `"N passed"`).

**Migration guide:**

1. Replace `before()` / `after()` hooks with `beforeAll()` / `afterAll()` (vitest naming)
2. Import vitest globals explicitly in `.ts` setup files: `import { beforeAll, afterEach } from 'vitest'`
3. Plain `.js` test files can use globals directly (vitest `globals: true` is enabled by default)
4. Remove `--parallel` / `--jobs` flags from your npm scripts

## Custom egg-bin for your team

See <https://oclif.io/docs/configuring_your_cli/>

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).

[vitest]: https://vitest.dev
[v8 coverage]: https://vitest.dev/guide/coverage
