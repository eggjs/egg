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

export const CONTROLLER_TIMEOUT_METADATA: symbol = Symbol.for('EggPrototype#controller#timeout');

export const CONTROLLER_MCP_NAME: symbol = Symbol.for('EggPrototype#controller#mcp#name');
export const CONTROLLER_MCP_VERSION: symbol = Symbol.for('EggPrototype#controller#mcp#version');
export const CONTROLLER_MCP_CONTROLLER_PARAMS_MAP: symbol = Symbol.for('EggPrototype#controller#mcp#params');
export const CONTROLLER_MCP_RESOURCE_MAP: symbol = Symbol.for('EggPrototype#controller#mcp#resource');
export const CONTROLLER_MCP_RESOURCE_PARAMS_MAP: symbol = Symbol.for('EggPrototype#controller#mcp#resource#params');
export const CONTROLLER_MCP_TOOL_MAP: symbol = Symbol.for('EggPrototype#controller#mcp#tool');
export const CONTROLLER_MCP_TOOL_PARAMS_MAP: symbol = Symbol.for('EggPrototype#controller#mcp#tool#params');
export const CONTROLLER_MCP_TOOL_ARGS_INDEX: symbol = Symbol.for('EggPrototype#controller#mcp#tool#args');
export const CONTROLLER_MCP_EXTRA_INDEX: symbol = Symbol.for('EggPrototype#controller#mcp#extra');
export const CONTROLLER_MCP_PROMPT_MAP: symbol = Symbol.for('EggPrototype#controller#mcp#prompt');
export const CONTROLLER_MCP_PROMPT_PARAMS_MAP: symbol = Symbol.for('EggPrototype#controller#mcp#prompt#params');
export const CONTROLLER_MCP_PROMPT_ARGS_INDEX: symbol = Symbol.for('EggPrototype#controller#mcp#prompt#args');

export const METHOD_TIMEOUT_METADATA: symbol = Symbol.for('EggPrototype#method#timeout');

export const CONTROLLER_AGENT_CONTROLLER: symbol = Symbol.for('EggPrototype#controller#agent#isAgent');
export const CONTROLLER_AGENT_NOT_IMPLEMENTED: symbol = Symbol.for('EggPrototype#controller#agent#notImplemented');
export const CONTROLLER_AGENT_ENHANCED: symbol = Symbol.for('EggPrototype#controller#agent#enhanced');

export const AGENT_CONTROLLER_PROTO_IMPL_TYPE = 'AGENT_CONTROLLER_PROTO';
