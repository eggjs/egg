import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
export const testDir: string = path.dirname(__filename);

export function getFilepath(name: string): string {
  return path.join(testDir, 'fixtures', name);
}
