import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const tsNodeRegister = 'ts-node/register/transpile-only';
const tsNodeRegisterPath = require.resolve(tsNodeRegister);

if (!process.env.EGG_TYPESCRIPT) {
  process.env.EGG_TYPESCRIPT = 'true';
}

const nodeOptions = process.env.NODE_OPTIONS ?? '';
const hasNodeOptions = nodeOptions.includes('ts-node/register') || nodeOptions.includes(tsNodeRegisterPath);
if (!hasNodeOptions) {
  process.env.NODE_OPTIONS = `${nodeOptions} --require ${tsNodeRegister}`.trim();
}

const execArgv = process.execArgv;
const hasExecArgv = execArgv.includes(tsNodeRegister) || execArgv.includes(tsNodeRegisterPath);
if (!hasExecArgv) {
  execArgv.push('--require', tsNodeRegister);
}

require(tsNodeRegisterPath);
