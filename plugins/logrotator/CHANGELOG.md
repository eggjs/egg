# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## 5.0.0+

### ⚠ BREAKING CHANGES

* drop Node.js < 22.18.0 support
* only support egg@4

part of https://github.com/eggjs/egg/issues/5434
---

## [4.1.0](https://github.com/eggjs/logrotator/compare/v4.0.0...v4.1.0) (2025-03-30)


### Features

* use oxlint ([#35](https://github.com/eggjs/logrotator/issues/35)) ([6ed426e](https://github.com/eggjs/logrotator/commit/6ed426e11a107709427a7e6abd7c5b60864e454d))

## [4.0.0](https://github.com/eggjs/logrotator/compare/v3.2.0...v4.0.0) (2025-02-03)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Package renamed to **@eggjs/logrotator** with updated installation
instructions and documentation.
- Enhanced log rotation configuration for improved file retention and
compression.

- **Refactor**
  - Migrated the codebase to ES Modules with full TypeScript support.
- Streamlined asynchronous handling in both core functionality and
tests.

- **Chores**
- Updated CI workflows to support modern Node.js versions (18, 20, 22).
  - Refined linting and version control ignore configurations.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* add disableRotateByDay configuration(default:false) ([#28](https://github.com/eggjs/logrotator/issues/28)) ([73690a8](https://github.com/eggjs/logrotator/commit/73690a8d65c8737c24b8c0c7d373f04b120450dd))
* support cjs and esm both by tshy ([#33](https://github.com/eggjs/logrotator/issues/33)) ([fa42511](https://github.com/eggjs/logrotator/commit/fa42511f48f75e94ce3248bce0ed7d84def0a24f))
* support gzip compress on rotate file ([#30](https://github.com/eggjs/logrotator/issues/30)) ([059d1c8](https://github.com/eggjs/logrotator/commit/059d1c8c29bcc11f1a387e7a874f477bee6d930f))


### Bug Fixes

* rename class name to HourRotator ([#29](https://github.com/eggjs/logrotator/issues/29)) ([3863a39](https://github.com/eggjs/logrotator/commit/3863a39eb5549ce1c122fb9eb4558e8acbb1dae7))

## [3.2.0](https://github.com/eggjs/egg-logrotator/compare/v3.1.0...v3.2.0) (2024-09-28)


### Features

* remove debug deps ([#32](https://github.com/eggjs/egg-logrotator/issues/32)) ([e897d48](https://github.com/eggjs/egg-logrotator/commit/e897d483736d4d94c4a774c4454245a742c7050a))


### Bug Fixes

* hour crontab ([#31](https://github.com/eggjs/egg-logrotator/issues/31)) ([75e4787](https://github.com/eggjs/egg-logrotator/commit/75e478714f42e6d00f0500817bd2c6f1597174f2))


---


3.1.0 / 2019-04-25
==================

**features**
  * [[`cd39697`](http://github.com/eggjs/egg-logrotator/commit/cd3969726998482df451da01eee759c883bf1552)] - feat: support relative path (#26) (TZ | 天猪 <<atian25@qq.com>>)

3.0.7 / 2019-03-14
==================

**fixes**
  * [[`4c1632b`](http://github.com/eggjs/egg-logrotator/commit/4c1632be11fd527de80acc8bdda22568c5960bd1)] - fix: all rotator should use transport file (#25) (Hongcai Deng <<admin@dhchouse.com>>)

3.0.6 / 2019-03-06
==================

**fixes**
  * [[`4f52df7`](http://github.com/eggjs/egg-logrotator/commit/4f52df7ff5efc963d5459321ba738ea17defba6d)] - fix: clean log should use transport options file (#24) (Hongcai Deng <<admin@dhchouse.com>>)

3.0.5 / 2018-12-04
==================

**fixes**
  * [[`3371e60`](http://github.com/eggjs/egg-logrotator/commit/3371e609c29385ef73093abb9cbdcccc88e8f9b0)] - fix: allow 2 minutes deviation on schedule cron (#22) (fengmk2 <<fengmk2@gmail.com>>)

3.0.4 / 2018-10-24
==================

**fixes**
  * [[`9c0f71f`](http://github.com/eggjs/egg-logrotator/commit/9c0f71f64ee3d78a79983f96211a58ab8b4e3def)] - fix: ignore not exists logdir (#21) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`3c8786d`](http://github.com/eggjs/egg-logrotator/commit/3c8786da71c83526d6349ad4e90fb2aa992cda4b)] - fix: in for in loop add hasOwnProperty filter (#20) (AllenZeng <<zengjuncm@gmail.com>>)

3.0.3 / 2018-03-29
==================

  * fix: custom LogRotator error (#18)

3.0.2 / 2018-02-23
==================

**fixes**
  * [[`7211181`](http://github.com/eggjs/egg-logrotator/commit/72111818bf632abfe16d6ff8545f9a114a15954f)] - fix: support json files (#17) (Haoliang Gao <<sakura9515@gmail.com>>)

3.0.1 / 2017-12-11
==================

**fixes**
  * [[`922824b`](http://github.com/eggjs/egg-logrotator/commit/922824bd4f761e2c37b36ca42b50391ac2be1b29)] - fix: split file at 00:00:01 && update deps (#15) (TZ | 天猪 <<atian25@qq.com>>)

3.0.0 / 2017-11-10
==================

**others**
  * [[`6b4e6e5`](http://github.com/eggjs/egg-logrotater/commit/6b4e6e58ee5aab5310059bde59f3c89fdba2d3ae)] - refactor: use async function and support egg@2 (#13) (Yiyu He <<dead_horse@qq.com>>)

2.3.0 / 2017-11-02
==================

**features**
  * [[`bd3c95f`](http://github.com/eggjs/egg-logrotator/commit/bd3c95f651783ae8ccb167d1ad1e8c9e8590440c)] - feat: support custom hour delimiter (#12) (hui <<kangpangpang@gmail.com>>)

**others**
  * [[`5e6c563`](http://github.com/eggjs/egg-logrotator/commit/5e6c563b0cf34fafe6eab3a1f9f4a084c8bd5a28)] - test: upgrade dependencies (#11) (Haoliang Gao <<sakura9515@gmail.com>>)

2.2.3 / 2017-06-04
==================

  * docs: fix License url (#10)
  * chore: upgrade deps and fix test (#9)

2.2.2 / 2016-10-27
==================

  * fix: should rotate agent log (#8)

2.2.1 / 2016-10-27
==================

  * fix: check directory exist before readdir (#7)

2.2.0 / 2016-09-29
==================

  * refactor: use OO refactor schedule (#6)

2.1.0 / 2016-08-29
==================

  * feat: reload loggers after rotating (#5)

2.0.0 / 2016-08-17
==================

  * feat: rename logrotater => logrotator (#4)

1.0.1 / 2016-08-10
==================

  * fix: auto find log file dirs to do rotate (#2)

1.0.0 / 2016-07-26
==================

  * feat: auto remove expired files (#1)
  * init commit by egg-init
