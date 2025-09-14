import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(__dirname, 'fixtures');

export function getFilepath(name: string) {
  return path.join(fixtures, name);
}

export function escape(str: string) {
  return str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&').replace(/-/g, '\\x2d');
}

export const DELAY = process.env.CI ? 30000 : 5000;
