if (!process.env.EGG_TYPESCRIPT) {
  process.env.EGG_TYPESCRIPT = 'true';
}

// Ensure child processes spawned by these tests inherit a runtime TS loader so
// Egg can load .ts via `import()`. The root vitest config already injects
// `--import=@oxc-node/core/register`; only inject it ourselves when neither it
// nor the legacy `tsx/esm` hook is present, to avoid enabling both at once.
const nodeOptions = process.env.NODE_OPTIONS ?? '';
if (!nodeOptions.includes('@oxc-node/core/register') && !nodeOptions.includes('tsx/esm')) {
  process.env.NODE_OPTIONS = `${nodeOptions} --import=@oxc-node/core/register`.trim();
}
