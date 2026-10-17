// tsrs has native binaries for Apple Silicon and 64-bit Linux.
// Use its WebAssembly compiler on other platforms, including Windows.
const hasNativeBinary =
  (process.platform === 'darwin' && process.arch === 'arm64') ||
  (process.platform === 'linux' && ['arm64', 'x64'].includes(process.arch));
const compiler = hasNativeBinary ? 'tsrs' : '@ts-rs/wasm';
const packageUrl = import.meta.resolve(`${compiler}/package.json`);
const { default: packageJson } = await import(packageUrl, { with: { type: 'json' } });

await import(new URL(Object.values(packageJson.bin)[0], packageUrl).href);
