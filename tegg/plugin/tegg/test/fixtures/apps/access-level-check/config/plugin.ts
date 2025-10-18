import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  tracer: {
    package: '@eggjs/tracer',
    enable: true,
  },
  tegg: {
    path: path.join(__dirname, '../../../../..'),
    enable: true,
  },
  teggConfig: {
    package: '@eggjs/tegg-config',
    enable: true,
  },
  watcher: false,
};
