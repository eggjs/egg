import path from 'node:path';
import { Application } from 'egg';

export default (app: Application) => {
  let directory = path.resolve(app.baseDir, './app/model');
  app.loader.loadToApp(directory, 'model', {
    caseStyle: 'upper',
    directory,
  });

  directory = path.resolve(app.baseDir, './app/custom');
  app.loader.loadToApp(directory, 'custom', {
    caseStyle: 'lower',
    directory,
  });
};
