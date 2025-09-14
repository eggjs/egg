import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.error(path.join(__dirname, '../../../../'));

export default {
  package: path.join(__dirname, '../../../../'),
};
