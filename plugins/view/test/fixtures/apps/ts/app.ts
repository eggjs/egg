import { Application } from 'egg';

const setupApp = (app: Application): void => {
  app.view.use('newEngine', NewEngine);
};

export default setupApp;

class NewEngine {
  render(): Promise<string> {
    return Promise.resolve('');
  }
  renderString(): Promise<string> {
    return Promise.resolve('666');
  }
}
