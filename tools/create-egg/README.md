# create-egg

[![NPM version][npm-image]][npm-url]
[![NPM download][download-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/create-egg.svg?style=flat-square
[npm-url]: https://npmjs.org/package/create-egg
[download-image]: https://img.shields.io/npm/dm/create-egg.svg?style=flat-square
[download-url]: https://npmjs.org/package/create-egg

> Fork and refactor from [create-vite](https://github.com/vitejs/vite/tree/main/packages/create-vite)

## Scaffolding Your First Egg.js Project

> **Compatibility Note:**
> Egg.js requires [Node.js](https://nodejs.org/) version 20.19+. However, some templates require a higher Node.js version to work, please upgrade if your package manager warns about it.

With NPM:

```bash
npm create egg@latest
```

With Yarn:

```bash
yarn create egg
```

With PNPM:

```bash
pnpm create egg
```

Then follow the prompts!

You can also directly specify the project name and the template you want to use via additional command line options. For example, to scaffold a Egg.js + TypeScript project, run:

```bash
# npm 7+
npm create egg@latest my-egg-app -- --template tegg

# yarn
yarn create egg my-egg-app --template tegg

# pnpm
pnpm create egg my-egg-app --template tegg
```

Currently supported template presets include:

- `tegg`
- `simple`

You can use `.` for the project name to scaffold in the current directory.

## Community Templates

Check out Awesome Egg.js for [community maintained templates](https://github.com/eggjs/awesome-egg#boilerplates) that include other tools or target different frameworks. You can use a tool like [degit](https://github.com/Rich-Harris/degit) to scaffold your project with one of the templates.

```bash
npx degit user/project my-project
cd my-project

npm install
npm run dev
```

If the project uses `main` as the default branch, suffix the project repo with `#main`

```bash
npx degit user/project#main my-project
```

[MIT](LICENSE)
