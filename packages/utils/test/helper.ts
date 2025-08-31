import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
export const testDir = path.dirname(__filename);

export function getFilepath(name: string) {
  return path.join(testDir, 'fixtures', name);
}
