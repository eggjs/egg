import path from 'node:path';

export const __dirname = import.meta.dirname;

export function getFixtures(filename: string) {
  return path.join(__dirname, 'fixtures', filename);
}
