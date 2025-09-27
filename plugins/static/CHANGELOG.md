# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## 4.0.0+

### ⚠ BREAKING CHANGES
* drop Node.js < 22.18.0 support

## [3.0.0](https://github.com/eggjs/static/compare/v2.3.1...v3.0.0) (2025-01-12)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
	- Updated package to `@eggjs/static`
	- Enhanced TypeScript support
	- Improved static file serving configuration

- **Chores**
	- Updated GitHub Actions workflows
	- Modernized project configuration
	- Updated Node.js version support to 18.19.0, 20, and 22

- **Documentation**
	- Updated README with new package details
	- Simplified changelog and documentation

- **Refactor**
	- Migrated from CommonJS to ES modules
	- Restructured project file organization

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#26](https://github.com/eggjs/static/issues/26)) ([ab7d6fb](https://github.com/eggjs/static/commit/ab7d6fbed5c215febecca8a5f1a5b8e5515d99a2))

## [2.3.1](https://github.com/eggjs/egg-static/compare/v2.3.0...v2.3.1) (2023-02-13)


### Bug Fixes

* ignore mkdir if exists ([#24](https://github.com/eggjs/egg-static/issues/24)) ([92f3c33](https://github.com/eggjs/egg-static/commit/92f3c339592f789b2107aa849cfa0641df18ca12))

## [2.3.0](https://github.com/eggjs/egg-static/compare/v2.2.0...v2.3.0) (2023-02-12)


### Features

* add contributors ([3bf1ba1](https://github.com/eggjs/egg-static/commit/3bf1ba1b6bafd4b1a61b9fb0438c4ec07939af37))

---


2.2.0 / 2019-02-15
==================

**features**
  * [[`7a4b927`](http://github.com/eggjs/egg-static/commit/7a4b927e53670af89005fde057c838825fe96a30)] - feat: add options.dir for support multi folder serve. (#17) (仙森 <<dapixp@gmail.com>>)

2.1.1 / 2018-05-02
==================

**fixes**
  * [[`a55f7ad`](http://github.com/eggjs/egg-static/commit/a55f7ad50ab880f3114bf12910f5f64e1d4da941)] - fix: range only work with static prefix url (#15) (Yiyu He <<dead_horse@qq.com>>)

2.1.0 / 2018-01-10
==================

**features**
  * [[`cd35dea`](http://github.com/eggjs/egg-static/commit/cd35dea2ccf98dc7fed7d36a25f5555f3712eb8f)] - feat: add range support (#13) (HelloYou <<helloyou2012@yeah.net>>)

**others**
  * [[`93a56c1`](http://github.com/eggjs/egg-static/commit/93a56c1af60c69cd814d33696224a7f044034da6)] - docs: fix confusion for option:prefix (#12) (Airyland <<i@mao.li>>)

2.0.0 / 2017-11-09
==================

**others**
  * [[`bc2d05c`](http://github.com/eggjs/egg-static/commit/bc2d05c10fe6aabc3e0190a20866dd45f4134dda)] - refactor: upgrade dependencies and support egg@2 (#11) (Yiyu He <<dead_horse@qq.com>>)
  * [[`779e4fa`](http://github.com/eggjs/egg-static/commit/779e4fa7d171fa7e1c51c902e9b47be9632cb35d)] - docs: update usage (#10) (TZ | 天猪 <<atian25@qq.com>>)

1.4.1 / 2017-06-04
==================

  * docs: fix License url (#9)

1.4.0 / 2017-06-01
==================

  * feat: use lru to store files (#8)

1.3.0 / 2017-03-25
==================

  * feat: add support multiple directory (#7)

1.2.0 / 2017-02-21
==================

  * deps: upgrade koa-static-cache to 4.x (#6)
  * chore: upgrade deps and fix test (#5)

1.1.0 / 2017-01-13
==================

  * feat: default lazyload (#4)
  * docs: note for koa-static-cache (#3)

1.0.0 / 2016-11-02
==================

  * test: add node v7 (#2)

0.1.0 / 2016-07-18
==================

  * test: add tests (#1)

0.0.2 / 2016-07-15
==================

  * init
