# @eggjs/oxlint-config

[![NPM Version](https://img.shields.io/npm/v/@eggjs/oxlint-config)](https://www.npmjs.com/package/@eggjs/oxlint-config)
[![NPM Downloads](https://img.shields.io/npm/dm/@eggjs/oxlint-config)](https://www.npmjs.com/package/@eggjs/oxlint-config)
[![NPM License](https://img.shields.io/npm/l/@eggjs/oxlint-config)](https://github.com/eggjs/oxlint-config/blob/master/LICENSE)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/eggjs/oxlint-config/ci.yml?branch=master)](https://github.com/eggjs/oxlint-config/actions/workflows/ci.yml?query=branch%3Amaster)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](https://makeapullrequest.com)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/eggjs/oxlint-config)

oxlint config for our projects.

## Install

```bash
npm i -D @eggjs/oxlint-config
```

## Usage

Extends on your project root `.oxlintrc.json` file:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "env": {
    "node": true
  },
  "extends": [
    "./node_modules/@eggjs/oxlint-config/.oxlintrc.json"
  ]
}
```

## License

[MIT](./LICENSE)

## Contributors

[![Contributors](https://contrib.rocks/image?repo=eggjs/oxlint-config)](https://github.com/eggjs/oxlint-config/graphs/contributors)

Made with [contributors-img](https://contrib.rocks).
