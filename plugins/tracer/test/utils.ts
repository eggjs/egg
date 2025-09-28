import path from 'node:path';

export function getFixtures(name: string) {
  return path.join(import.meta.dirname, 'fixtures', name);
}
