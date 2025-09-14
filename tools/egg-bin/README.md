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

Using [mocha] to run test.

```bash
egg-bin test [...files] [options]
```

- `files` is optional, default to `test/**/*.test.ts`
- `test/fixtures`, `test/node_modules` is always exclude.

#### auto require `test/.setup.ts`

If `test/.setup.ts` file exists, it will be auto require as the first test file.

```bash
test
  ├── .setup.ts
  └── foo.test.ts
```

#### test options

You can pass any mocha argv.

- `--timeout` milliseconds, default to 60000
- `--changed` / `-c` only test changed test files(test files means files that match `${pwd}/test/**/*.test.(js|ts)`)
- `--parallel` enable mocha parallel mode, default to `false`.
- `--auto-agent` auto start agent in mocha master agent.
- `--jobs` number of jobs to run in parallel, default to `os.cpus().length - 1`.
- `--mochawesome` enable [mochawesome](https://github.com/adamgruber/mochawesome) reporter, default to `true`.

#### test environment

Environment is also support, will use it if options not provide.

You can set `TESTS` env to set the tests directory, it support [glob] grammar.

```bash
TESTS=test/a.test.ts egg-bin test
```

And the reporter can set by the `TEST_REPORTER` env, default is `spec`.

```bash
TEST_REPORTER=doc egg-bin test
```

The test timeout can set by `TEST_TIMEOUT` env, default is `60000` ms.

```bash
TEST_TIMEOUT=2000 egg-bin test
```

### cov

Using [mocha] and [c8] to run code coverage, it support all test params above.

Coverage reporter will output text-summary, json and lcov.

#### cov options

You can pass any mocha argv.

- `-x` add dir ignore coverage, support multiple argv
- `--prerequire` prerequire files for coverage instrument, you can use this options if load files slowly when call `mm.app` or `mm.cluster`
- `--typescript` enable typescript support. If `true`, will auto add `.ts` extension and ignore `typings` and `d.ts`.
- `--c8` c8 instruments passthrough. you can use this to overwrite egg-bin's default c8 instruments and add additional ones.
  > - egg-bin have some default instruments passed to c8 like `-r` and `--temp-directory`
  > - `egg-bin cov --c8="-r teamcity -r text" --c8-report=true`
- also support all test params above.

#### cov environment

You can set `COV_EXCLUDES` env to add dir ignore coverage.

```bash
COV_EXCLUDES="app/plugins/c*,app/autocreate/**" egg-bin cov
```

## Custom egg-bin for your team

See <https://oclif.io/docs/configuring_your_cli/>

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).

[mocha]: https://mochajs.org
[glob]: https://github.com/isaacs/node-glob
