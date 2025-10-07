# Changelog

>[!IMPORTANT]
>Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.
>
>This project is part of the [Egg.js](https://eggjs.org) ecosystem.
>
>For more information, please refer to the [Egg.js documentation](https://eggjs.org/en/intro/getting-started.html).
>
>For issues and feature requests, please refer to the [Egg.js GitHub repository](https://github.com/eggjs/egg).

## 5.0.0+

### ⚠ BREAKING CHANGES

* drop Node.js < 22.18.0 support
* only support egg@4

part of https://github.com/eggjs/egg/issues/5434

---

## [4.0.0](https://github.com/eggjs/scripts/compare/v3.1.0...v4.0.0) (2024-12-31)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Release Notes

- **New Features**
	- Added support for ECMAScript modules (ESM).
	- Enhanced CLI with more robust start and stop commands.
	- Improved TypeScript integration and type safety.
	- Introduced new commands for stopping an Egg.js server application.
	- Added new configuration options for logging and process management.

- **Improvements**
	- Updated package configuration for better modularity.
	- Modernized test infrastructure with TypeScript support.
	- Refined error handling and logging mechanisms.
	- Enhanced process management capabilities.
- Improved documentation with updated installation instructions and
usage examples.

- **Breaking Changes**
	- Renamed package from `egg-scripts` to `@eggjs/scripts`.
	- Requires Node.js version 18.19.0 or higher.
	- Significant changes to project structure and module exports.

- **Bug Fixes**
	- Improved process management for server start and stop operations.
	- Enhanced cross-platform compatibility.
- Fixed issues with asynchronous route handlers in various applications.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#63](https://github.com/eggjs/scripts/issues/63)) ([d9d0bc6](https://github.com/eggjs/scripts/commit/d9d0bc65aefd1d73be2c40b86366af566cf471c1))

## [3.1.0](https://github.com/eggjs/egg-scripts/compare/v3.0.1...v3.1.0) (2024-12-10)


### Features

* use runscript v2 ([#61](https://github.com/eggjs/egg-scripts/issues/61)) ([ebbb7f6](https://github.com/eggjs/egg-scripts/commit/ebbb7f60446a2bf5ec8eaac40c85c6224dd91c9d))

## [3.0.1](https://github.com/eggjs/egg-scripts/compare/v3.0.0...v3.0.1) (2024-05-11)


### Bug Fixes

* head 100 stderr when startup failed ([#59](https://github.com/eggjs/egg-scripts/issues/59)) ([7f2cecf](https://github.com/eggjs/egg-scripts/commit/7f2cecfeb68f07e9b69871f77b66f8a221c51b90))

## [3.0.0](https://github.com/eggjs/egg-scripts/compare/v2.17.0...v3.0.0) (2024-02-19)


### ⚠ BREAKING CHANGES

* drop Node.js 14 support

### Features

* support configure egg.revert in package.json ([#58](https://github.com/eggjs/egg-scripts/issues/58)) ([a294691](https://github.com/eggjs/egg-scripts/commit/a29469134293a9dec3a7dd5cf6ce71810e913498))


---


2.17.0 / 2022-04-28
==================

**features**
  * [[`47f8e82`](http://github.com/eggjs/egg-scripts/commit/47f8e823e01b74028bf8dee7123fc3f9469fb3b6)] - feat: eggScriptsConfig support node-options (#54) (TZ | 天猪 <<atian25@qq.com>>)

2.16.0 / 2022-03-27
==================

**features**
  * [[`bb1ba0a`](http://github.com/eggjs/egg-scripts/commit/bb1ba0a665cab9530639d98f38b76c3c72176f76)] - feat: --trace-warnings (#53) (mansonchor.github.com <<mansonchor1987@gmail.com>>)

2.15.3 / 2022-03-08
==================

**fixes**
  * [[`ef5496d`](http://github.com/eggjs/egg-scripts/commit/ef5496d1838a508a859cd5d77886098d7de8fec5)] - fix: ps-cmd result may be truncated (#52) (W <<wj342234130@gmail.com>>)

**others**
  * [[`be89f9d`](http://github.com/eggjs/egg-scripts/commit/be89f9d6bb88810ffa3237deab9e4e0d9c4000c2)] - docs(doc): 修改readme文档中的stop脚本处的描述，并增加示例. (#51) (shuidian <<18842643145@163.com>>)

2.15.2 / 2021-11-17
==================

**fixes**
  * [[`b122d86`](http://github.com/eggjs/egg-scripts/commit/b122d86d300df4018291d8f8d8e98ab813048f67)] - fix: sourcemap default value should respect eggScriptConfig (#50) (killa <<killa123@126.com>>)

**others**
  * [[`78c3284`](http://github.com/eggjs/egg-scripts/commit/78c3284cb68748f4487141f5481d6e44288c9e47)] - test: case for injecting incorrect script (#49) (hyj1991 <<yeekwanvong@gmail.com>>)

2.15.1 / 2021-09-15
==================

**features**
  * [[`1a7f09c`](http://github.com/eggjs/egg-scripts/commit/1a7f09c707becaca42522ee415da0fe5961a6ad5)] - feat: support pkgInfo.eggScriptsConfig.require (#47) (hyj1991 <<yeekwanvong@gmail.com>>)

**others**
  * [[`a68ac67`](http://github.com/eggjs/egg-scripts/commit/a68ac679b0eee4eff19c9e5d40ca80409ddf02eb)] - Revert "feat: support pkgInfo.egg.require (#45)" (#48) (hyj1991 <<yeekwanvong@gmail.com>>)

2.15.0 / 2021-09-13
==================

**features**
  * [[`fe179fd`](http://github.com/eggjs/egg-scripts/commit/fe179fda909cd7eb5b6497357202185a4ecf5ec6)] - feat: support pkgInfo.egg.require (#45) (TZ | 天猪 <<atian25@qq.com>>)

2.14.0 / 2021-06-11
==================

**features**
  * [[`f0a342f`](http://github.com/eggjs/egg-scripts/commit/f0a342ffcd3ec1823eb2d42a9dd96c075cea3754)] - feat: --no-deprecation (#44) (TZ | 天猪 <<atian25@qq.com>>)

2.13.0 / 2020-02-25
==================

**features**
  * [[`c0ba739`](http://github.com/eggjs/egg-scripts/commit/c0ba73900642e488b0e6306ea028ef547ceedfae)] - feat: support stop timeout (#43) (hui <<kangpangpang@gmail.com>>)

2.12.0 / 2019-12-16
==================

**features**
  * [[`20483fd`](http://github.com/eggjs/egg-scripts/commit/20483fd56ce51238431fb095ede1c768a99470f2)] - feat: support eggScriptsConfig in package.json (#41) (Yiyu He <<dead_horse@qq.com>>)

2.11.1 / 2019-10-10
==================

**fixes**
  * [[`de61980`](http://github.com/eggjs/egg-scripts/commit/de61980f772c8a24010d3f078658f8c55b072067)] - fix: start command should exit after child process exit when no daemon mode (#39) (killa <<killa123@126.com>>)

**others**
  * [[`7ae9cb0`](http://github.com/eggjs/egg-scripts/commit/7ae9cb054cb91ea7ac1e615e1e3a7fcdaba5f980)] - test: add egg@1 and egg@2 with travis (#36) (Maledong <<maledong_github@outlook.com>>)

2.11.0 / 2018-12-17
===================

  * feat(stop): only sleep when master process exists (#34)
  * fix: stop process only if the title matches exactly (#35)

2.10.0 / 2018-10-10
==================

**fixes**
  * [[`4768950`](http://github.com/eggjs/egg-scripts/commit/4768950d29398031fd6ae129a981c60e308bff0a)] - fix: replace command by args in ps (#29) (Baffin Lee <<baffinlee@gmail.com>>)

**others**
  * [[`f31efb9`](http://github.com/eggjs/egg-scripts/commit/f31efb9133c5edc6176371ca725198f1b43b9aab)] -  feat: support customize node path (#32) (Yiyu He <<dead_horse@qq.com>>)
  * [[`c2479dc`](http://github.com/eggjs/egg-scripts/commit/c2479dc6416386b654fc6e918a4dbd575cc0639e)] - chore: update version (TZ <<atian25@qq.com>>)

2.9.1 / 2018-08-24
==================

  * fix: replace command by args in ps (#29)

2.9.0 / 2018-08-23
==================

**features**
  * [[`1367883`](http://github.com/eggjs/egg-scripts/commit/1367883804e5ab1ece88831ea4d1a934ee757f81)] - feat: add ipc channel in nonDaemon mode (#28) (Khaidi Chu <<i@2333.moe>>)

**others**
  * [[`262ef4c`](http://github.com/eggjs/egg-scripts/commit/262ef4c97179dbf6f8de2eb0547eef4cbc56bf92)] - chore: add license and issues link (#27) (Haoliang Gao <<sakura9515@gmail.com>>)

2.8.1 / 2018-08-19
==================

**fixes**
  * [[`b98fd03`](http://github.com/eggjs/egg-scripts/commit/b98fd03d1e3aaed68004b881f0b3d42fe47341dd)] - fix: use execFile instead of exec for security reason (#26) (fengmk2 <<fengmk2@gmail.com>>)

2.8.0 / 2018-08-10
==================

**others**
  * [[`dac29f7`](http://github.com/eggjs/egg-scripts/commit/dac29f73ed2dfc18edc2e8743ffd509af8ab0f4a)] - refactor: add `this.exit` to instead of `process.exit` (#25) (Khaidi Chu <<i@2333.moe>>)

2.7.0 / 2018-08-10
==================

**features**
  * [[`22faa4c`](http://github.com/eggjs/egg-scripts/commit/22faa4cfbb84cc5bc819d981dce962d8f95f8357)] - feat: stop command support windows (#22) (Baffin Lee <<baffinlee@gmail.com>>)

**others**
  * [[`e07726c`](http://github.com/eggjs/egg-scripts/commit/e07726c176a89dd63482b588868fd1feaab1fba6)] - refactor: raw spawn call to instead of helper.spawn in start non-daemon mode (#23) (Khaidi Chu <<i@2333.moe>>)

2.6.0 / 2018-04-03
==================

  * feat: provides source map support for stack traces (#19)

2.5.1 / 2018-02-06
==================

  * chore: add description for ignore-stderr (#18)

2.5.0 / 2017-12-12
==================

**features**
  * [[`b5559d5`](http://github.com/eggjs/egg-scripts/commit/b5559d54228543b5422047e6f056829df11f8c87)] - feat: support --ignore-error (#17) (TZ | 天猪 <<atian25@qq.com>>)

2.4.0 / 2017-11-30
==================

**features**
  * [[`8eda3d1`](https://github.com/eggjs/egg-scripts/commit/8eda3d10cfea5757f220fd82b562fd5fef433440)] - feat: add `${baseDir}/.node/bin` to PATH if exists (#14) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`4dd24a4`](https://github.com/eggjs/egg-scripts/commit/4dd24a45d92b2c2a8e1e450e0f13ba4143550ca9)] - test: add testcase for #12 (#13) (Haoliang Gao <<sakura9515@gmail.com>>)

2.3.0 / 2017-11-29
==================

**features**
  * [[`4c41319`](http://github.com/eggjs/egg-scripts/commit/4c41319f9e309402b2ccb5c7afd5a6d3cda2453f)] - feat: support stop --title (#16) (TZ | 天猪 <<atian25@qq.com>>)

2.2.0 / 2017-11-22
==================

**features**
  * [[`ac58d00`](http://github.com/eggjs/egg-scripts/commit/ac58d00a974fdfff6b5c722743e4b32174963c52)] - feat: cwd maybe not baseDir (#15) (zhennann <<zhen.nann@icloud.com>>)

2.1.1 / 2017-11-14
==================

**fixes**
  * [[`7324d99`](http://github.com/eggjs/egg-scripts/commit/7324d99b504cac5fef7dbf280f7d9e6243c16bb7)] - fix: should stop app when baseDir is symlink (#12) (Haoliang Gao <<sakura9515@gmail.com>>)

2.1.0 / 2017-10-16
==================

**features**
  * [[`ac40135`](http://github.com/eggjs/egg-scripts/commit/ac40135d5b9a3200ea1bdfdb19d0f7e12d0c511a)] - feat: add eggctl bin (#10) (Haoliang Gao <<sakura9515@gmail.com>>)

2.0.0 / 2017-10-13
==================

**features**
  * [[`0f7ca50`](http://github.com/eggjs/egg-scripts/commit/0f7ca502999c06a9cb05d8e5617f6045704511df)] - feat: [BREAKING_CHANGE] check the status of app when start on daemon (#9) (Haoliang Gao <<sakura9515@gmail.com>>)

**others**
  * [[`cfd0d2f`](http://github.com/eggjs/egg-scripts/commit/cfd0d2f67845fffb9d5974514b65e43b22ed8040)] - refactor: modify the directory of logDir (#8) (Haoliang Gao <<sakura9515@gmail.com>>)

1.2.0 / 2017-09-11
==================

**features**
  * [[`c0300b8`](http://github.com/eggjs/egg-scripts/commit/c0300b8c657fe4f75ca388061f6cb3de9864a743)] - feat: log success at daemon mode (#7) (TZ | 天猪 <<atian25@qq.com>>)

**others**
  * [[`fdd273c`](http://github.com/eggjs/egg-scripts/commit/fdd273c2d6f15d104288fef4d699627a7cf701d9)] - test: add cluster-config fixture (#4) (TZ | 天猪 <<atian25@qq.com>>)

1.1.2 / 2017-09-01
==================

  * fix: should not pass undefined env (#6)
  * docs: fix stop typo (#5)

1.1.1 / 2017-08-29
==================

  * fix: should set title correct (#3)

1.1.0 / 2017-08-16
==================

  * feat: remove env default value (#2)

1.0.0 / 2017-08-02
==================

  * feat: first implementation (#1)
