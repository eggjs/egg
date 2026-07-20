import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    level: 'error',
    // The fetch controller transport joins the app through the package.json-driven
    // framework-module scan (its own package root is scanned for eggModule deps), not
    // a code import — being a dependency IS the declaration. service-worker-runtime is
    // imported (ContextProtoProperty), so it is not listed here.
    ignore: ['@eggjs/service-worker-controller'],
  },
});
