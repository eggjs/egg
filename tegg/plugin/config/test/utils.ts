import path from 'node:path';

export function getFixtures(name: string): string {
  return path.join(import.meta.dirname, 'fixtures', name);
}
