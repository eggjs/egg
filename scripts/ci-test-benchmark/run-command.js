import { spawn } from 'node:child_process';

export async function runCommand(command, env) {
  if (command.length === 0) {
    throw new Error('No command to run');
  }
  const start = process.hrtime.bigint();
  const startedAt = new Date().toISOString();
  const result = await spawnCommand(command, env);
  const endedAt = new Date().toISOString();
  const wallTimeMs = Number((process.hrtime.bigint() - start) / 1_000_000n);

  return {
    ...result,
    endedAt,
    startedAt,
    wallTimeMs,
  };
}

export function createDryRunResult() {
  const startedAt = new Date().toISOString();
  return {
    endedAt: new Date().toISOString(),
    error: null,
    exitCode: 0,
    signal: null,
    startedAt,
    wallTimeMs: 0,
  };
}

async function spawnCommand(command, env) {
  return new Promise((resolve) => {
    const child = spawn(command[0], command.slice(1), {
      env,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('error', (error) => {
      resolve({
        error: {
          code: error.code,
          message: error.message,
        },
        exitCode: 1,
        signal: null,
      });
    });
    child.on('close', (exitCode, signal) => {
      resolve({
        error: null,
        exitCode,
        signal,
      });
    });
  });
}
