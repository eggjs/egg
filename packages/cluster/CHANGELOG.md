# Changelog

## [3.0.1](https://github.com/eggjs/cluster/compare/v3.0.0...v3.0.1) (2024-12-30)


### Bug Fixes

* require support paths ([#118](https://github.com/eggjs/cluster/issues/118)) ([b74872c](https://github.com/eggjs/cluster/commit/b74872c1625e7a6c3ee58a3cc468fdae43a9b000))

## [3.0.0](https://github.com/eggjs/cluster/compare/v2.4.0...v3.0.0) (2024-12-28)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Release Notes for @eggjs/cluster v3.0.0-beta.4

- **New Features**
  - Migrated project to TypeScript.
  - Added support for Node.js 18.19.0, 20, 22, and 23.
  - Enhanced type safety and module exports.
  - Improved worker thread and process management.
  - Introduced new error handling classes for better debugging.

- **Breaking Changes**
  - Renamed package from `egg-cluster` to `@eggjs/cluster`.
  - Updated import/export syntax to ES modules.
  - Minimum Node.js version is now 18.19.0.

- **Performance Improvements**
  - Refactored cluster and worker management.
  - Optimized error handling and logging.

- **Bug Fixes**
  - Resolved various edge cases in worker initialization.
  - Improved graceful shutdown mechanisms.

- **Documentation**
  - Updated README with new package name and usage examples.
  - Added TypeScript and ESM import examples.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#117](https://github.com/eggjs/cluster/issues/117)) ([e15a4bf](https://github.com/eggjs/cluster/commit/e15a4bf45682609f9362eef485e9fc87d916d2a0))

## [2.4.0](https://github.com/eggjs/egg-cluster/compare/v2.3.0...v2.4.0) (2024-12-09)


### Features

* use detect-port v2 ([#116](https://github.com/eggjs/egg-cluster/issues/116)) ([8480a40](https://github.com/eggjs/egg-cluster/commit/8480a403f6778ae70af7ad2ce7f4bfac5b565828))

## [2.3.0](https://github.com/eggjs/egg-cluster/compare/v2.2.1...v2.3.0) (2024-06-03)


### Features

* remove semver and depd ([#113](https://github.com/eggjs/egg-cluster/issues/113)) ([789a1cd](https://github.com/eggjs/egg-cluster/commit/789a1cd3f1f058fa0112e491f5c2259534cc7bbb))

## [2.2.1](https://github.com/eggjs/egg-cluster/compare/v2.2.0...v2.2.1) (2023-12-08)


### Bug Fixes

* worker does not get SIGTERM signal from master when close ([#111](https://github.com/eggjs/egg-cluster/issues/111)) ([211c143](https://github.com/eggjs/egg-cluster/commit/211c143c7a679c0049573742dd9e3691188857eb))

## [2.2.0](https://github.com/eggjs/egg-cluster/compare/v2.1.1...v2.2.0) (2023-06-27)


### Features

* add debugPort to allow listen both https and http protocol ([#109](https://github.com/eggjs/egg-cluster/issues/109)) ([74cbb35](https://github.com/eggjs/egg-cluster/commit/74cbb35a8890cdf069f2a98aab288d9804419c70))

## [2.1.1](https://github.com/eggjs/egg-cluster/compare/v2.1.0...v2.1.1) (2023-06-06)


### Bug Fixes

* worker_threads start auto add port when server.address() return null ([#108](https://github.com/eggjs/egg-cluster/issues/108)) ([62d6d0b](https://github.com/eggjs/egg-cluster/commit/62d6d0bada98c5976481b0bd366afabc8245c6ff))

## [2.1.0](https://github.com/eggjs/egg-cluster/compare/v2.0.1...v2.1.0) (2023-05-31)


### Features

* custom env by options.env ([#107](https://github.com/eggjs/egg-cluster/issues/107)) ([4b11bf9](https://github.com/eggjs/egg-cluster/commit/4b11bf9e7117f5bd5e69985d8185cfa509256ae4))

## [2.0.1](https://github.com/eggjs/egg-cluster/compare/v2.0.0...v2.0.1) (2022-12-19)


### Bug Fixes

* worker_threads mode without ports ([#103](https://github.com/eggjs/egg-cluster/issues/103)) ([a088e99](https://github.com/eggjs/egg-cluster/commit/a088e9953ed269af584a5fec6304847690cbf347))

---


2.0.0 / 2022-11-02
==================

**features**
  * [[`04a1e85`](http://github.com/eggjs/egg-cluster/commit/04a1e8539c61e2fecc16591e290aea84dcabd740)] - feat: support worker_threads (#101) (hyj1991 <<yeekwanvong@gmail.com>>)

1.27.1 / 2021-11-15
==================

**others**
  * [[`98688f0`](http://github.com/eggjs/egg-cluster/commit/98688f04d9d6536a37dacf9f68ff44b1fbffbd35)] - chore: log more info before master closing (hyj1991 <<yeekwanvong@gmail.com>>)

1.27.0 / 2021-04-05
==================

**features**
  * [[`36f3a05`](https://github.com/eggjs/egg-cluster.git/commit/36f3a05e396ba1c82e4c1d961aca91d09800d294)] - feat: catch app/agent boot error to formater FrameworkError (#98) (mansonchor.github.com <<mansonchor1987@gmail.com>>)

1.26.0 / 2019-11-18
==================

**features**
  * [[`63c3cd0`](http://github.com/eggjs/egg-cluster/commit/63c3cd0dcbd5d3ca8d6b6c5bf08c85f4dd698d25)] - feat: print process.env.HOST while egg started (#96) (zōng yǔ <<gxcsoccer@users.noreply.github.com>>)

1.25.0 / 2019-07-24
==================

**features**
  * [[`7fca260`](http://github.com/eggjs/egg-cluster/commit/7fca2606ae4be84c69af47d64227ca474e67ea70)] - feat: suppport config.cluster.https (#90) (TZ | 天猪 <<atian25@qq.com>>)

**fixes**
  * [[`5547a87`](http://github.com/eggjs/egg-cluster/commit/5547a877078b13dadde8b7fef94347dc18272eff)] - fix: add ca opiton if https (#93) (dxd <<dxd_sjtu@outlook.com>>)

1.24.0 / 2019-06-14
==================

**features**
  * [[`4b47bec`](http://github.com/eggjs/egg-cluster/commit/4b47becda40f72d260f7f101791371c803968533)] - feat: add windowsHide support (#92) (QingDeng <<zrl412@163.com>>)

1.23.3 / 2019-05-27
==================

**fixes**
  * [[`0f7558b`](http://github.com/eggjs/egg-cluster/commit/0f7558b24b5d6e37259a02c62cf4b92d678f3ee0)] - fix: should not ready when call server.listen in sticky mode (#91) (killa <<killa123@126.com>>)

1.23.2 / 2019-04-08
==================

**fixes**
  * [[`de95e90`](http://github.com/eggjs/egg-cluster/commit/de95e907637aa6aa3b143e37fcccf457d9f53df8)] - fix: should destroy socket when receives an RST after the three-way handshake. (#89) (ngot <<zhuanghengfei@gmail.com>>)

1.23.1 / 2019-03-12
==================

**others**
  * [[`45d956f`](http://github.com/eggjs/egg-cluster/commit/45d956f9f29610da9316e5c5e8335c608e985739)] - chore: update all dependencies (#88) (Yiyu He <<dead_horse@qq.com>>)

1.23.0 / 2019-03-04
==================

**features**
  * [[`8740538`](http://github.com/eggjs/egg-cluster/commit/874053871bd8f28d27c8f82aae1bc3a1b8f4e98d)] - feat: save pid file (#87) (TZ | 天猪 <<atian25@qq.com>>)

1.22.2 / 2018-12-04
==================

**fixes**
  * [[`99d0c6b`](http://github.com/eggjs/egg-cluster/commit/99d0c6b6927add7536f505ba7e128a3c5c33475d)] - fix: master should not send to parent when egg-script is closed (#84) (killa <<killa123@126.com>>)

**others**
  * [[`5920799`](http://github.com/eggjs/egg-cluster/commit/5920799dd7db9ea107723dd4794c2223463c2d8c)] - docs: remove `options.typescript` (#82) (吖猩 <<whxaxes@qq.com>>)

1.22.1 / 2018-10-19
===================

  * fix: should not start app when agent start fail (#81)

1.22.0 / 2018-10-10
==================

**features**
  * [[`2b662a5`](http://github.com/eggjs/egg-cluster/commit/2b662a5d5a86cebf1096648afe473a96ce09b498)] - feat: kill all sub processes when exit (#79) (Yiyu He <<dead_horse@qq.com>>)

1.21.0 / 2018-09-28
===================

  * feat: graceful exit when boot failed (#78)

1.20.0 / 2018-09-17
===================

  * feat: kill agent after workers are killed (#76)
  * docs: fix typo (#77)

1.19.1 / 2018-08-27
==================

**fixes**
  * [[`b0c8d19`](http://github.com/eggjs/egg-cluster/commit/b0c8d19e08495c596045eada460590562a4150be)] - fix: fix messenger#sendTo (#74) (killa <<killa123@126.com>>)

1.19.0 / 2018-07-26
===================

  * feat: support options.require (#73)
  * feat: replace worker file from outside (#72)

1.18.0 / 2018-06-12
===================

  * feat: support config agent debug port (#70)

1.17.0 / 2018-06-06
==================

**features**
  * [[`134bd4c`](http://github.com/eggjs/egg-cluster/commit/134bd4c15361018747f6bc6c13748a8e60fc8b62)] - feat: not start check in local (#71) (Axes <<whxaxes@qq.com>>)

1.16.1 / 2018-05-16
===================

  * fix: use --inspect-port after 8.x (#69)
  * fix: remove useless unittest (#65)
  * fix: master close log print timeout error (#64)

1.16.0 / 2018-03-28
===================

  * fix: wait 5s when master exit (#60)
  * feat: add typescript support (#61)

1.15.0 / 2018-03-05
==================

**features**
  * [[`7f0be22`](http://github.com/eggjs/egg-cluster/commit/7f0be221808a29fd049fac4c0c53da8d48ce6e6e)] - feat: support beforeClose on other env (#59) (Haoliang Gao <<sakura9515@gmail.com>>)

**others**
  * [[`e0deece`](http://github.com/eggjs/egg-cluster/commit/e0deece60a04bdeeb9841fbb751d49d94a5b0828)] - test: fix unstable test (#58) (Haoliang Gao <<sakura9515@gmail.com>>)

1.14.0 / 2018-02-05
==================

**features**
  * [[`102a0ad`](http://github.com/eggjs/egg-cluster/commit/102a0adc8577ada8ff8383ba935f7973f215999f)] - feat: https options (#57) (TZ | 天猪 <<atian25@qq.com>>)

1.13.1 / 2018-01-05
==================

**others**
  * [[`53ed359`](http://github.com/eggjs/egg-cluster/commit/53ed359e32b395105d859de7ea4bc564fe3e9af1)] - chore: log runtime versions (#56) (TZ | 天猪 <<atian25@qq.com>>)

1.13.0 / 2017-12-05
==================

**features**
  * [[`366d9bb`](http://github.com/eggjs/egg-cluster/commit/366d9bbb40db2b920258210f51b0a15fe224974c)] - feat: add worker manager and check worker/agent status (#54) (Yiyu He <<dead_horse@qq.com>>)

1.12.6 / 2017-11-21
==================

**fixes**
  * [[`ccdbf9f`](http://github.com/eggjs/egg-cluster/commit/ccdbf9f34a9eb38333a7a12ab0ec22e3b1bea344)] - fix: should send current worker pids when agent restart (#53) (Haoliang Gao <<sakura9515@gmail.com>>)

1.12.5 / 2017-11-16
==================

**fixes**
  * [[`c683b67`](http://github.com/eggjs/egg-cluster/commit/c683b678c2474fca1e9dad8101525c9661177486)] - fix: crash when socket destroyed during connecting (#50) (Hengfei Zhuang <<zhuanghengfei@gmail.com>>)

**others**
  * [[`242835e`](http://github.com/eggjs/egg-cluster/commit/242835e4948b2b2f76352683aeee4bb2bd84186c)] - test: `don't fork` has been printed to stdout (#52) (Haoliang Gao <<sakura9515@gmail.com>>)

1.12.4 / 2017-10-29
==================

**others**
  * [[`b768018`](http://github.com/eggjs/egg-cluster/commit/b768018b77e1c6f80e8cfd9e9c38e63ec44a473d)] - refactor: use utility to read json (#49) (Haoliang Gao <<sakura9515@gmail.com>>)

1.12.3 / 2017-10-12
==================

**fixes**
  * [[`4b80f33`](http://github.com/eggjs/egg-cluster/commit/4b80f33d272b374e005f3dd2f9dc39865f0d3688)] - fix: master should exit when EADDRINUSE error (#48) (Haoliang Gao <<sakura9515@gmail.com>>)

1.12.2 / 2017-09-28
===================

**fixes**
  * [[`0c886a4`](https://github.com/eggjs/egg-cluster/commit/0c886a43ecac25e79de910cb04778efc77aab9a4)] - fix: should disable worker refork (#46) (fengmk2 <<fengmk2@gmail.com>>)

1.12.1 / 2017-09-22
==================

**fixes**
  * [[`30d120d`](http://github.com/eggjs/egg-cluster/commit/30d120dd292d79a25113c951664d18480dde2a00)] - fix: should send egg-ready when app/agent restarted after launched (#45) (Haoliang Gao <<sakura9515@gmail.com>>)

1.12.0 / 2017-09-14
==================

**features**
  * [[`56bff0d`](http://github.com/eggjs/egg-cluster/commit/56bff0dda04074cbd7259b2652954832647a9a61)] - feat: agent debugPort 5856 -> 5800 (TZ <<atian25@qq.com>>)

1.11.2 / 2017-09-13
==================

**features**
  * [[`61b5b66`](http://github.com/eggjs/egg-cluster/commit/61b5b660146b5ef3795f7f2fe4d61195ca6d93c1)] - feat: simplify debug error when kill by vscode (TZ <<atian25@qq.com>>)
  * [[`308d9fd`](http://github.com/eggjs/egg-cluster/commit/308d9fde230122dd1d85d9563dd64c5103f8a7df)] - feat: debug & egg-ready message (TZ <<atian25@qq.com>>)
  * [[`a4fa5f5`](http://github.com/eggjs/egg-cluster/commit/a4fa5f5171226354d02760edbfc20db8eca3f9e1)] - feat: delete default port options that has defined in egg (#40) (Haoliang Gao <<sakura9515@gmail.com>>)
  * [[`09ccc5a`](http://github.com/eggjs/egg-cluster/commit/09ccc5ab62bbac2a214d80589dcc1695adfb6b90)] - feat: revert to 1.9.2 (TZ <<atian25@qq.com>>)

**others**
  * [[`ab76a19`](http://github.com/eggjs/egg-cluster/commit/ab76a19a8275906df757d2a9e585ccd89c62f6a5)] - test: improve cov (TZ <<atian25@qq.com>>)

1.11.1 / 2017-09-11
==================

**fixes**
  * [[`8d46f20`](http://github.com/eggjs/egg-cluster/commit/8d46f20c04967647a1991736d2db2db0202790a2)] - fix: only set options.debugProtocol at debug mode (#42) (TZ | 天猪 <<atian25@qq.com>>)

1.11.0 / 2017-09-08
==================

**features**
  * [[`49bd949`](http://github.com/eggjs/egg-cluster/commit/49bd949a5271f0db86de6c4111fefbd6613017e1)] - feat: delete default port options that has defined in egg (#40) (Haoliang Gao <<sakura9515@gmail.com>>)

**others**
  * [[`0561ce7`](http://github.com/eggjs/egg-cluster/commit/0561ce7bd69151dd66b1e24352f4f0b632591a39)] - refactor: support debug options (#41) (TZ | 天猪 <<atian25@qq.com>>)
 * [new tag]         1.10.0     -> 1.10.0


1.10.0 / 2017-09-07
==================

**others**
  * [[`0561ce7`](http://github.com/eggjs/egg-cluster/commit/0561ce7bd69151dd66b1e24352f4f0b632591a39)] - refactor: support debug options (#41) (TZ | 天猪 <<atian25@qq.com>>)

1.9.2 / 2017-08-30
==================

**fixes**
  * [[`7277b00`](http://github.com/eggjs/egg-cluster/commit/7277b00516905f0e26c78c063b7f84044c069b6d)] - fix: debug status detect should support inspect (#39) (TZ | 天猪 <<atian25@qq.com>>)

1.9.1 / 2017-08-28
==================

  * fix: sleep 100ms to make sure SIGTERM send to the child processes (#37)
  * test: fix test that should mock the default port (#38)

1.9.0 / 2017-07-27
==================

  * feat: add listen config (#34)
  * refactor: disable console (#36)
  * deps: upgrade eslint (#35)
  * refactor: set agent worker and app worker console level (#33)
  * deps: upgrade dependencies (#32)

1.8.0 / 2017-06-12
==================

  * feat: use graceful-process to refactor app and agent worker (#30)
  * test: sleep 20s to wait for agent process start (#29)

1.7.0 / 2017-06-09
==================

  * feat: reduce info logs on local env (#28)

1.6.4 / 2017-05-28
==================

  * fix: agent should exit on disconnect event whatever master kill with SIGKILL (#27)

1.6.3 / 2017-05-22
==================

  * fix: fix typo (#24)
  * fix: start error should log what happend (#26)
  * fix: fix deperated api (#25)
  * deps: upgrade dependencies (#22)

1.6.2 / 2017-03-22
==================

  * fix: should print logger when agent start error (#20)

1.6.1 / 2017-03-03
==================

  * fix: sticky logic error (#19)
  * feat: use egg-utils (#18)

1.6.0 / 2017-03-01
==================

  * feat: add options framework (#17)

1.5.0 / 2017-02-21
==================

  * feat: exit when error emitted during start (#16)

1.4.0 / 2017-02-13
==================

  * feat:add sticky cluster mode (#14)
  * test: add test for agent debug port (#13)

1.3.0 / 2017-01-20
==================

  * feat: get clusterPort (#12)

1.2.0 / 2016-12-26
==================

  * feat: npm publish files limit (#10)

1.1.0 / 2016-12-20
==================

  * deps: upgrade dependencies
  * refactor: options should be passed through
  * feat: print env when start (#8)

1.0.0 / 2016-10-12
==================

  * feat: exit if worker start timeout (#6)

0.2.0 / 2016-10-12
==================

  * feat: when debug mode, master should exit when worker die (#7)
  * test: fix testcase (#5)

0.1.0 / 2016-08-16
==================

  * feat: [BREAKING_CHANGE] master won't load config  (#4)
  * test: add test cases (#3)

0.0.4 / 2016-07-16
==================

  * fix: remove antx loader (#2)

0.0.3 / 2016-07-16
==================

  * fix: loader version (#1)
  * fix: logger

0.0.2 / 2016-07-15
==================

  * init code
