import type { Application } from 'egg';
import { NunjucksView } from './lib/view.ts';

export default (app: Application): void => {
  app.view.use('nunjucks', NunjucksView as any);
};
