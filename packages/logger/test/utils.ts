import { rm } from 'node:fs/promises';

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function rimraf(file: string): Promise<void> {
  try {
    await rm(file, { force: true, recursive: true });
  } catch {
    // ignore error
  }
}
