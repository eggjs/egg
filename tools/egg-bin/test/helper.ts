import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getRootDirname() {
  return path.join(__dirname, '..');
}

export function getFixtures(filename: string) {
  return path.join(__dirname, 'fixtures', filename);
}
