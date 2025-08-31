import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  session: {
    enable: true,
    path: path.join(__dirname, '../node_modules/session'),
  },

  hsfclient: {
    enable: false,
    path: path.join(__dirname, '../plugins/hsfclient'),
  },

  configclient: {
    enable: false,
    path: path.join(__dirname, '../plugins/configclient'),
  },

  eagleeye: {
    enable: false,
    path: path.join(__dirname, '../plugins/eagleeye'),
  },

  diamond: {
    enable: false,
    path: path.join(__dirname, '../plugins/diamond'),
  },

  zzz: {
    enable: true,
    path: path.join(__dirname, '../plugins/zzz'),
  },

  package: {
    enable: true,
    package: 'package',
  },

  opt: {
    enable: false,
    package: 'opt',
  },
};
