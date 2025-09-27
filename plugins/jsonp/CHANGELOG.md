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

## [3.0.0](https://github.com/eggjs/jsonp/compare/v2.0.0...v3.0.0) (2025-01-11)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

## Release Notes

- **New Features**
  - Added TypeScript support for the JSONP plugin
  - Modernized project structure with ES module syntax
  - Enhanced type definitions and configuration
  - Introduced new GitHub Actions workflows for CI/CD
  - Added a new class for JSONP error handling

- **Breaking Changes**
  - Renamed package from `egg-jsonp` to `@eggjs/jsonp`
  - Dropped support for Node.js versions below 18.19.0
  - Refactored configuration and middleware approach

- **Improvements**
  - Updated GitHub Actions workflows for CI/CD
  - Improved security checks for JSONP requests
  - Added more robust error handling
  - Enhanced logging configuration

- **Dependency Updates**
  - Updated core dependencies
  - Migrated to modern TypeScript tooling
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#12](https://github.com/eggjs/jsonp/issues/12)) ([9136768](https://github.com/eggjs/jsonp/commit/9136768ba518dcec765f86af3e7259d131b6917b))

2.0.0 / 2017-11-11
==================

**others**
  * [[`a9cadba`](http://github.com/eggjs/egg-jsonp/commit/a9cadba740dc54b9c3dd0593495b66b5a98383e8)] - refactor: use async function and support egg@2 (#10) (Yiyu He <<dead_horse@qq.com>>)

1.2.2 / 2017-11-10
==================

**fixes**
  * [[`d14d2d6`](http://github.com/eggjs/egg-jsonp/commit/d14d2d6aa1cdc50ff084f801fa741221667ee577)] - fix: rename to createJsonpBody (#9) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`f7137a0`](http://github.com/eggjs/egg-jsonp/commit/f7137a011b202882fbfd48a4ee434031a9b950d2)] - chore: add pkgfiles check in ci (dead-horse <<dead_horse@qq.com>>)

1.2.1 / 2017-10-11
==================

**fixes**
  * [[`a19f450`](http://github.com/eggjs/egg-jsonp/commit/a19f45089ed8229a3ee0099a730a2be9ea57b114)] - fix: add lib into files (dead-horse <<dead_horse@qq.com>>)

1.2.0 / 2017-10-11
==================

**features**
  * [[`ee98948`](http://github.com/eggjs/egg-jsonp/commit/ee9894834ed8de081b26680a58506896d736cb61)] - feat: add acceptJSONP and open jsonp wrap function (#8) (Gao Peng <<ggjqzjgp103@qq.com>>)

1.1.2 / 2017-07-21
==================

  * fix: should not throw when referrer illegal (#5)

1.1.1 / 2017-06-04
==================

  * docs: fix License url (#4)

1.1.0 / 2017-06-01
==================

  * test: test on node 8
  * feat: support _callback and callback

1.0.0 / 2017-01-23
==================

  * fix: refine jsonp (#1)
  * feat: init jsonp