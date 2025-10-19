export const CONTROLLER_TYPE: symbol = Symbol.for('EggPrototype#controllerType');
export const CONTROLLER_NAME: symbol = Symbol.for('EggPrototype#controllerName');
export const CONTROLLER_HOST: symbol = Symbol.for('EggPrototype#controllerHost');
export const CONTROLLER_MIDDLEWARES: symbol = Symbol.for('EggPrototype#controller#middlewares');
export const CONTROLLER_AOP_MIDDLEWARES: symbol = Symbol.for('EggPrototype#controller#aopMiddlewares');
export const CONTROLLER_ACL: symbol = Symbol.for('EggPrototype#controller#acl');

export const CONTROLLER_META_DATA: symbol = Symbol.for('EggPrototype#controller#metaData');

export const CONTROLLER_HTTP_PATH: symbol = Symbol.for('EggPrototype#controller#http#path');
export const CONTROLLER_METHOD_METHOD_MAP: symbol = Symbol.for('EggPrototype#controller#method#http#method');
export const CONTROLLER_METHOD_PATH_MAP: symbol = Symbol.for('EggPrototype#controller#method#http#path');
export const CONTROLLER_METHOD_PARAM_TYPE_MAP: symbol = Symbol.for('EggPrototype#controller#method#http#params#type');
export const CONTROLLER_METHOD_PARAM_NAME_MAP: symbol = Symbol.for('EggPrototype#controller#method#http#params#name');
export const CONTROLLER_METHOD_PRIORITY: symbol = Symbol.for('EggPrototype#controller#method#http#priority');

export const METHOD_CONTROLLER_TYPE_MAP: symbol = Symbol.for('EggPrototype#controller#mthods');
export const METHOD_CONTROLLER_HOST: symbol = Symbol.for('EggPrototype#controller#mthods#host');
export const METHOD_CONTEXT_INDEX: symbol = Symbol.for('EggPrototype#controller#method#context');
export const METHOD_MIDDLEWARES: symbol = Symbol.for('EggPrototype#method#middlewares');
export const METHOD_AOP_MIDDLEWARES: symbol = Symbol.for('EggPrototype#method#aopMiddlewares');
export const METHOD_AOP_REGISTER_MAP: symbol = Symbol.for('EggPrototype#method#aopMiddlewaresRegister');
export const METHOD_ACL: symbol = Symbol.for('EggPrototype#method#acl');
