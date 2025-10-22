import { pathToRegexp } from 'path-to-regexp';

export type PathMatchingFun = (ctx: any) => boolean;

export type PathMatchingPattern = string | RegExp | PathMatchingFun | (string | RegExp | PathMatchingFun)[];

export interface PathMatchingOptions {
  ignore?: PathMatchingPattern;
  match?: PathMatchingPattern;
  pathToRegexpModule?: any;
}

export function pathMatching(options: PathMatchingOptions): PathMatchingFun {
  options = options || {};
  if (options.match && options.ignore) {
    throw new Error('options.match and options.ignore can not both present');
  }
  if (!options.match && !options.ignore) {
    return () => true;
  }

  const pathToRegexpModule = options.pathToRegexpModule || { pathToRegexp };
  const pathToRegexpFn = pathToRegexpModule.pathToRegexp || pathToRegexpModule;
  const matchFn = options.match
    ? toPathMatch(options.match, pathToRegexpFn)
    : toPathMatch(options.ignore!, pathToRegexpFn);

  return function pathMatch(ctx: any) {
    const matched = matchFn(ctx);
    return options.match ? matched : !matched;
  };
}

function toPathMatch(pattern: PathMatchingPattern, pathToRegexpFn: any): PathMatchingFun {
  if (typeof pattern === 'string') {
    let reg = pathToRegexpFn(pattern, [], { end: false });
    if (reg.regexp) {
      // support path-to-regexp@8
      // => const { regexp, keys } = pathToRegexp("/foo/:bar");
      reg = reg.regexp;
    }
    if (reg.global) reg.lastIndex = 0;
    return (ctx) => reg.test(ctx.path);
  }
  if (pattern instanceof RegExp) {
    return (ctx) => {
      if (pattern.global) {
        pattern.lastIndex = 0;
      }
      return pattern.test(ctx.path);
    };
  }
  if (typeof pattern === 'function') return pattern;
  if (Array.isArray(pattern)) {
    const matchFns = pattern.map((item) => toPathMatch(item, pathToRegexpFn));
    return (ctx) => matchFns.some((matchFn) => matchFn(ctx));
  }
  throw new Error(`match/ignore pattern must be RegExp, Array or String, but got ${pattern}`);
}
