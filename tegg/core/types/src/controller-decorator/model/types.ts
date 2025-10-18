import type { Context } from 'egg';

export type EggContext = Context;
export type Next = () => Promise<void>;
export type MiddlewareFunc = (ctx: Context, next: Next) => Promise<void>;
export type { IncomingHttpHeaders } from 'node:http';

export enum ControllerType {
  HTTP = 'HTTP',
  SOFA_RPC = 'SOFA_RPC',
  SOFA_RPC_STREAM = 'SOFA_RPC_STREAM',
  MGW_RPC = 'MGW_RPC',
  MGW_RPC_STREAM = 'MGW_RPC_STREAM',
  MESSAGE = 'MESSAGE',
  SCHEDULE = 'SCHEDULE',
  HEADERS = 'HEADERS',
}

export type HostType = string | string[];

export type ControllerTypeLike = ControllerType | string;

export enum MethodType {
  HTTP = 'HTTP',
  SOFA_RPC = 'SOFA_RPC',
  SOFA_RPC_STREAM = 'SOFA_RPC_STREAM',
  MGW_RPC = 'MGW_RPC',
  MGW_RPC_STREAM = 'MGW_RPC_STREAM',
  MESSAGE = 'MESSAGE',
  SCHEDULE = 'SCHEDULE',
}

export type MethodTypeLike = ControllerType | string;

export enum HTTPMethodEnum {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  HEAD = 'HEAD',
}

export enum HTTPParamType {
  QUERY = 'QUERY',
  QUERIES = 'QUERIES',
  BODY = 'BODY',
  PARAM = 'PARAM',
  REQUEST = 'REQUEST',
  HEADERS = 'HEADERS',
  COOKIES = 'COOKIES',
}
