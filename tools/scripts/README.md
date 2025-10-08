# @eggjs/scripts

[![NPM version][npm-image]][npm-url]
[![npm download][download-image]][download-url]
[![Node.js Version](https://img.shields.io/node/v/@eggjs/scripts.svg?style=flat)](https://nodejs.org/en/download/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)

[npm-image]: https://img.shields.io/npm/v/@eggjs/scripts.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@eggjs/scripts
[download-image]: https://img.shields.io/npm/dm/@eggjs/scripts.svg?style=flat-square
[download-url]: https://npmjs.org/package/@eggjs/scripts

deploy tool for egg project.

**Note: Windows is partially supported, see [#22](https://github.com/eggjs/egg-scripts/pull/22)**

## Install

```bash
npm i @eggjs/scripts --save
```

## Usage

Add `eggctl` to `package.json` scripts:

```json
{
  "scripts": {
    "start": "eggctl start --daemon",
    "stop": "eggctl stop"
  }
}
```

Then run as:

- `npm start`
- `npm stop`

**Note:** `egg-scripts` is not recommended to install global, you should install and use it as npm scripts.

## Command

### start

Start egg at prod mode.

```bash
$ eggctl start [options] [baseDir]

# Usage
# eggctl start --port=7001
# eggctl start ./server
```

- **Arguments**
  - `baseDir` - directory of application, default to `process.cwd()`.
- **Options**
  - `port` - listening port, default to `process.env.PORT`, if unset, egg will use `7001` as default.
  - `title` - process title description, use for kill grep, default to `egg-server-${APP_NAME}`.
  - `workers` - numbers of app workers, default to `process.env.EGG_WORKERS`, if unset, egg will use `os.cpus().length` as default.
  - `daemon` - whether run at background daemon mode, don't use it if in docker mode.
  - `framework` - specify framework that can be absolute path or npm package, default to auto detect.
  - `env` - server env, default to `process.env.EGG_SERVER_ENV`, recommended to keep empty then use framwork default env.
  - `stdout` - customize stdout file, default to `$HOME/logs/master-stdout.log`.
  - `stderr` - customize stderr file, default to `$HOME/logs/master-stderr.log`.
  - `timeout` - the maximum timeout when app starts, default to 300s.
  - `ignore-stderr` - whether ignore stderr when app starts.
  - `sourcemap` / `typescript` / `ts` - provides source map support for stack traces.
  - `node` - customize node command path, default will find node from $PATH

### stop

Stop egg gracefull.

**Note:** if exec without `--title`, it will kill all egg process.

```bash
$ eggctl stop [options]

# Usage
# eggctl stop --title=example
```

- **Options**
  - `title` - process title description, use for kill grep.
  - `timeout` - the maximum timeout when app stop, default to 5s.

## Options in `package.json`

In addition to the command line specification, options can also be specified in `package.json`. However, the command line designation takes precedence.

```js
{
  "eggScriptsConfig": {
    "port": 1234,
    "ignore-stderr": true,
    // will pass as `node --max-http-header-size=20000`
    "node-options--max-http-header-size": "20000",
    // will pass as `node --allow-wasi`
    "node-options--allow-wasi": true
  }
}
```

## Questions & Suggestions

Please open an issue [here](https://github.com/eggjs/egg/issues?q=is%3Aissue+is%3Aopen+sort%3Aupdated-desc).

## License

[MIT](LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/egg)](https://github.com/eggjs/egg/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
