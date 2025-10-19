import { defineConfig, type PartialEggConfig } from 'egg';

// FIXME: The inferred type of 'default' cannot be named without a reference to '../../../packages/egg/node_modules/egg-logger/index.js'. This is likely not portable. A type annotation is necessary
export default defineConfig({
  keys: '123456',
}) as PartialEggConfig;
