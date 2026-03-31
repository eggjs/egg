export type { IncomingHttpHeaders } from 'node:http';

import type { Context, Next, MiddlewareFunc } from 'egg';

export type EggContext = Context;
export type { Next, MiddlewareFunc };

export const ControllerType = {
  HTTP: 'HTTP',
  SOFA_RPC: 'SOFA_RPC',
  SOFA_RPC_STREAM: 'SOFA_RPC_STREAM',
  MGW_RPC: 'MGW_RPC',
  MGW_RPC_STREAM: 'MGW_RPC_STREAM',
  MESSAGE: 'MESSAGE',
  SCHEDULE: 'SCHEDULE',
  HEADERS: 'HEADERS',
  MCP: 'MCP',
} as const;
export type ControllerType = (typeof ControllerType)[keyof typeof ControllerType];

export type HostType = string | string[];

export type ControllerTypeLike = ControllerType | string;

export const MethodType = {
  HTTP: 'HTTP',
  SOFA_RPC: 'SOFA_RPC',
  SOFA_RPC_STREAM: 'SOFA_RPC_STREAM',
  MGW_RPC: 'MGW_RPC',
  MGW_RPC_STREAM: 'MGW_RPC_STREAM',
  MESSAGE: 'MESSAGE',
  SCHEDULE: 'SCHEDULE',
} as const;
export type MethodType = (typeof MethodType)[keyof typeof MethodType];

export type MethodTypeLike = ControllerType | string;

export const HTTPMethodEnum = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE',
  PATCH: 'PATCH',
  OPTIONS: 'OPTIONS',
  HEAD: 'HEAD',
} as const;
export type HTTPMethodEnum = (typeof HTTPMethodEnum)[keyof typeof HTTPMethodEnum];

export const HTTPParamType = {
  QUERY: 'QUERY',
  QUERIES: 'QUERIES',
  BODY: 'BODY',
  PARAM: 'PARAM',
  REQUEST: 'REQUEST',
  HEADERS: 'HEADERS',
  COOKIES: 'COOKIES',
} as const;
export type HTTPParamType = (typeof HTTPParamType)[keyof typeof HTTPParamType];

export const MCPProtocols = {
  STDIO: 'STDIO',
  SSE: 'SSE',
  STREAM: 'STREAM',
} as const;
export type MCPProtocols = (typeof MCPProtocols)[keyof typeof MCPProtocols];
