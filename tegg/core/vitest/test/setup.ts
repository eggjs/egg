if (!process.env.EGG_TYPESCRIPT) {
  process.env.EGG_TYPESCRIPT = 'true';
}

const nodeOptions = process.env.NODE_OPTIONS ?? '';
if (!nodeOptions.includes('tsx/esm')) {
  process.env.NODE_OPTIONS = `${nodeOptions} --import=tsx/esm`.trim();
}
