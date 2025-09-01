import { debuglog } from 'node:util';
import { getProperty } from '../utils.js';

const debug = debuglog('@eggjs/mock/lib/parallel/util');

export const MOCK_APP_METHOD = [
  'ready',
  'isClosed',
  'closed',
  'close',
  'on',
  'once',
];

export const APP_INIT = Symbol('appInit');

export function proxyApp(app: any) {
  const proxyApp = new Proxy(app, {
    get(target, prop: string) {
      // don't delegate properties on MockAgent
      if (MOCK_APP_METHOD.includes(prop)) {
        return getProperty(target, prop);
      }
      if (!target[APP_INIT]) throw new Error(`can't get ${prop} before ready`);
      // it's asynchronous when agent and app are loading,
      // so should get the properties after loader ready
      debug('proxy handler.get %s', prop);
      return target._instance[prop];
    },
    set(target, prop: string, value) {
      if (MOCK_APP_METHOD.includes(prop)) return true;
      if (!target[APP_INIT]) throw new Error(`can't set ${prop} before ready`);
      debug('proxy handler.set %s', prop);
      target._instance[prop] = value;
      return true;
    },
    defineProperty(target, prop: string, descriptor) {
      // can't define properties on MockAgent
      if (MOCK_APP_METHOD.includes(prop)) return true;
      if (!target[APP_INIT]) throw new Error(`can't defineProperty ${prop} before ready`);
      debug('proxy handler.defineProperty %s', prop);
      Object.defineProperty(target._instance, prop, descriptor);
      return true;
    },
    deleteProperty(target, prop: string) {
      // can't delete properties on MockAgent
      if (MOCK_APP_METHOD.includes(prop)) return true;
      if (!target[APP_INIT]) throw new Error(`can't delete ${prop} before ready`);
      debug('proxy handler.deleteProperty %s', prop);
      delete target._instance[prop];
      return true;
    },
    getOwnPropertyDescriptor(target, prop: string) {
      if (MOCK_APP_METHOD.includes(prop)) return Object.getOwnPropertyDescriptor(target, prop);
      if (!target[APP_INIT]) throw new Error(`can't getOwnPropertyDescriptor ${prop} before ready`);
      debug('proxy handler.getOwnPropertyDescriptor %s', prop);
      return Object.getOwnPropertyDescriptor(target._instance, prop);
    },
    getPrototypeOf(target) {
      if (!target[APP_INIT]) throw new Error('can\'t getPrototypeOf before ready');
      debug('proxy handler.getPrototypeOf %s');
      return Object.getPrototypeOf(target._instance);
    },
  });
  return proxyApp;
}
