# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs.

---

## 4.0.0+

### ⚠ BREAKING CHANGES

* drop Node.js < 20.19.0 support


## [3.1.0](https://github.com/eggjs/egg-cookies/compare/v3.0.1...v3.1.0) (2024-12-26)


### Features

* support ignoring secure error ([#58](https://github.com/eggjs/egg-cookies/issues/58)) ([38f98d1](https://github.com/eggjs/egg-cookies/commit/38f98d12922571f6195121500002bd8d2da4be50))

## [3.0.1](https://github.com/eggjs/egg-cookies/compare/v3.0.0...v3.0.1) (2024-07-06)


### Bug Fixes

* partitioned and autoChips should support different paths ([#55](https://github.com/eggjs/egg-cookies/issues/55)) ([50b1313](https://github.com/eggjs/egg-cookies/commit/50b1313172d1180569c556f3ab05448ab3bb3100))

## [3.0.0](https://github.com/eggjs/egg-cookies/compare/v2.10.0...v3.0.0) (2024-06-23)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced comprehensive support for TypeScript in project
configurations.
- Added new cookie management functionalities, including setting,
encryption, and validation.
  - Added support for `Keygrip` class for cryptographic operations.

- **Documentation**
- Updated package name in README files from `egg-cookies` to
`@eggjs/cookies`.
- Adjusted code snippets and URLs in documentation to reflect the new
package name.

- **Tests**
- Enhanced test suite with additional test cases for cookie encryption,
caching, and error handling.
  - Added new test files for `Keygrip` and cookie functionalities.
  
- **Chores**
  - Updated `.gitignore` to include new patterns for ignoring files.
- Improved CI workflow with updated Node.js versions and Codecov token
integration.
- Updated dependencies and scripts in `package.json` to align with the
new package structure and TypeScript support.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#54](https://github.com/eggjs/egg-cookies/issues/54)) ([12db545](https://github.com/eggjs/egg-cookies/commit/12db545f887940560f49f792035dbf63d6ceb497))

## [2.10.0](https://github.com/eggjs/egg-cookies/compare/v2.9.4...v2.10.0) (2024-02-19)


### Features

* support priority ([#52](https://github.com/eggjs/egg-cookies/issues/52)) ([f9f1214](https://github.com/eggjs/egg-cookies/commit/f9f12149637d37df8e6cecd9cb50d8c27421c7d0))

## [2.9.4](https://github.com/eggjs/egg-cookies/compare/v2.9.3...v2.9.4) (2024-01-05)


### Bug Fixes

* disable autoChips if set cookie with partitioned ([#51](https://github.com/eggjs/egg-cookies/issues/51)) ([148c61c](https://github.com/eggjs/egg-cookies/commit/148c61c3be41d90c44c3db8bfe870cae31d586ad))

## [2.9.3](https://github.com/eggjs/egg-cookies/compare/v2.9.2...v2.9.3) (2024-01-04)


### Reverts

* Revert "fix: only enable autoChips on cross-site request (#49)" (#50) ([b0452dd](https://github.com/eggjs/egg-cookies/commit/b0452dd0011a7ed5cc8fd489a2fbb6fa5c076ac2)), closes [#49](https://github.com/eggjs/egg-cookies/issues/49) [#50](https://github.com/eggjs/egg-cookies/issues/50)

## [2.9.2](https://github.com/eggjs/egg-cookies/compare/v2.9.1...v2.9.2) (2024-01-04)


### Bug Fixes

* only enable autoChips on cross-site request ([#49](https://github.com/eggjs/egg-cookies/issues/49)) ([665a335](https://github.com/eggjs/egg-cookies/commit/665a33574f2c27bda5d59eb8f5e5b70b2ee9ad97))

## [2.9.1](https://github.com/eggjs/egg-cookies/compare/v2.9.0...v2.9.1) (2024-01-03)


### Bug Fixes

* use _CHIPS- prefix instead of __Host- ([#48](https://github.com/eggjs/egg-cookies/issues/48)) ([6b5e5be](https://github.com/eggjs/egg-cookies/commit/6b5e5be4f09b692b2867b390a300de8a1e142cbb))

## [2.9.0](https://github.com/eggjs/egg-cookies/compare/v2.8.3...v2.9.0) (2024-01-03)


### Features

* add autoChips to adaptation CHIPS mode ([#47](https://github.com/eggjs/egg-cookies/issues/47)) ([38d6408](https://github.com/eggjs/egg-cookies/commit/38d64084b78ad15f816b4e8c46efa3c591c04558))

## [2.8.3](https://github.com/eggjs/egg-cookies/compare/v2.8.2...v2.8.3) (2023-12-28)


### Bug Fixes

* should not set sameSite and CHIPS when secure = false ([#45](https://github.com/eggjs/egg-cookies/issues/45)) ([33395bf](https://github.com/eggjs/egg-cookies/commit/33395bfda657fd31b0443dbf0d9cdb3bea697b1b))

## [2.8.2](https://github.com/eggjs/egg-cookies/compare/v2.8.1...v2.8.2) (2023-12-28)


### Bug Fixes

* support remove unpartitioned same name cookie first ([#44](https://github.com/eggjs/egg-cookies/issues/44)) ([b81f041](https://github.com/eggjs/egg-cookies/commit/b81f04181e461f2688296e4bd65cad8ac3a8298d))

## [2.8.1](https://github.com/eggjs/egg-cookies/compare/v2.8.0...v2.8.1) (2023-12-27)


### Bug Fixes

* add partitioned in index.d.ts ([#43](https://github.com/eggjs/egg-cookies/issues/43)) ([7e01eba](https://github.com/eggjs/egg-cookies/commit/7e01eba444f24bfea810a9b474ff54d182cb80c4))

## [2.8.0](https://github.com/eggjs/egg-cookies/compare/v2.7.1...v2.8.0) (2023-12-26)


### Features

* support set partitioned property on Chrome >= 114 ([#42](https://github.com/eggjs/egg-cookies/issues/42)) ([74325b8](https://github.com/eggjs/egg-cookies/commit/74325b89b150ce880dc742f63016f0494fff273a))

## [2.7.1](https://github.com/eggjs/egg-cookies/compare/v2.7.0...v2.7.1) (2023-08-04)


### Bug Fixes

* domain can be empty string ([#39](https://github.com/eggjs/egg-cookies/issues/39)) ([0b285e1](https://github.com/eggjs/egg-cookies/commit/0b285e1dc8203dde8670c2459e5f8bbde93a1ef5)), closes [/github.com/eggjs/egg-cookies/pull/38#discussion_r1284672929](https://github.com/eggjs//github.com/eggjs/egg-cookies/pull/38/issues/discussion_r1284672929)

## [2.7.0](https://github.com/eggjs/egg-cookies/compare/v2.6.1...v2.7.0) (2023-08-04)


### Features

* support function to set domain ([#38](https://github.com/eggjs/egg-cookies/issues/38)) ([c73b415](https://github.com/eggjs/egg-cookies/commit/c73b415467b9e13363a8a5dd0b5e3c7a72f4adb4))

---


2.6.1 / 2022-06-20
==================

**others**
  * [[`ebe330e`](http://github.com/eggjs/egg-cookies/commit/ebe330ea461be73e65dd1e2bbd4c9e3eba5e8d89)] - 🐛 FIX: Avoid ReDoS (#36) (fengmk2 <<fengmk2@gmail.com>>)

2.6.0 / 2022-06-20
==================

**features**
  * [[`7ed0ded`](http://github.com/eggjs/egg-cookies/commit/7ed0ded5492ebd7a2001407c9a9af638dcfd5307)] - feat: deprecated crypto api (#35) (吖猩 <<whxaxes@gmail.com>>)

2.5.0 / 2022-05-02
==================

**features**
  * [[`7377d3b`](http://github.com/eggjs/egg-cookies/commit/7377d3b0a9ee6d137bc07f4742aa499e9ed47d8d)] - feat: add CookieError (#31) (图南 <<xzj15859722542@hotmail.com>>)

**others**
  * [[`d27be06`](http://github.com/eggjs/egg-cookies/commit/d27be0659889d12af245149b633e7274790a01c4)] - 🤖 TEST: Run on node 18 (#34) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`9e770ee`](http://github.com/eggjs/egg-cookies/commit/9e770ee61a9e6f1ce9b19e8e028f9847c386f3a0)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)
  * [[`eff0195`](http://github.com/eggjs/egg-cookies/commit/eff01956de00a95fab8a3367ade61b5b8a55b76d)] - chore: update build status badge (#33) (XiaoRui <<xiangwu619@gmail.com>>)

2.4.3 / 2022-04-29
==================

**fixes**
  * [[`c8c42d3`](http://github.com/eggjs/egg-cookies/commit/c8c42d30b41f7c3f6c2e9231364e4acf47cea221)] - fix: should only update .sig once (#32) (TZ | 天猪 <<atian25@qq.com>>)

2.4.2 / 2020-06-28
==================

**fixes**
  * [[`a72fd0c`](http://github.com/eggjs/egg-cookies/commit/a72fd0cd9518ad8cfb3ad7c8ace1eb14097cea7e)] - fix: ignore maxAge = 0 (#29) (Yiyu He <<dead_horse@qq.com>>)

2.4.1 / 2020-06-28
==================

**fixes**
  * [[`7a87cc1`](http://github.com/eggjs/egg-cookies/commit/7a87cc16108bc5b542c0fbe91c4e4a6e986573de)] - fix: ignore invalid maxage (#28) (Yiyu He <<dead_horse@qq.com>>)

2.4.0 / 2020-06-22
==================

**features**
  * [[`4417dda`](http://github.com/eggjs/egg-cookies/commit/4417ddacecde2dff3792ca10e0bf05fc94a991ee)] - feat: Send `max-age` header as well as `expires` if it is set(#27) (Junyan <<yancoding@gmail.com>>)

2.3.4 / 2020-06-12
==================

**fixes**
  * [[`a146191`](http://github.com/eggjs/egg-cookies/commit/a14619139f585da290d693e6dfcf3e29304bc337)] - fix(typings): value of set method should support null type (#21) (Jedmeng <<roy.urey@gmail.com>>)

2.3.3 / 2020-03-27
==================

**fixes**
  * [[`b3f86c0`](http://github.com/eggjs/egg-cookies/commit/b3f86c01b19b790f8c06aca143a094ed4fa575bd)] - fix(SameSite): don't send SameSite=None on non-secure context (#26) (Eric Zhang <<hixyeric@gmail.com>>)

2.3.2 / 2020-02-19
==================

**fixes**
  * [[`c6e1e74`](http://github.com/eggjs/egg-cookies/commit/c6e1e74e77c53f68e79f0ebd799c755db470badd)] - fix: don't send SameSite=None on Chromium/Chrome < 80.x (#25) (fengmk2 <<fengmk2@gmail.com>>)

2.3.1 / 2019-12-17
==================

**fixes**
  * [[`d4f443a`](http://github.com/eggjs/egg-cookies/commit/d4f443a5bf3bfd0ba7bc726b1e8b74a35ba265d6)] - fix: don't set samesite=none on incompatible clients (#23) (fengmk2 <<fengmk2@gmail.com>>)

2.3.0 / 2019-12-06
==================

**features**
  * [[`d5e3d21`](http://github.com/eggjs/egg-cookies/commit/d5e3d215b1c51f70d932dba391d7da228a302312)] - feat: support SameSite=None (#18) (ziyunfei <<446240525@qq.com>>)
  * [[`4dd74d2`](http://github.com/eggjs/egg-cookies/commit/4dd74d2078b5aea11f11b3b40605b702ca9ccd60)] - feat: allow set default cookie options on top level (#22) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`57a005f`](http://github.com/eggjs/egg-cookies/commit/57a005fd501dad5fdadc25ea94db5474fbd6ca8c)] - chore: add license decoration (#20) (刘放 <<brizer@users.noreply.github.com>>)

2.2.7 / 2019-04-28
==================

**fixes**
  * [[`64e93e9`](http://github.com/eggjs/egg-cookies/commit/64e93e919558ee96e29de5c49d7132595e96b9b5)] - fix: empty cookie value should ignore maxAge (#17) (fengmk2 <<fengmk2@gmail.com>>)

2.2.6 / 2018-09-07
==================

  * fix: should still support 4, 6 (#16)

2.2.5 / 2018-09-07
==================

  * chore(typings): Remove 'ctx' in EggCookie's declaration and add a missing unit test (#15)

2.2.4 / 2018-09-06
==================

  * fix: public files && deps (#14)

2.2.3 / 2018-09-06
==================

  * chore: adjust some dep && config (#13)
  * test: Add unit tests for ts (#12)
  * chore(typings):  Extract 'EggCookies' for TypeScript intellisense (#11)

2.2.2 / 2017-12-14
==================

**fixes**
  * [[`d199238`](http://github.com/eggjs/egg-cookies/commit/d1992389558c24f26fbd6b617054c535e2c51319)] - fix: don't modify options (#9) (Roc Gao <<ggjqzjgp103@qq.com>>)

**others**
  * [[`1037873`](http://github.com/eggjs/egg-cookies/commit/103787342f9b45bcc794ec2adeda5e809af3328b)] - chore: jsdoc typo (#6) (TZ | 天猪 <<atian25@qq.com>>)

2.2.1 / 2017-02-22
==================

  * fix: emit on ctx.app (#5)

2.2.0 / 2017-02-21
==================

  * feat: check cookie value's length (#4)
  * feat: support cookie.sameSite (#3)

2.1.0 / 2016-11-22
==================

  * feat: cache keygrip (#2)

2.0.0 / 2016-11-22
==================

  * refactor: rewrite keygrip and cookies for egg/koa (#1)
  * chore: add zh-CN readme

1.0.0 / 2016-07-15
==================

  * init version
