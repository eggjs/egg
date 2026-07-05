import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
  },
  unused: {
    level: 'error',
    // Built-in framework module plugins: consumed through the package.json
    // driven module scan (readModuleFromNodeModules reads this package's
    // dependencies), NOT through code imports — being a dependency IS the
    // declaration that makes them join the scan.
    ignore: ['@eggjs/aop-plugin', '@eggjs/dal-plugin', '@eggjs/tegg-config'],
  },
});
