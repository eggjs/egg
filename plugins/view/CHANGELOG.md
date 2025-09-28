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


## [3.0.1](https://github.com/eggjs/view/compare/v3.0.0...v3.0.1) (2025-02-03)


### Bug Fixes

* should import context types ([46b153f](https://github.com/eggjs/view/commit/46b153fc9155456f674b413d7cac545959ed78ab))

## [3.0.0](https://github.com/eggjs/view/compare/v2.1.4...v3.0.0) (2025-02-03)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

- **New Features**
  - Introduced a streamlined release workflow for automated publishing.
- Enhanced view rendering with asynchronous methods for improved
performance.
- **Refactor**
- Modernized the codebase by migrating from generator functions to
async/await and adopting ES module syntax.
- Rebranded the package from "egg-view" to "@eggjs/view" with updated
dependency management.
- **Documentation**
- Updated installation instructions and usage examples to reflect the
new package name.
- **Chores**
- Upgraded Node.js support to version ≥ 18.19.0 and refined
configuration settings.
- **Bug Fixes**
- Removed obsolete configuration files and streamlined project structure
for better maintainability.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#19](https://github.com/eggjs/view/issues/19)) ([c94425a](https://github.com/eggjs/view/commit/c94425a525768a3a6cd07c8ba024fa4a3974fc0b))

2.1.4 / 2023-02-03
==================

**fixes**
  * [[`8a723fe`](http://github.com/eggjs/egg-view/commit/8a723fe96b3632eafac7f62734500255126a46b3)] - fix: not import PlainObject from egg (#18) (killa <<killa123@126.com>>)

**others**
  * [[`10a233f`](http://github.com/eggjs/egg-view/commit/10a233f78cff9fef9c244c1fbc72e2a7d72784d3)] - docs: update readme (#17) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`c8f3c43`](http://github.com/eggjs/egg-view/commit/c8f3c43ab199d74d7f0145a37ff6b2529580c519)] - deps: update deps && ci (#16) (TZ | 天猪 <<atian25@qq.com>>)

2.1.3 / 2020-11-05
==================

**fixes**
  * [[`e535d56`](http://github.com/eggjs/egg-view/commit/e535d561425c9a5ed1d1d2fd5b23c120ab4a4626)] - fix: added renderView declaration in dts file (#15) (serializedowen <<wjh199455@gmail.com>>)

**others**
  * [[`3633535`](http://github.com/eggjs/egg-view/commit/3633535469d04a8aa0f985126f95281d4fedd09d)] - chore: update travis (TZ | 天猪 <<atian25@qq.com>>)

2.1.2 / 2019-01-30
==================

  * fix: fix ts ci (#14)
  * fix: remove constructor in interface (#12)

2.1.1 / 2018-12-29
==================

  * feat: add d.ts (#11)

2.1.0 / 2018-02-26
==================

**features**
  * [[`72d6668`](http://github.com/eggjs/egg-view/commit/72d6668af5e945c13ad11702c690988533b3c210)] - feat: export original locals to view engine (#9) (Haoliang Gao <<sakura9515@gmail.com>>)

2.0.0 / 2017-11-10
==================

**others**
  * [[`d660e14`](http://github.com/eggjs/egg-view/commit/d660e1494a637296f0e1ba13c40c3d20401dad78)] -  refactor: use async function and support egg@2 (#8) (Yiyu He <<dead_horse@qq.com>>)

1.1.2 / 2017-07-14
==================

  * fix: should skip file when file path out of view path (#7)

1.1.1 / 2017-06-04
==================

  * docs: fix License url (#6)

1.1.0 / 2017-04-01
==================

  * feat: pass root and original name as options when render (#5)
  * docs: add config file (#3)
  * test: fix test (#4)

1.0.1 / 2017-02-28
==================

  * fix: cache can be disable (#2)

1.0.0 / 2016-02-20
==================

init version
