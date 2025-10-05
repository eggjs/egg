# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## 4.0.0+

### ⚠ BREAKING CHANGES

* drop Node.js < 22.18.0 support
* only support egg@4

part of https://github.com/eggjs/egg/issues/5434
---

## [3.1.0](https://github.com/eggjs/redis/compare/v3.0.0...v3.1.0) (2025-03-23)


### Features

* use oxlint and prettier ([#48](https://github.com/eggjs/redis/issues/48)) ([9900e87](https://github.com/eggjs/redis/commit/9900e87965068b58b4ffcafc2ac1491c0f03b609))

## [3.0.0](https://github.com/eggjs/redis/compare/v2.6.1...v3.0.0) (2025-01-21)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

Here are the release notes for this update:

- **New Features**
	- Updated Redis plugin to support Valkey and Redis
	- Added support for Node.js 18.19.0 and newer versions
	- Enhanced TypeScript configuration and type definitions

- **Breaking Changes**
	- Renamed package from `egg-redis` to `@eggjs/redis`
	- Migrated from generator functions to async/await syntax
	- Updated minimum Node.js version requirement to 18.19.0

- **Improvements**
	- Improved Redis client configuration options
	- Enhanced module compatibility with ES modules
	- Updated dependencies and plugin configuration

- **Bug Fixes**
	- Refined Redis connection and initialization process
	- Improved error handling and logging for Redis connections

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#44](https://github.com/eggjs/redis/issues/44)) ([ceadd9d](https://github.com/eggjs/redis/commit/ceadd9ded3b31a41dac730846b537fbefd4d7687))

## [2.6.1](https://github.com/eggjs/redis/compare/v2.6.0...v2.6.1) (2025-01-19)


### Bug Fixes

* typings of config for multi cluster clients ([#32](https://github.com/eggjs/redis/issues/32)) ([511c75c](https://github.com/eggjs/redis/commit/511c75c78a3d1ba990ef050dd70f9e87dcae6312))

2.6.0 / 2024-04-07
==================

**features**
  * [[`9f02a13`](http://github.com/eggjs/egg-redis/commit/9f02a13bca2a50f7b618d8987604cc6e34c2d646)] - feat: remove node password and db validate on cluster mode (#39) (KenyeeCheung <<kenyeecheung@icloud.com>>)

2.5.0 / 2023-06-06
==================

**features**
  * [[`3088929`](http://github.com/eggjs/egg-redis/commit/3088929586dbf4127a9846767ef247e6c663d883)] - feat: support redis path mode (#33) (QingDeng <<zrl412@163.com>>)

**others**
  * [[`83d5404`](http://github.com/eggjs/egg-redis/commit/83d54044eff260fc3d704a394c410469f4e8b89e)] - docs: fix default redis version (dead-horse <<dead_horse@qq.com>>)

2.4.0 / 2019-06-13
==================

**features**
  * [[`5fbd718`](http://github.com/eggjs/egg-redis/commit/5fbd718c60e4c82a94f34a96583ed877d8e4fa5f)] - feat: add config.client.weakDependent (#30) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`b307f52`](http://github.com/eggjs/egg-redis/commit/b307f52ff8d9b67769b57498bb39fa835916d472)] - chore: test on node@12 (dead-horse <<dead_horse@qq.com>>)

2.3.2 / 2019-04-24
==================

**fixes**
  * [[`ce7e40e`](http://github.com/eggjs/egg-redis/commit/ce7e40eaae3f635654aaa101493e6cf4a921c6cc)] - fix: should listen redis ready event before app start (#29) (killa <<killa123@126.com>>)

2.3.1 / 2019-04-10
==================

**fixes**
  * [[`3b0fa5a`](http://github.com/eggjs/egg-redis/commit/3b0fa5a536517f722e94a304a7eb9e0e530a6328)] - fix(types): add multi client support for typescript (#27) (mars <<marshalys@gmail.com>>)

2.3.0 / 2018-12-18
==================

  * feat: redis sentinel config support (#26)
  * deps: add @types/ioredis to deps (#25)

2.2.0 / 2018-12-04
==================

**features**
  * [[`f062dd5`](http://github.com/eggjs/egg-redis/commit/f062dd571ce17f569a65066a95f600e64b3d15c2)] - feat: support typescript (#23) (耐小心 <<qiqizjl@qq.com>>)

2.1.0 / 2018-11-28
==================

**features**
  * [[`ee3fda1`](http://github.com/eggjs/egg-redis/commit/ee3fda1f95a178a6120fe32141c903d19f7f5ecb)] - feat: support customize ioredis version (#21) (Yiyu He <<dead_horse@qq.com>>)

2.0.1 / 2018-11-28
==================

**fixes**
  * [[`fbfbbfa`](http://github.com/eggjs/egg-redis/commit/fbfbbfabe4650a529f2d2d46983e1b05df1fb347)] - fix: show real redis server time by TIME command (#20) (fengmk2 <<fengmk2@gmail.com>>)

2.0.0 / 2018-02-27
==================

**others**
  * [[`70e85e2`](http://github.com/eggjs/egg-redis/commit/70e85e2710c729245281b78007be4d84fba10dbe)] - chore: add package.files (dead-horse <<dead_horse@qq.com>>)
  * [[`45585e8`](http://github.com/eggjs/egg-redis/commit/45585e81ff30bd2e98241c924605272b516f9b9a)] - chore: update dependencies and fix ci (#16) (Yiyu He <<dead_horse@qq.com>>)
  * [[`8b88641`](http://github.com/eggjs/egg-redis/commit/8b886413ff60539b4e53fce50cfc8be0790d0612)] - refactor: use async function (#15) (QIAO <<445271466@qq.com>>)
  * [[`8dd3776`](http://github.com/eggjs/egg-redis/commit/8dd3776c346e22c7e9afc14a141c026f7d6dd7ae)] - deps: Update ioredis (#14) (thegatheringstorm <<tgs@tgs.blue>>)
  * [[`59d9579`](http://github.com/eggjs/egg-redis/commit/59d9579f37d5b54d62674d1ab3ba1274537b5590)] - docs: fix some typo (#13) (kyle <<succpeking@hotmail.com>>)
  * [[`de17719`](http://github.com/eggjs/egg-redis/commit/de17719f93bf566f5499d8ceb3f4588de3f2d7d3)] - docs:add nopassword doc (#12) (Adams <<jtyjty99999@126.com>>)
  * [[`5b0dd99`](http://github.com/eggjs/egg-redis/commit/5b0dd9963d1e78e34ebe6fb6ac7aaa663ee23115)] - chore:bump to 1.0.2 (jtyjty99999 <<jtyjty99999@126.com>>),

1.0.2 / 2017-07-13
==================

  * fix : fix check method (#10)
  * docs: add configuration details (#9)
  * test: upgrade all deps (#7)
  * docs:fix redis cluster doc (#6)

1.0.1 / 2017-02-21
==================

  * fix:fix zero judgement (#5)

1.0.0 / 2017-02-17
==================

  * feat: implement with ioredis