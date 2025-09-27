# Changelog

## [4.0.1](https://github.com/eggjs/security/compare/v4.0.0...v4.0.1) (2025-02-02)


### Bug Fixes

* ignore duplicate identifier ([#104](https://github.com/eggjs/security/issues/104)) ([2d1a44b](https://github.com/eggjs/security/commit/2d1a44b35c21fe5a3df3a82a2b11e97f7df95f41))

## [4.0.0](https://github.com/eggjs/security/compare/v3.7.0...v4.0.0) (2025-01-17)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->
## Summary by CodeRabbit

Based on the comprehensive changes, here are the updated release notes:

- **New Features**
	- Migrated security plugin to TypeScript.
	- Enhanced type safety for security configurations.
	- Improved middleware and helper utilities.
- Introduced new middleware for handling `Strict-Transport-Security`,
`X-Frame-Options`, and `X-XSS-Protection` headers.
	- Added support for new security configurations and helper functions.

- **Breaking Changes**
	- Renamed package from `egg-security` to `@eggjs/security`.
	- Dropped support for Node.js versions below 18.19.0.
	- Restructured module exports and configurations.
	- Removed several deprecated middleware and utility functions.

- **Security Improvements**
	- Updated CSRF, XSS, and SSRF protection mechanisms.
	- Enhanced middleware for handling security headers.
	- Refined configuration options for various security features.

- **Performance**
	- Modernized codebase with ES module syntax.
	- Improved type definitions and module structure.
- Enhanced test suite with TypeScript support and better resource
management.
<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#101](https://github.com/eggjs/security/issues/101)) ([a11661f](https://github.com/eggjs/security/commit/a11661f3459db275f00b0f8bd0637a5e46b92022))

## [3.7.0](https://github.com/eggjs/egg-security/compare/v3.6.0...v3.7.0) (2025-01-13)


### Features

* csrf support check origin header with referer type ([#69](https://github.com/eggjs/egg-security/issues/69)) ([2c950d3](https://github.com/eggjs/egg-security/commit/2c950d3d2a464c5f4d3af79bc7ea32c7595018c6))

## [3.6.0](https://github.com/eggjs/egg-security/compare/v3.5.0...v3.6.0) (2024-07-08)


### Features

* add hostnameExceptionList for ssrf ([#100](https://github.com/eggjs/egg-security/issues/100)) ([92a34f3](https://github.com/eggjs/egg-security/commit/92a34f3246ded7ebb5c628d1de2a37a121ce919d))

## [3.5.0](https://github.com/eggjs/egg-security/compare/v3.4.0...v3.5.0) (2024-07-03)


### Features

* add rotateWhenInvalid option for CSRF token ([#98](https://github.com/eggjs/egg-security/issues/98)) ([ae37c8f](https://github.com/eggjs/egg-security/commit/ae37c8f8e55c050ec6747a196f77aec197958e02))

## [3.4.0](https://github.com/eggjs/egg-security/compare/v3.3.1...v3.4.0) (2024-07-01)


### Features

* support SSRF check on useHttpClientNext = true ([#96](https://github.com/eggjs/egg-security/issues/96)) ([1d6bfff](https://github.com/eggjs/egg-security/commit/1d6bfffba257aae9bb72906cbe958550d00adfb7))

## [3.3.1](https://github.com/eggjs/egg-security/compare/v3.3.0...v3.3.1) (2024-06-12)


### Bug Fixes

* use @eggjs/ip instead of ip ([#95](https://github.com/eggjs/egg-security/issues/95)) ([5e3ee95](https://github.com/eggjs/egg-security/commit/5e3ee95bd3d4fb133800669284b0d9d15ac4f0f8))

## [3.3.0](https://github.com/eggjs/egg-security/compare/v3.2.0...v3.3.0) (2024-05-29)


### Features

* use ip@v2 ([#93](https://github.com/eggjs/egg-security/issues/93)) ([ffb761d](https://github.com/eggjs/egg-security/commit/ffb761dd6e364fd7eb1d034a6fb1f3a060855f80))

## [3.2.0](https://github.com/eggjs/egg-security/compare/v3.1.0...v3.2.0) (2024-01-04)


### Features

* CSRF cookies allow the use of signatures ([#88](https://github.com/eggjs/egg-security/issues/88)) ([da1b532](https://github.com/eggjs/egg-security/commit/da1b53222448bb646ad6fb1d726a6168a43eafcf))

## [3.1.0](https://github.com/eggjs/egg-security/compare/v3.0.0...v3.1.0) (2023-08-09)


### Features

* context 中的 `isSafeDomain()` 函数增加自定义白名单参数 ([#86](https://github.com/eggjs/egg-security/issues/86)) ([a178552](https://github.com/eggjs/egg-security/commit/a1785525fc1acb5d0e329dd1446c3bc8b4f6e72f))

## [3.0.0](https://github.com/eggjs/egg-security/compare/v2.11.0...v3.0.0) (2023-05-10)


### ⚠ BREAKING CHANGES

* drop Node.js < 14 support

### Features

* upgrade deps to latest versions ([#82](https://github.com/eggjs/egg-security/issues/82)) ([c3ca817](https://github.com/eggjs/egg-security/commit/c3ca817eca2fa6a034f9402f6ad5c4a8e9194178))

2.11.0 / 2022-07-20
==================

**features**
  * [[`b97b2b2`](http://github.com/eggjs/egg-security/commit/b97b2b292d249eee69822baa8fe62da9161597d2)] - feat: csrf cookie support cookieOptions (#80) (大木匠贰 <<damujiangr@aliyun.com>>)

2.10.1 / 2022-04-10
==================

**others**
  * [[`4bb4741`](http://github.com/eggjs/egg-security/commit/4bb47419f0f9a8703401e0ee1f0b7d496519c587)] - 🐛 FIX: Add warning message on `false` value config (#79) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`184d109`](http://github.com/eggjs/egg-security/commit/184d109dc0e83f2568bbfcf5837f4a8aadb9eff8)] - 📖 DOC: Add CONNECT method on CSRF default config (fengmk2 <<fengmk2@gmail.com>>)

2.10.0 / 2022-04-05
==================

**features**
  * [[`2d1b28f`](http://github.com/eggjs/egg-security/commit/2d1b28f94cee80f931d25d9b0905b2b2b10e195f)] - feat: make csrf supported method configurable (#74) (Anemone95 <<x565178035@126.com>>)

**others**
  * [[`59558fa`](http://github.com/eggjs/egg-security/commit/59558faf0a5e0fca29f2703a65be91364f708867)] - 🐛 FIX: Should detect all rules before ignore on CSRF (#78) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`61a5543`](http://github.com/eggjs/egg-security/commit/61a5543391d6a29050ddf12d39d3997811143852)] - deps: use nanoid@3 (#77) (fengmk2 <<fengmk2@gmail.com>>)

2.9.1 / 2022-03-29
==================

**fixes**
  * [[`0b3fb1e`](http://github.com/eggjs/egg-security/commit/0b3fb1ebd9107c555f15cc97722a5a390a98e1e5)] - fix: should match script end tags like </script > (#76) (fengmk2 <<fengmk2@gmail.com>>)

**others**
  * [[`1cde817`](http://github.com/eggjs/egg-security/commit/1cde8178e0058136f62203752622efe02467fa3b)] - 🤖 TEST: Run ci on GitHub Action (#75) (fengmk2 <<fengmk2@gmail.com>>)
  * [[`23fef7d`](http://github.com/eggjs/egg-security/commit/23fef7d3a4150afa4e001be186bc191c08878a75)] - Delete SECURITY.md (fengmk2 <<fengmk2@gmail.com>>)
  * [[`f6aeb97`](http://github.com/eggjs/egg-security/commit/f6aeb977203db5686fe279d0e8b3ec1a64535e07)] - docs: Add Security Policy (fengmk2 <<fengmk2@gmail.com>>)

2.9.0 / 2021-04-21
==================

**others**
  * [[`9d80e90`](http://github.com/eggjs/egg-security/commit/9d80e90d273a3ac24231d200ac248f44d1fbd822)] - add ssrf.ipExceptionList (#70) (shadyzoz <<shadyzoz@icloud.com>>)
  * [[`79c38e0`](http://github.com/eggjs/egg-security/commit/79c38e001b431466361c711680d975eb0cfcb301)] - docs: fix typos (#68) (viko16 <<viko16@users.noreply.github.com>>)

2.8.0 / 2020-04-16
==================

**features**
  * [[`a9aff4f`](http://github.com/eggjs/egg-security/commit/a9aff4ff75b343fc8b12248d304d3dba82f71bc1)] - feat: csrf support any, fix isSafeDomain bug (#67) (Yiyu He <<dead_horse@qq.com>>)
  * [[`beeded1`](http://github.com/eggjs/egg-security/commit/beeded1901d77af65a9580e2e80027d71997fc52)] - feat: config.cookieName support array (#66) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`5bd4719`](http://github.com/eggjs/egg-security/commit/5bd471995ffdc93de146ae94e0644da15acb04a7)] - test: content-length should not be empty string (pusongyang <<ukyo.pu@gmail.com>>)
  * [[`def5bfa`](http://github.com/eggjs/egg-security/commit/def5bfa8a2139ca3e2f221ded0dc66d1b405d418)] - docs: typos & optimization (#63) (吖猩 <<whx89768@alibaba-inc.com>>)

2.7.1 / 2019-11-14
==================

**fixes**
  * [[`ef0e439`](http://github.com/eggjs/egg-security/commit/ef0e439ee743f3d8069f81eb8bf614f5564de932)] - fix(security): use new URL instead of url.parse (#62) (Yiyu He <<dead_horse@qq.com>>)

2.7.0 / 2019-10-25
==================

**features**
  * [[`f03aeed`](http://github.com/eggjs/egg-security/commit/f03aeed246ca7dffc589d98b0dd4966700c4d90d)] - feat: add escapeShellArg and escapeShellCmd (#60) (p0sec <<7829373@qq.com>>)

**others**
  * [[`22b155f`](http://github.com/eggjs/egg-security/commit/22b155f63db42f880c4ac1ae1035ca1ad6ac6586)] - style: fix document (#59) (刘放 <<brizer@users.noreply.github.com>>)

2.6.1 / 2019-08-09
==================

**fixes**
  * [[`b72a1eb`](http://github.com/eggjs/egg-security/commit/b72a1eb5b9cfbfc9a8821d3b560f2402f12b709e)] - fix: csrf false check (#58) (吖猩 <<whxaxes@gmail.com>>)

2.6.0 / 2019-08-09
==================

**features**
  * [[`a1b8e00`](http://github.com/eggjs/egg-security/commit/a1b8e006feef717d8cc9767d001a48efa56fca79)] - feat: csrf support referer type (#56) (吖猩 <<whxaxes@gmail.com>>)

**others**
  * [[`1890644`](http://github.com/eggjs/egg-security/commit/189064406befc7e284f67eb22d95aa1d13079ee9)] - chore: show contributors on README (#55) (fengmk2 <<fengmk2@gmail.com>>)

2.5.0 / 2019-03-08
==================

**others**
  * [[`4fcadc4`](http://github.com/eggjs/egg-security/commit/4fcadc4d34f915333bd02264f49ccb28400bfb1f)] - deps: update packs and ignore lock file (#54) (Maledong <<maledong_github@outlook.com>>)
  * [[`5772242`](http://github.com/eggjs/egg-security/commit/577224217e079fd6fe38b7a86401d99ddf03a22c)] - test: use expectLog to assert log (#53) (fengmk2 <<fengmk2@gmail.com>>)

2.4.3 / 2019-02-19
==================

**fixes**
  * [[`b80202f`](http://github.com/eggjs/egg-security/commit/b80202ffde474e3ade09f6dc4b29a9bb925e4241)] - fix: make sure domain is string before use it (#52) (fengmk2 <<fengmk2@gmail.com>>)

2.4.2 / 2019-01-04
==================

**fixes**
  * [[`ad21465`](http://github.com/eggjs/egg-security/commit/ad21465b3a40f6c9e38fa58ba85b8e86eda47ca3)] - fix: fix referrer-policy enum check (#50) (Century Guo <<648772021@qq.com>>)

2.4.1 / 2018-11-15
==================

  * fix: shtml check domainWhiteList hostname get null (#49)

2.4.0 / 2018-08-24
==================

**others**
  * [[`57bc4d9`](http://github.com/eggjs/egg-security/commit/57bc4d9bb1334e699f87306820a0e6bb42d6aed8)] - bug (methodnoallow): Fix for '`OPTIONS` not allowed' (#40) (Maledong <<maledong_github@outlook.com>>)
  * [[`8ead61e`](http://github.com/eggjs/egg-security/commit/8ead61eb38370b6dade6785bc945fbb32caedd63)] - chore: improve npm scripts (#48) (Maledong <<maledong_github@outlook.com>>)
  * [[`817d114`](http://github.com/eggjs/egg-security/commit/817d11462e43aee9986f3cd4b13acf9a1e70f7b9)] - doc (README.zh-CN.md, README.md): Fix typos and add missing trans (#45) (Maledong <<maledong_github@outlook.com>>)

2.3.1 / 2018-08-16
==================

**fixes**
  * [[`8997866`](http://github.com/eggjs/egg-security/commit/8997866d5ff9d3aa445752be1d3b93ed94dc113b)] - fix: preprocess config in app.js (#46) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`9baf72e`](http://github.com/eggjs/egg-security/commit/9baf72ece4431b55eb85dd0daf4b8ace6ddb314e)] - chore (shtml,cliFilter,sjs,README): Modifications of files (#47) (Maledong <<maledong_github@outlook.com>>)

2.3.0 / 2018-08-14
==================

**fixes**
  * [[`835eff5`](http://github.com/eggjs/egg-security/commit/835eff54fb2fe159ce86cc810f714259ba988bca)] - Fix: Make `domain` and `whiteList`, `protocalWhiteList` case insensitive (Maledong <<maledong_github@outlook.com>>)
  * [[`81f757a`](http://github.com/eggjs/egg-security/commit/81f757a291f1a8084c6b5e106de11f16a6ef1e0a)] - fix: use faster non-secure ID generator (#43) (Andrey Sitnik <<andrey@sitnik.ru>>)

**others**
  * [[`72e7ceb`](http://github.com/eggjs/egg-security/commit/72e7ceb04e2d4ff2d65ebb8926aa938093da289c)] - utils (isSafeDomain): Use `matcher` to check for a wild character of a (#42) (Maledong <<maledong_github@outlook.com>>)
  * [[`a7035cf`](http://github.com/eggjs/egg-security/commit/a7035cfa7bea9e53be4227964836a1de79f7b75c)] - doc: Translate from Chinese into English for several files for their comments (#41) (Maledong <<maledong_github@outlook.com>>)

2.2.3 / 2018-07-11
==================

**fixes**
  * [[`b5e1741`](http://github.com/eggjs/egg-security/commit/b5e17410045cb36b68d2e4f897c60ea6841c0f42)] - fix: disable nosniff on redirect status (#38) (fengmk2 <<fengmk2@gmail.com>>)

2.2.2 / 2018-04-12
==================

**fixes**
  * [[`dbc9a44`](http://github.com/eggjs/egg-security/commit/dbc9a445816d69ec59320b8f655d6e965a16edfb)] - fix: format illegal url (#36) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`9676127`](http://github.com/eggjs/egg-security/commit/96761278b0f167c315af9d00842456aaa3a420fc)] - docs: update warning infomation for ignoreJSON (#35) (Haoliang Gao <<sakura9515@gmail.com>>)

2.2.1 / 2018-03-28
==================

**others**
  * [[`e6e5e65`](http://github.com/eggjs/egg-security/commit/e6e5e65034d314646bd5cf98303cce97fece86dd)] - docs: fix SSRF link (#34) (Haoliang Gao <<sakura9515@gmail.com>>)

2.2.0 / 2018-03-27
==================

**features**
  * [[`eba4555`](http://github.com/eggjs/egg-security/commit/eba45551f6170761792389632bdaae2afcae57d0)] - feat: support safeCurl for SSRF protection (#32) (Yiyu He <<dead_horse@qq.com>>)

**fixes**
  * [[`abc33d1`](http://github.com/eggjs/egg-security/commit/abc33d176f2ca832eddd42ae5967c25e0f91c97a)] - fix: deprecate ignoreJSON (#30) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`4f045a0`](http://github.com/eggjs/egg-security/commit/4f045a05da0db6c03f3578ee13aff3721f3ceec2)] - deps: add missing dependencies ip (dead-horse <<dead_horse@qq.com>>)

2.1.0 / 2018-03-14
==================

**features**
  * [[`97f372c`](http://github.com/eggjs/egg-security/commit/97f372c275cb3db99d4bdd86b19583464cdce4e3)] - feat: add RefererPolicy support (#27) (Adams <<jtyjty99999@126.com>>)

**others**
  * [[`76bd83f`](http://github.com/eggjs/egg-security/commit/76bd83fbe96e7e81a3a0a61d182c5d7e480c7856)] - chore:bump to 2.0.1 (jtyjty99999 <<jtyjty99999@126.com>>),

2.0.1 / 2018-03-14
==================

  * fix: absolute path detect should ignore evil path (#28)

2.0.0 / 2017-11-10
==================

**others**
  * [[`0ec7d2f`](http://github.com/eggjs/egg-security/commit/0ec7d2f5af03c31623b9286125d74652ba596b8b)] - refactor: use async function and support egg@2 (#25) (Yiyu He <<dead_horse@qq.com>>)

1.12.1 / 2017-08-03
==================

**others**
  * [[`870a7e2`](http://github.com/eggjs/egg-security/commit/870a7e2d26ad622a035e70565a9ca6830465326f)] - fix(csrf): ignore json request even body not exist (#23) (Yiyu He <<dead-horse@users.noreply.github.com>>)

1.12.0 / 2017-07-19
==================

  * feat: make session plugin optional (#22)

1.11.0 / 2017-06-19
==================

  * feat: add global path blocking to avoid directory traversal attack (#19)

1.10.2 / 2017-06-14
==================

  * fix: should not assert csrf when path match ignore (#20)

1.10.1 / 2017-06-04
===================

  * docs: fix License url (#18)

1.10.0 / 2017-05-09
==================

  * feat: config.security.csrf.cookieDomain can be function (#17)

1.9.0 / 2017-03-28
==================

  * feat: use egg-path-matching to support fn (#15)

1.8.0 / 2017-03-07
==================

  * feat:support muiltiple query/body key to valid csrf token (#14)

1.7.0 / 2017-03-07
==================

  * feat: add ctx.rotateCsrfToken (#13)

1.6.0 / 2017-02-20
==================

  * refactor: add csrf faq url to error msg in local env (#12)

1.5.0 / 2017-02-17
==================

  * feat: surl support protocol whitelist (#11)

1.4.0 / 2017-01-22
==================

  * refactor: rewrite csrf (#10)

1.3.0 / 2016-12-28
==================

  * feat: support hash link in shtml (#7)
  * test: fix test (#8)

1.2.1 / 2016-09-01
==================

  * fix: make sure every middleware has name (#6)

1.2.0 / 2016-08-31
==================

  * feat: disable hsts for default (#5)

1.1.0 / 2016-08-31
==================

  * refactor: remove ctoken, csrf check all post/put/.. requests (#4)

1.0.3 / 2016-08-30
==================

  * fix: lower case header will get better performance (#3)

1.0.2 / 2016-08-29
==================

  * refactor: use setRawHeader

1.0.1 / 2016-08-21
==================

  * First version
