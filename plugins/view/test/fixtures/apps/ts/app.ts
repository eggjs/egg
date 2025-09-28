import { Application } from 'egg';

export default (app: Application) => {
  app.view.use('newEngine', NewEngine);
};

class NewEngine {
  render() {
    return Promise.resolve('');
  }
  renderString() {
    return Promise.resolve('666');
  }
}
