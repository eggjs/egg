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


## [3.0.1](https://github.com/eggjs/i18n/compare/v3.0.0...v3.0.1) (2025-01-12)


### Bug Fixes

* not allow to override the `app.locals.__` method ([#15](https://github.com/eggjs/i18n/issues/15)) ([6e8447c](https://github.com/eggjs/i18n/commit/6e8447c82281269756e746de38845bd65fde1976))

## [3.0.0](https://github.com/eggjs/i18n/compare/v2.1.1...v3.0.0) (2025-01-11)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

Based on the comprehensive changes, here are the updated release notes:

- **New Features**
  - Migrated package to TypeScript with improved type safety.
- Enhanced internationalization (i18n) support with more flexible
configuration.
  - Added comprehensive GitHub Actions workflows for CI/CD.

- **Improvements**
  - Updated Node.js compatibility to version 18.19.0+.
  - Modernized module system with ES module support.
  - Refined configuration and localization mechanisms.

- **Breaking Changes**
  - Package renamed from `egg-i18n` to `@eggjs/i18n`.
  - Switched from CommonJS to ES module syntax.
  - Removed legacy configuration files and testing infrastructure.

- **Chores**
  - Cleaned up and simplified project structure.
  - Updated dependencies and development tooling.
  - Improved documentation and README.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#14](https://github.com/eggjs/i18n/issues/14)) ([ccc8eaa](https://github.com/eggjs/i18n/commit/ccc8eaa8ea87e84cd706643883c1243db5efa67c))

2.1.1 / 2019-04-30
==================

**fixes**
  * [[`4d1c463`](http://github.com/eggjs/egg-i18n/commit/4d1c4638ec3551735620e384a316c68656870442)] - fix: use ctx.__setLocale to set cookie (#12) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`cfd25db`](http://github.com/eggjs/egg-i18n/commit/cfd25db5d98bd9372a8b18a1e70207fc28ab0d7c)] - test: assert locale cookie without domain (#11) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`99c56c4`](http://github.com/eggjs/egg-i18n/commit/99c56c480a316aaaa5ae5442575fc78e42641909)] - test: node 12 (fengmk2 <<fengmk2@gmail.com>>)

2.1.0 / 2019-04-28
==================

**features**
  * [[`ce59330`](http://github.com/eggjs/egg-i18n/commit/ce59330ef1dc069f43ebde29f8fe345f6a4d186e)] - feat: support ctx.locale setter (#10) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`50322d6`](http://github.com/eggjs/egg-i18n/commit/50322d680e783b30cfed7ffb39e36d3edf2ed210)] - chore: add cookieDomain options description (#9) (fengmk2 <<fengmk2@gmail.com>>)

2.0.0 / 2017-11-10
==================

**others**
  * [[`80e591d`](http://github.com/eggjs/egg-i18n/commit/80e591d86eef8d92a8f8c6eef8d8d8fb00d9a1e2)] - refactor: use async function and support egg@2 (#8) (Yiyu He <<dead_horse@qq.com>>)

1.2.0 / 2017-09-13
==================

**features**
  * [[`1117129`](http://github.com/eggjs/egg-i18n/commit/1117129ce0153d317d376a2692b3de14b94a6717)] - feat: use config/locale/*.js as default I18N folder (#7) (tudou527 <<tudou527@users.noreply.github.com>>)

1.1.1 / 2017-04-19
==================

  * fix: config.i18n.dir should be config.i18n.dirs (#6)

1.1.0 / 2017-01-13
==================

  * feat: add ctx.locale getter (#5)
  * deps: upgrade deps (#4)

1.0.2 / 2016-08-26
==================

  * fix: don't use bind (#3)

1.0.1 / 2016-08-16
==================

  * fix: use loader.getLoadUnits from egg-core (#2)

1.0.0 / 2016-08-02
==================

 * init version
