---
title: Local Development
order: 1
---

We provide convenient ways for development, debugging, and unit tests to improve your development experience.

Here, we need to use [egg-bin] module (Only used in local development and unit tests. For production environment, please refer to [Deployment](./deployment.md)).

First of all, we need to include `egg-bin` module in `devDependencies`:

```bash
$ npm i egg-bin --save-dev
```

## Start App

Once we have modified code and saved in local development, the app will restart automatically, and our changes will take place right after that.

### Adding Script

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "dev": "egg-bin dev"
  }
}
```

And then we may start app by `npm run dev`.

### Environment Configuration

To start app in local, environment needs to be set as `env: local`. The configuration comes from the combination of both `config.local.js` and `config.default.js`.

### Port Assignment

Starting app in local will listen to port 7001 by default. You may assign other port to it like this:

```json
{
  "scripts": {
    "dev": "egg-bin dev --port 7001"
  }
}
```

## Unit Test

Here we mainly cover the usage of the tools, for more details about unit tests, please refer to [here](./unittest.md).

### Adding Script

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "test": "egg-bin test"
  }
}
```

And then we can run unit test by `npm test`.

### Environment Configuration

To run test cases, environment needs to be set as `env: unittest`. The configuration comes from the combination of both `config.local.js` and `config.unittest.js`.

### Run specific test file

`npm test` command will look for all the files ended with `.test.js` under test folder (default [glob] matching rule is `test/**/*.test.js`).

However, we would like to run only the test cases that we are working on sometimes. In this case, we may specify a file in the following way:

```bash
$ TESTS=test/x.test.js npm test
```

[glob] expressions are supported here.

### Reporter Setting

Mocha supports various reporters. Default reporter is `spec`.

Reporter is allowed to be specified mannually via setting TEST_REPORTER as the environment variable. For example, to use `dot` instead:

```bash
$ TEST_REPORTER=dot npm test
```

![image](https://cloud.githubusercontent.com/assets/156269/21849809/a6fe6df8-d842-11e6-8507-20da63bc8b62.png)

### Timeout Setting

The default timeout is 30 seconds. We may set our own timeout (in milliseconds). For example, setting timeout to 5 seconds:

```bash
$ TEST_TIMEOUT=5000 npm test
```

### Pass Parameters via argv

Besides environment variables, `egg-bin test` also supports passing parameters directly, and it supports all mocha parameters. You may refer to [mocha usage](https://mochajs.org/#usage).

```bash
$ # Passing parameters via npm need to add an extra `--`, according to https://docs.npmjs.com/cli/run-script
$ npm test -- --help
$
$ # Equivalent to `TESTS=test/**/test.js npm test`. Since the limitation of bash, it's better to add double qoute to path.
$ npm test "test/**/test.js"
$
$ # Equivalent to `TEST_REPORTER=dot npm test`
$ npm test -- --reporter=dot
$
$ # Parameters of mocha are supported, such as grep, require, etc.
$ npm test -- -t 30000 --grep="should GET"
```

## Code Coverage

egg-bin has build-in [nyc](https://github.com/istanbuljs/nyc) to support calculating code coverage report of unit test.

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "cov": "egg-bin cov"
  }
}
```

And then we can get code coverage report of unit test via `npm run cov`.

```bash
$ egg-bin cov

  test/controller/home.test.js
    GET /
      ✓ should status 200 and get the body
    POST /post
      ✓ should status 200 and get the request body

  ...

  16 passing (1s)

=============================== Coverage summary ===============================
Statements   : 100% ( 41/41 )
Branches     : 87.5% ( 7/8 )
Functions    : 100% ( 10/10 )
Lines        : 100% ( 41/41 )
================================================================================
```

And we may open HTML file of complete code coverage report via `open coverage/lcov-report/index.html`.

![image](https://cloud.githubusercontent.com/assets/156269/21845201/a9a85ab6-d82c-11e6-8c24-5e85f352be4a.png)

### Environment Configuration

Just like test, the environment needs to be set to `env:unittest` to run cov, and the configuration comes from the combination of both `config.local.js` and `config.unittest.js`.

### Ignore Specific Files

To ignore some files in code coverage rate calculation, You may use `COV_EXCLUDES` as the environment variable to ignore some specific files that don't need the test converages:

```bash
$ COV_EXCLUDES=app/plugins/c* npm run cov
$ # Or pass this setting via parameters
$ npm run cov -- --x=app/plugins/c*
```

## Debugging

### Log Print

### Use `Logger` Module

There's a built-in [Log](./logger.md) in the egg, so you may use logger.debug() to print out debug information. **We recommend you use it in your own code.**

```js
// controller
this.logger.debug('current user: %j', this.user);

// service
this.ctx.logger.debug('debug info from service');

// app/init.js
app.logger.debug('app init');
```

Levels of logs can be configured via `config.logger.level` for printing into file, and `config.logger.consoleLevel` for printing into console.

### Use `Debug` Module

[debug](https://www.npmjs.com/package/debug) module is a debug tool widely adopted in Node.js community, plenty of modules are using it to print debug information. So for the Egg community. **We recommand you use it in your own development of framework and plugins.**

It's easy for us to watch the whole process of test through `DEBUG` as the environment variable to start with certain code.

(Do not confuse debug module with logger module, for the latter also has quite a lot of functions, what we mean "log" here is the debug info.)

Turn on log of all modules:

```bash
$ DEBUG=* npm run dev
```

Turn on log of specific module:

```bash
$ DEBUG=egg* npm run dev
```

Detail logs of unit tests progress are able to be viewed via `DEBUG=* npm test`.

### Debug with `egg-bin`

#### Adding Script

Add `npm scripts` into `package.json`：

```json
{
  "scripts": {
    "debug": "egg-bin debug"
  }
}
```

And then we may set breakpoints for debugging our app via `npm run debug`.

`egg-bin` will select debug protocol automatically. [Inspector Protocol] will be selected for version 8.x and later. For earlier ones, [Legacy Protocol] is the choice.

Meanwhile, It also supports customized debug parameters.

```bash
$ egg-bin debug --inpsect=9229
```

- Debug port of `master` is 9229 or 5858 (Legacy Protocol).
- Debug port of `agent` is fixed to 5800, it is customizable via `process.env.EGG_AGENT_DEBUG_PORT`.
- Debug port number of `worker` will increase from `master` port number.
- During developing period, worker will "hot restart" once the code is changed, and it will cause the increase of port. Please refer to the following IDE configuration for auto-reconnecting.

#### Environment Configuration

App starts by `env: local` when executing debug . The configuration comes from the combination of both `config.local.js` and `config.unittest.js`.

#### Debug with [DevTools]

The latest DevTools only supports [Inspector Protocol]. Thus you will need to install Node.js 8.x or higher verions to be able to use it.

Execute `npm run debug` to start it:

```bash
➜  showcase git:(master) ✗ npm run debug

> showcase@1.0.0 debug /Users/tz/Workspaces/eggjs/test/showcase
> egg-bin debug

Debugger listening on ws://127.0.0.1:9229/f8258ca6-d5ac-467d-bbb1-03f59bcce85b
For help see https://nodejs.org/en/docs/inspector
2017-09-14 16:01:35,990 INFO 39940 [master] egg version 1.8.0
Debugger listening on ws://127.0.0.1:5800/bfe1bf6a-2be5-4568-ac7d-69935e0867fa
For help see https://nodejs.org/en/docs/inspector
2017-09-14 16:01:36,432 INFO 39940 [master] agent_worker#1:39941 started (434ms)
Debugger listening on ws://127.0.0.1:9230/2fcf4208-4571-4968-9da0-0863ab9f98ae
For help see https://nodejs.org/en/docs/inspector
9230 opened
Debug Proxy online, now you could attach to 9999 without worry about reload.
DevTools → chrome-devtools://devtools/bundled/inspector.html?experiments=true&v8only=true&ws=127.0.0.1:9999/__ws_proxy__
```

And then choose one of the following ways:

- Visit the `DevTools` URL printed in the last few lines in console directly. Since this URL is proxied from worker, you don't need to worry about restarting.
- Open `chrome://inspect`, and config port accordingly, then click `Open dedicated DevTools for Node` to open debug console.

![DevTools](https://user-images.githubusercontent.com/227713/30419047-a54ac592-9967-11e7-8a05-5dbb82088487.png)

#### Debug with WebStorm

`egg-bin` will read environment variable `$NODE_DEBUG_OPTION` set in WebStorm debug mode.

Start npm debug in WebStorm：

![WebStorm](https://user-images.githubusercontent.com/227713/30423086-5dd32ac6-9974-11e7-840f-904e49a97694.png)

#### Debug with [VSCode]

There are 2 ways:

1st method: open settings in VSCode, turn on `Debug: Toggle Auto Attach`, and then execute `npm run debug` in the terminal.

2nd method: setup `.vscode/launch.json` in VSCode, and then simply start with F5 key. (Note: You have to turn off the settings mentioned in the 1st method before doing it).

```js
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Launch Egg",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceRoot}",
      "runtimeExecutable": "npm",
      "windows": { "runtimeExecutable": "npm.cmd" },
      "runtimeArgs": [ "run", "debug" ],
      "console": "integratedTerminal",
      "protocol": "auto",
      "restart": true,
      "port": 9229,
      "autoAttachChildProcesses": true
    }
  ]
}
```

And we offer a [vscode-eggjs] extention to setup auto-matically.

![VSCode](https://user-images.githubusercontent.com/227713/35954428-7f8768ee-0cc4-11e8-90b2-67e623594fa1.png)

For more options of setting up debug in VSCode, please refer to [Node.js Debugging in VS Code](https://code.visualstudio.com/docs/nodejs/nodejs-debugging).

## More

If you would like to know more about local development, like customizing a local development tool for your team, please refer to [egg-bin].

[glob]: https://www.npmjs.com/package/glob
[egg-bin]: https://github.com/eggjs/egg-bin
[vscode]: https://code.visualstudio.com
[legacy protocol]: https://github.com/buggerjs/bugger-v8-client/blob/master/PROTOCOL.md
[inspector protocol]: https://chromedevtools.github.io/debugger-protocol-viewer/v8
[devtools]: https://developer.chrome.com/devtools
[webstorm]: https://www.jetbrains.com/webstorm/
[vscode-eggjs]: https://github.com/eggjs/vscode-eggjs
