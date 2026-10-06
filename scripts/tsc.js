// Resolve the native compiler explicitly: hoisted compatibility API dependencies
// can otherwise replace the tsc executable with the older JavaScript compiler.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const compiler = fileURLToPath(new URL('../node_modules/@typescript/native/bin/tsc', import.meta.url));
const result = spawnSync(process.execPath, [compiler, ...process.argv.slice(2)], { stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
