# Changelog

## [4.0.4](https://github.com/eggjs/watcher/compare/v4.0.3...v4.0.4) (2025-01-11)


### Bug Fixes

* add isDirectory property ([#18](https://github.com/eggjs/watcher/issues/18)) ([1aaa983](https://github.com/eggjs/watcher/commit/1aaa98388edbdb4a327bbf3bd18f6760e3bfd262))

## [4.0.3](https://github.com/eggjs/watcher/compare/v4.0.2...v4.0.3) (2025-01-04)


### Bug Fixes

* export watcher type on eggjs/core namespace ([#17](https://github.com/eggjs/watcher/issues/17)) ([12e7fbd](https://github.com/eggjs/watcher/commit/12e7fbdcd9381c662b8cd3a22e1e2dcafa15040f))

## [4.0.2](https://github.com/eggjs/watcher/compare/v4.0.1...v4.0.2) (2024-12-20)


### Bug Fixes

* should export watcher from EggWatcherApplicationCore ([#16](https://github.com/eggjs/watcher/issues/16)) ([59a1880](https://github.com/eggjs/watcher/commit/59a18804aed5f4fd4aa4fbf65f3044cfb4345dea))

## [4.0.1](https://github.com/eggjs/watcher/compare/v4.0.0...v4.0.1) (2024-12-20)


### Bug Fixes

* import event source only default export ([#15](https://github.com/eggjs/watcher/issues/15)) ([5c52c49](https://github.com/eggjs/watcher/commit/5c52c49c1347da194eb00844335642b1a1f73af8))

## [4.0.0](https://github.com/eggjs/egg-watcher/compare/v3.1.1...v4.0.0) (2024-12-18)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced new configuration files for managing watcher settings in
different environments (default, local, unittest).
- Added a new `Boot` class to manage application lifecycle and watcher
initialization.
- Implemented `Watcher` class for monitoring file changes with event
handling.
- Added `DevelopmentEventSource` and `DefaultEventSource` classes for
specific event source management.

- **Bug Fixes**
- Enhanced path handling in various modules to ensure correct file
watching functionality.

- **Documentation**
	- Updated `README.md` with project name change and improved structure.

- **Tests**
- Introduced new unit tests for watcher functionality and refactored
existing test files to improve clarity and structure.

- **Chores**
- Removed deprecated configuration files and streamlined project
structure.
	- Updated TypeScript configuration for stricter type-checking.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#14](https://github.com/eggjs/egg-watcher/issues/14)) ([c80fea0](https://github.com/eggjs/egg-watcher/commit/c80fea0327a664edfd03bdc2e08757305e28ad32))

3.1.1 / 2020-03-26
==================

**fixes**
  * [[`9ab2eed`](http://github.com/eggjs/egg-watcher/commit/9ab2eed055d4a036cc2926780d5d8107e37523b2)] - fix: spell error on watcher.js (#13) (zoomdong <<1344492820@qq.com>>)

**others**
  * [[`ffd3720`](http://github.com/eggjs/egg-watcher/commit/ffd3720e03c94eec20f8f755a01978a0eee70814)] - chore: update travis (TZ | 天猪 <<atian25@qq.com>>)

3.1.0 / 2018-09-20
==================

**others**
  * [[`0c5269a`](http://github.com/eggjs/egg-watcher/commit/0c5269ad940002ecb442900d4fa285c8d45e014e)] - refactor: reduce same logic codes and add more log (#11) (fengmk2 <<fengmk2@gmail.com>>)

3.0.0 / 2017-11-10
==================

**others**
  * [[`c1d8460`](http://github.com/eggjs/egg-watcher/commit/c1d846066f1d12ace466bf486412930e789d2e92)] - refactor: use async function and support egg@2 (#10) (Yiyu He <<dead_horse@qq.com>>)

2.2.0 / 2017-09-08
==================

  * feat: add event source event logs (#9)

2.1.3 / 2017-06-04
==================

  * docs: fix License url (#8)

2.1.2 / 2017-05-03
==================

  * chore: upgrade dependencies (#7)

2.1.1 / 2017-04-13
==================

  * fix: should support watch one file multiple times (#6)
  * test: add config.keys to fix tests (#5)

2.1.0 / 2017-02-17
==================

  * feat: pass custom options (#4)
  * docs: how to customize event source (#3)

2.0.0 / 2017-01-25
==================

  * feat: [BREAK CHANGE]  use cluster-client (#2)

1.0.0 / 2016-07-20
==================

  * Initial commit
