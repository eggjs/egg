import { Application } from 'egg';
import testExportClass from './lib/export-class';
import testLogger from './lib/logger';

export default (app: Application) => {
  testExportClass(app);
  testLogger(app);
};
