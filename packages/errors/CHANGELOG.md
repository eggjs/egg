# Changelog

> [!IMPORTANT]
> Moving forwards we are using the GitHub releases page at <https://github.com/eggjs/egg/releases> in combination with [release.yml](https://github.com/eggjs/egg/actions/workflows/release.yml) for publishing releases and their changelogs. 

---

## 3.0.0+

### ⚠ BREAKING CHANGES

* drop Node.js < 22.18.0 support
* only support egg@4

part of https://github.com/eggjs/egg/issues/5434

---

## [2.3.2](https://github.com/eggjs/egg-errors/compare/v2.3.1...v2.3.2) (2022-12-18)


### Bug Fixes

* replace all single quote in message ([#15](https://github.com/eggjs/egg-errors/issues/15)) ([8bf8f4d](https://github.com/eggjs/egg-errors/commit/8bf8f4dd337a3111054246e71a73e9057c9c0691))

---

# 2.3.1 / 2022-02-22

**features**

- [[`1992e0b`](http://github.com/eggjs/egg-errors/commit/1992e0bbcdb41c48b64771256e0fa8d27953cecb)] - feat: avoid auto link detect error on IM (#14) (fengmk2 <<fengmk2@gmail.com>>)

# 2.3.0 / 2021-10-26

**features**

- [[`94453a4`](http://github.com/eggjs/egg-errors/commit/94453a4b2b24c98b0fc53020808340e446a04ed8)] - feat: add static create method (#13) (mansonchor.github.com <<mansonchor1987@gmail.com>>)

# 2.2.3 / 2021-07-29

**fixes**

- [[`c3a89cc`](http://github.com/eggjs/egg-errors/commit/c3a89ccefe2370deb5400729fdad106dc6e84a52)] - fix: faq url append twice (#12) (mansonchor.github.com <<mansonchor1987@gmail.com>>)

# 2.2.2 / 2021-04-06

**fixes**

- [[`4e41373`](http://github.com/eggjs/egg-errors/commit/4e41373129601aa4e09faef21c607f432f9d1105)] - fix: judge frameworkError ins replace to Symbol.for (mansonchor.github.com <<mansonchor1987@gmail.com>>)

# 2.2.1 / 2021-03-29

**fixes**

- [[`510ca7b`](http://github.com/eggjs/egg-errors/commit/510ca7b95edff4c2a2b9227c01ae8baa14cf5af3)] - fix: faqUrl suffix use err.code (mansonchor <<mansonchor1987@gmail.com>>)

# 2.2.0 / 2021-03-22

**others**

- [[`cae5451`](http://github.com/eggjs/egg-errors/commit/cae545101335c8a878ec4ee9094aeca1c688b825)] - Feat/framework error (#10) (mansonchor.github.com <<mansonchor@126.com>>)

# 2.1.1 / 2019-12-02

**fixes**

- [[`fbad6cd`](http://github.com/eggjs/egg-errors/commit/fbad6cd0ed5ae723b913124bf9176bfd36eb791f)] - fix: optimize from function (#9) (Peng Gao <<ggjqzjgp103@qq.com>>)

# 2.1.0 / 2018-12-26

**features**

- [[`10d565a`](http://github.com/eggjs/egg-errors/commit/10d565a24118c62d0a8a5ac2edcf04ab0df3968b)] - feat: support short name for HTTP Errors (#8) (fengmk2 <<fengmk2@gmail.com>>)

# 2.0.1 / 2018-12-17

**fixes**

- [[`e2356cc`](http://github.com/eggjs/egg-errors/commit/e2356ccfa5e4caec8044957bf8e95202ae024f4a)] - fix: set the right message when contructor is string (#7) (Haoliang Gao <<sakura9515@gmail.com>>)

# 2.0.0 / 2018-12-11

**features**

- [[`ccaf678`](http://github.com/eggjs/egg-errors/commit/ccaf678e33628ca1424416e3e11b815d74e90e57)] - feat: default value for http error header (#6) (Haoliang Gao <<sakura9515@gmail.com>>)
- [[`8c9ae6b`](http://github.com/eggjs/egg-errors/commit/8c9ae6b35c383961ba7ba3c89eb69fd30ff8acfd)] - feat: BREAKING_CHANGE rename InternalServerErrorError to InternalServerError (#5) (Haoliang Gao <<sakura9515@gmail.com>>)

**fixes**

- [[`f26bab7`](http://github.com/eggjs/egg-errors/commit/f26bab768ce9bb6fa280738a288a20a95e229a8b)] - fix: Fixed HttpHeader (#3) (sm2017 <<socketman2016@gmail.com>>)

**others**

- [[`6c50c04`](http://github.com/eggjs/egg-errors/commit/6c50c0439f6fcd19ad0a039fbb69cb1715351f18)] - test: dont run tsc when install (#2) (Haoliang Gao <<sakura9515@gmail.com>>)

# 1.0.1 / 2018-08-21

**fixes**

- [[`52ad393`](http://github.com/eggjs/egg-errors/commit/52ad3935b9288e3b8b9c98407de674338a00ed08)] - fix: should tsc before publish (popomore <<sakura9515@gmail.com>>)

# 1.0.0 / 2018-08-21

**features**

- [[`e72b961`](http://github.com/eggjs/egg-errors/commit/e72b96141fbf132c6c7e8b60f2fb2a4c3bdd4262)] - feat: first implement (#1) (Haoliang Gao <<sakura9515@gmail.com>>),fatal: No names found, cannot describe anything.

**others**
