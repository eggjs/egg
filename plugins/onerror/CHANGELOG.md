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

## [3.0.0](https://github.com/eggjs/onerror/compare/v2.4.0...v3.0.0) (2025-02-02)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257

### Features

* support cjs and esm both by tshy ([#40](https://github.com/eggjs/onerror/issues/40)) ([c51c391](https://github.com/eggjs/onerror/commit/c51c391f3772dc920dd258a345123a455c03d0fc))

## [2.4.0](https://github.com/eggjs/egg-onerror/compare/v2.3.1...v2.4.0) (2024-10-13)


### Features

* ignore secure config ([#34](https://github.com/eggjs/egg-onerror/issues/34)) ([bf61d5e](https://github.com/eggjs/egg-onerror/commit/bf61d5ee0edf128cc6ab082839c5bacbf8fa496f))

## [2.3.1](https://github.com/eggjs/egg-onerror/compare/v2.3.0...v2.3.1) (2024-10-13)


### Bug Fixes

* fixed show all frame ([#32](https://github.com/eggjs/egg-onerror/issues/32)) ([779fdfd](https://github.com/eggjs/egg-onerror/commit/779fdfdca6cb0dc04e79a4426d586c7d0b97e3f6))

## [2.3.0](https://github.com/eggjs/egg-onerror/compare/v2.2.0...v2.3.0) (2024-10-13)


### Features

* use cookie@0.7.2 ([#39](https://github.com/eggjs/egg-onerror/issues/39)) ([fc57345](https://github.com/eggjs/egg-onerror/commit/fc57345661ab6771d74ca5678438bfe7983929a1))

2.2.0 / 2022-12-11
==================

**features**
  * [[`a31167c`](http://github.com/eggjs/egg-onerror/commit/a31167ccf6ecc35d51b129299271588b32a51350)] - 👌 IMPROVE: Use currentContext first (#36) (fengmk2 <<fengmk2@gmail.com>>)

2.1.1 / 2022-08-18
==================

**fixes**
  * [[`00d2aa2`](http://github.com/eggjs/egg-onerror/commit/00d2aa2a073048dec9b9fc0fd0d868ecc0446830)] - fix: check file exists (#35) (吖猩 <<whxaxes@qq.com>>)

**others**
  * [[`54e12ba`](http://github.com/eggjs/egg-onerror/commit/54e12baa2eab9b47a2acd6ba0e6f6a0e55c92fc0)] - Create codeql-analysis.yml (fengmk2 <<fengmk2@gmail.com>>)
  * [[`55d27e6`](http://github.com/eggjs/egg-onerror/commit/55d27e60a9f1094e1a4555e82b47cab4799a57f8)] - chore: update travis (#31) (TZ | 天猪 <<atian25@qq.com>>)

2.1.0 / 2018-06-12
==================

**features**
  * [[`63cca2f`](http://github.com/eggjs/egg-onerror/commit/63cca2f3fb087583459e26e38c3874285b14aefd)] - feat: add replace template config (#28) (Harry Chen <<czy88840616@gmail.com>>)

2.0.0 / 2017-11-13
==================

**others**
  * [[`6861f8f`](http://github.com/eggjs/egg-onerror/commit/6861f8fb5df4a210afca2c7454dcca4ec1ccbae4)] - refactor: use async function and support egg@2 (#27) (Yiyu He <<dead_horse@qq.com>>)

1.6.0 / 2017-11-13
==================

**features**
  * [[`4a1b770`](http://github.com/eggjs/egg-onerror/commit/4a1b7707b28d3cc1e8bd69f4cca606305c507248)] - feat: support customize error handler (#26) (Yiyu He <<dead_horse@qq.com>>)
  * [[`37c06ce`](http://github.com/eggjs/egg-onerror/commit/37c06ce45fb671a3087f4e74aafcef1ac122360d)] - feat: support jsonp (#25) (Yiyu He <<dead_horse@qq.com>>)

**others**
  * [[`a0d4df2`](http://github.com/eggjs/egg-onerror/commit/a0d4df2830bf58903dd27e277f963e3d52d32587)] - chore: fix README & update deps & fix test (#23) (TZ | 天猪 <<atian25@qq.com>>)
  * [[`e49252e`](http://github.com/eggjs/egg-onerror/commit/e49252e3a648abbefc562635e163c4b9dd28e57d)] - docs: fix typo (#22) (TZ | 天猪 <<atian25@qq.com>>)

1.5.0 / 2017-07-20
==================

  * feat: errorPageUrl support function (#21)

1.4.6 / 2017-06-20
==================

  * fix: only output simple error html on unittest (#19)

1.4.5 / 2017-06-20
==================

  * fix: should show 4xx status error html (#18)

1.4.4 / 2017-06-12
==================

  * fix: make error style more good (#17)
  * fix: add error-title's line-height (#16)

1.4.3 / 2017-06-04
==================

  * docs: fix License url (#15)

1.4.2 / 2017-06-01
==================

  * fix: remove error detail on JSON response (#14)

1.4.1 / 2017-06-01
==================

  * fix: add missing files on package.json (#13)

1.4.0 / 2017-05-31
==================

  * feat: better error page on development (#12)

1.3.0 / 2017-01-22
==================

  * feat: use ctx.acceptJSON (#11)

1.2.2 / 2017-01-13
==================

  * fix: should keep support `*.json` ext to detect response type (#10)

1.2.1 / 2017-01-13
==================

  * fix: add agent.js to package.files (#9)

1.2.0 / 2017-01-13
==================

  * feat: support options.accepts
  * refactor: remove accpetJSON

1.1.0 / 2016-11-09
==================

  * feat: should watch error event on agent (#7)

1.0.0 / 2016-10-21
==================

  * deps: upgrade koa-onerror (#6)
  * fix: make sure ctx always exists (#3)

0.0.3 / 2016-07-16
==================

  * fix: fix this is undefined on arrow function (#1)

0.0.2 / 2016-07-13
==================
  * init code
