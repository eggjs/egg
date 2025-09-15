import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const fixtures = path.join(__dirname, 'fixtures');

export function getFilePath(filename: string) {
  return path.join(fixtures, filename);
}
