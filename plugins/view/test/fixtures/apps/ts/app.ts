import { Application } from 'egg';

import { ViewEngineBase } from '../../../../src/index.ts';

const setupApp = (app: Application): void => {
  app.view.use('newEngine', NewEngine);
};

export default setupApp;

class NewEngine extends ViewEngineBase {
  render(): Promise<string> {
    return Promise.resolve('');
  }
  renderString(): Promise<string> {
    return Promise.resolve('666');
  }
}
