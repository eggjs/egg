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

## [2.1.0](https://github.com/eggjs/egg-path-matching/compare/v2.0.0...v2.1.0) (2024-09-18)


### Features

* use path-to-regexp@6.3.0 ([#10](https://github.com/eggjs/egg-path-matching/issues/10)) ([b059f04](https://github.com/eggjs/egg-path-matching/commit/b059f04da680010b6cd506a4950bbd120cc78e95))

## [2.0.0](https://github.com/eggjs/egg-path-matching/compare/v1.1.0...v2.0.0) (2024-06-15)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

https://github.com/eggjs/egg/issues/5257

### Features

* support cjs and esm both ([#8](https://github.com/eggjs/egg-path-matching/issues/8)) ([a092108](https://github.com/eggjs/egg-path-matching/commit/a092108f1552296ea7ba060300bf580f3a6a5d2e))

## [1.1.0](https://github.com/eggjs/egg-path-matching/compare/v1.0.1...v1.1.0) (2023-12-14)


### Features

* use github action and auto release ([#6](https://github.com/eggjs/egg-path-matching/issues/6)) ([1eb34da](https://github.com/eggjs/egg-path-matching/commit/1eb34da16f9676737bbc1fd95fc73ae26e8e5b39))

1.0.1 / 2017-11-15
==================

**fixes**
  * [[`6e94f78`](http://github.com/eggjs/egg-path-matching/commit/6e94f78d1229e85a2420274cf3e17c0c7c41c15b)] - fix: reset lastIndex when pattern used the "g" flag (#1) (eric.zhang <<910261782@qq.com>>)

**others**
  * [[`ca6187d`](http://github.com/eggjs/egg-path-matching/commit/ca6187dd5499f681d5d820541e82210e82019055)] - docs: fix badges (dead-horse <<dead_horse@qq.com>>)
  * [[`f7d936b`](http://github.com/eggjs/egg-path-matching/commit/f7d936b16d26fb16ea4e5af56f8ced729331f8ae)] - build: add more scripts (dead-horse <<dead_horse@qq.com>>)

1.0.0 / 2016-11-15
==================

  * feat: add autod config
  * test: build test on node@4,5,6
  * feat: first implement
