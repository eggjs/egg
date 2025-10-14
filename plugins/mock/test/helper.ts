import path from 'node:path';

export const __dirname: string = import.meta.dirname;

export function getFixtures(filename: string): string {
  return path.join(__dirname, 'fixtures', filename);
}
