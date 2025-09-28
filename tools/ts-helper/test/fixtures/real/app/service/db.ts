import { Service } from 'egg';

export default class DbService extends Service {
  async fetch() {
    return 'service fetch';
  }
}
