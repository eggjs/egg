import path from 'node:path';

export function getFixtures(name: string): string {
  return path.join(import.meta.dirname, 'fixtures', name);
}

export function getAppBaseDir(name: string): string {
  return getFixtures(`apps/${name}`);
}
