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

## [3.0.0](https://github.com/eggjs/egg-tracer/compare/v2.1.0...v3.0.0) (2025-02-04)


### ⚠ BREAKING CHANGES

* drop Node.js < 18.19.0 support

part of https://github.com/eggjs/egg/issues/3644

https://github.com/eggjs/egg/issues/5257


<!-- This is an auto-generated comment: release notes by coderabbit.ai
-->

## Summary by CodeRabbit

- **New Features**
- Introduced a robust tracer functionality that generates unique trace
IDs for improved application tracing.
- **Documentation**
- Rebranded the package to "@eggjs/tracer" with updated installation
instructions, usage examples, and a new contributors section.
- **Refactor**
- Streamlined internal architecture and module integration for enhanced
performance and clearer TypeScript support.
- **Chores**
- Revamped dependency management and build workflows, ensuring
compatibility with Node.js ≥ 18.19.0.

<!-- end of auto-generated comment: release notes by coderabbit.ai -->

### Features

* support cjs and esm both by tshy ([#9](https://github.com/eggjs/egg-tracer/issues/9)) ([dba5b9c](https://github.com/eggjs/egg-tracer/commit/dba5b9cce4becbd81a73466e9b22dc0dbb64450a))

## [2.1.0](https://github.com/eggjs/egg-tracer/compare/v2.0.0...v2.1.0) (2023-05-24)


### Features

* add index.d.ts ([#7](https://github.com/eggjs/egg-tracer/issues/7)) ([c1cc5a9](https://github.com/eggjs/egg-tracer/commit/c1cc5a9902db8eae3b1a77667c0958b180b4c7dd))

## [2.0.0](https://github.com/eggjs/egg-tracer/compare/v1.1.0...v2.0.0) (2023-01-07)


### ⚠ BREAKING CHANGES

* Drop Node.js < 14 support

### Features

* upgrade all deps to latest versions ([#6](https://github.com/eggjs/egg-tracer/issues/6)) ([516ae2b](https://github.com/eggjs/egg-tracer/commit/516ae2b570e3fceb523d7ca37443310da10ac5ed))

---


1.1.0 / 2017-09-07
==================

**features**
  * [[`02501c6`](http://github.com/eggjs/egg-tracer/commit/02501c6623da0acfaca660b71d12e66afa5d7810)] - feat: support app or agent get tracer (#2) (hui <<kangpangpang@gmail.com>>)

**others**
  * [[`840724e`](http://github.com/eggjs/egg-tracer/commit/840724e8c5dc31908397004ede4a6e5a52555e0e)] - chore: upgrade deps and fix test (#1) (Haoliang Gao <<sakura9515@gmail.com>>)

1.0.0 / 2016-08-16
==================

  * first version
