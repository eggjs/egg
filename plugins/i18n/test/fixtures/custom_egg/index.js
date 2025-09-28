import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { startCluster as _startCluster, Application as _Application, Agent as _Agent } from 'egg';

const __filename = fileURLToPath(import.meta.url);
const EGG_PATH = path.dirname(__filename);

export class Application extends _Application {
  get [Symbol.for('egg#eggPath')]() {
    return EGG_PATH;
  }
}

export class Agent extends _Agent {
  get [Symbol.for('egg#eggPath')]() {
    return EGG_PATH;
  }
}

export function startCluster(options, callback) {
  options = options || {};
  options.customEgg = EGG_PATH;
  _startCluster(options, callback);
}
