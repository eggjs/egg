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

## [4.0.1](https://github.com/eggjs/session/compare/v4.0.0...v4.0.1) (2025-01-21)


### Bug Fixes

* should export sessionStore ([#21](https://github.com/eggjs/session/issues/21)) ([30e2b25](https://github.com/eggjs/session/commit/30e2b25864edf180695e42a90a8a8bbd9399d63a))

## [4.0.0](https://github.com/eggjs/session/compare/v3.3.0...v4.0.0) (2025-01-19)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Release Notes

- **Package Upgrade**
	- Renamed package from `egg-session` to `@eggjs/session`
	- Updated Node.js compatibility to version 18.19.0+

- **New Features**
	- Enhanced session configuration with improved type safety
	- Added support for more granular session management
	- Improved logging and security configurations

- **Breaking Changes**
	- Dropped support for Node.js versions below 18.19.0
	- Migrated from generator functions to async/await syntax
	- Updated session middleware and configuration structure

- **Performance**
	- Updated dependencies, including `koa-session` to version 7.0.2
	- Optimized session store handling

- **Security**
	- Strengthened default session configurations
	- Added warnings for potential security risks in session settings
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#20](https://github.com/eggjs/session/issues/20)) ([b1a96e5](https://github.com/eggjs/session/commit/b1a96e5c254dadf6664499e7018246898751db2a))

3.3.0 / 2021-03-23
==================

**features**
  * [[`fb47f1b`](http://github.com/eggjs/egg-session/commit/fb47f1b5dd5037def631066a95f36e9c2488e5f3)] - feat: as default not to log the session val (#17) (clchenliang <<clchenliang@hotmail.com>>)

**others**
  * [[`a21e6fe`](http://github.com/eggjs/egg-session/commit/a21e6fe89b5228a4fc9609e775f0909c2bb465ee)] - test: add test case for session maxAge (#16) (Yiyu He <<dead_horse@qq.com>>)

3.2.0 / 2020-05-12
==================

**features**
  * [[`39629ab`](http://github.com/eggjs/egg-session/commit/39629abe1c22ee963f80ab69c18a94c3a3f81cd6)] - feat: warn if httpOnly set to false (#13) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`c0d3cdc`](http://github.com/eggjs/egg-session/commit/c0d3cdc23b9138cecb9d30f8e523bdd593e009fb)] - deps: koa-session@6 (#15) (Yiyu He <<dead_horse@qq.com>>)
  * [[`75c8ee6`](http://github.com/eggjs/egg-session/commit/75c8ee6c4143362edced399d66c11834bc00ae5f)] - test: add sameSite=none test case (#14) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`c9865a7`](http://github.com/eggjs/egg-session/commit/c9865a7e05db773a1a37c296f2170e6ffa899761)] - chore: update travis (TZ | 天猪 <<atian25@qq.com>>)
  * [[`3168fb7`](http://github.com/eggjs/egg-session/commit/3168fb78877dbbc91c4d2df1ed762f9f5684f52d)] - doc: fix miss backticks (#12) (supperchong <<2267805901@qq.com>>)

3.1.0 / 2018-01-09
==================

**features**
  * [[`e34fd6e`](http://github.com/eggjs/egg-session/commit/e34fd6e43e9ce933e5a6cb013b37af5f2f959768)] - feat: listen session events and warn (#11) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`08fd920`](http://github.com/eggjs/egg-session/commit/08fd920cd85cb1c528b74f00e9d2605fbd2e0c86)] - docs: update readme to async function (dead-horse <<dead_horse@qq.com>>)

3.0.0 / 2017-11-09
==================

**others**
  * [[`38e901b`](http://github.com/eggjs/egg-session/commit/38e901ba06373647074530acdaa72f01d33551a7)] - refactor: upgrade koa-session, support egg2. [BREAKING CHANGE] (#10) (Yiyu He <<dead_horse@qq.com>>)

2.1.1 / 2017-06-04
==================

  * docs: fix License url (#9)

2.1.0 / 2017-03-02
==================

  * feat: support set sessionStore to null and get sessionStore (#8)

2.0.0 / 2017-02-28
==================

  * feat: upgrade koa-session@4, support external session store (#7)
  * feat: remove cookie length check (#6)
  * chore: upgrade deps and fix test (#5)

1.1.0 / 2016-11-17
==================

  * feat: check response cookie's length (#4)

1.0.0 / 2016-11-03
==================

  * chore: update deps and test on node v7 (#3)
  * test: fix appveyor yml (#2)
  * test: add testcase (#1)

0.0.2 / 2016-07-14
==================

  * fix: package.json

0.0.1 / 2016-07-14
==================

  * feat: init
