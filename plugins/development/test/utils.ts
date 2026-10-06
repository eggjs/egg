import path from 'node:path';
import { scheduler } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

export function getFilepath(name: string): string {
  return path.join(fixtures, name);
}

export function escape(str: string): string {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
}

export const DELAY: number = process.env.CI ? 30000 : 5500;

// Poll until `ready()` returns true, up to `timeout` ms, checking every 200ms.
// Resolves anyway on timeout so the caller's own assertions produce the diff;
// a fixed sleep after touching a watched file flakes on slow CI runners.
export async function waitFor(ready: () => boolean, timeout = 30_000): Promise<void> {
  const deadline = Date.now() + timeout;
  while (!ready()) {
    if (Date.now() >= deadline) return;
    await scheduler.wait(200);
  }
}
