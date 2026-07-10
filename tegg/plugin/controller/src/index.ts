import './types.ts';
// Host-agnostic controller runtime surface (including the teggController module
// that provides the DI inner objects) now lives in @eggjs/controller-runtime;
// re-export it so existing egg-side consumers keep importing from this plugin.
export * from '@eggjs/controller-runtime';
