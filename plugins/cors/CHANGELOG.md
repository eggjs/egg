# Changelog

## [3.0.1](https://github.com/eggjs/egg-cors/compare/v3.0.0...v3.0.1) (2024-04-25)


### Bug Fixes

* let framework known app has custom origin handler or not ([#28](https://github.com/eggjs/egg-cors/issues/28)) ([#29](https://github.com/eggjs/egg-cors/issues/29)) ([b446a98](https://github.com/eggjs/egg-cors/commit/b446a987ee66c38ac07458a5d69992f5a43071a2))

## [3.0.0](https://github.com/eggjs/egg-cors/compare/v2.2.3...v3.0.0) (2023-12-11)


### ⚠ BREAKING CHANGES

* drop Node.js < 14

### Features

* use @koa/cors@5.0.0 ([#27](https://github.com/eggjs/egg-cors/issues/27)) ([599e918](https://github.com/eggjs/egg-cors/commit/599e918f18f65c47e41ebf30d659ae439e10207d))

2.2.3 / 2019-11-14
==================

**fixes**
  * [[`7990aa7`](http://github.com/eggjs/egg-cors/commit/7990aa7c92fa2c82bb6e9018b7191852879f1569)] - fix: use new URL instead of url.parse (#22) (Yiyu He <<dead_horse@qq.com>>)

2.2.2 / 2019-10-25
==================

**fixes**
  * [[`74e8c26`](http://github.com/eggjs/egg-cors/commit/74e8c264ddbc3aa4b926efa7696a310ef3dabe71)] - fix: should also check origin with port (#21) (Yelmor <<yelmor@outlook.com>>)

**others**
  * [[`53ffc7e`](http://github.com/eggjs/egg-cors/commit/53ffc7ec2cb4d119dc2e6b76bbccb0ed7a3712e9)] - chore: update travis (TZ | 天猪 <<atian25@qq.com>>)

2.2.1 / 2019-10-22
==================

**fixes**
  * [[`499c2b1`](http://github.com/eggjs/egg-cors/commit/499c2b1cd730b4a9d5d7811946661cc9b475326d)] - fix: second-level domain and port support misjudgement (#20) (Khaidi Chu <<i@2333.moe>>)

2.2.0 / 2019-03-11
==================

**features**
  * [[`30a1b8c`](http://github.com/eggjs/egg-cors/commit/30a1b8c8cf58cacd208f86905d334588db523b8e)] - feat: use koa/cors@3, support options.origin to be async function (#19) (Yiyu He <<dead_horse@qq.com>>)

2.1.2 / 2018-11-30
==================

  * chore: typings of origin params (#18)

2.1.1 / 2018-10-01
==================

  * deps: update (#17)
  * chore: add types of cors option. (#15)
  * docs: update readme (#16)

2.1.0 / 2018-07-11
==================

**others**
  * [[`ff8b7da`](http://github.com/eggjs/egg-cors/commit/ff8b7dab9c9acff5f5319ecca1fe0df5d1ebfaf8)] - chore(typings): add interface Config['cors'] (#12) (waiting <<waiting@xiaozhong.biz>>)

2.0.0 / 2017-11-23
==================

**others**
  * [[`120639f`](http://github.com/eggjs/egg-cors/commit/120639fb784ed1ea71eff071124d3f242b52ab72)] - refactor: use async function and support egg@2 (#9) (Yiyu He <<dead_horse@qq.com>>)

1.2.0 / 2017-07-24
==================

  * deps: update deps (#8)
  * feat: add config for Access-Control-Allow-Origin (#7)

1.1.0 / 2017-03-24
==================

  * feat: update to egg@1.0 and docs fix (#6)
  * fix: adjust with new test (#4)

1.0.0 / 2016-11-04
==================

  * chore: update deps and test on node v7 (#3)
  * doc: add configuration information on how to pass in domain whitelist (#2)
  * test: add tests (#1)

0.0.2 / 2016-07-15
==================

  * init
