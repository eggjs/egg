import { normalize } from 'node:path';

import matcher from 'matcher';
import IP from '@eggjs/ip';
import type { Context } from 'egg';
import type { PathMatchingFun } from 'egg-path-matching';

import type { SecurityConfig } from '../types.ts';

/**
 * Check whether a domain is in the safe domain white list or not.
 * @param {String} domain The inputted domain.
 * @param {Array<string>} whiteList The white list for domain.
 * @return {Boolean} If the `domain` is in the white list, return true; otherwise false.
 */
export function isSafeDomain(domain: string, whiteList: string[]): boolean {
  // domain must be string, otherwise return false
  if (typeof domain !== 'string') return false;
  // Ignore case sensitive first
  domain = domain.toLowerCase();
  // add prefix `.`, because all domains in white list start with `.`
  const hostname = '.' + domain;

  return whiteList.some(rule => {
    // Check whether we've got '*' as a wild character symbol
    if (rule.includes('*')) {
      return matcher.isMatch(domain, rule);
    }
    // If domain is an absolute path such as `http://...`
    // We can directly check whether it directly equals to `domain`
    // And we don't need to cope with `endWith`.
    if (domain === rule) return true;
    // ensure wwweggjs.com not match eggjs.com
    if (!rule.startsWith('.')) rule = `.${rule}`;
    return hostname.endsWith(rule);
  });
}

export function isSafePath(path: string, ctx: Context) {
  path = '.' + path;
  if (path.includes('%')) {
    try {
      path = decodeURIComponent(path);
    } catch {
      if (ctx.app.config.env === 'local' || ctx.app.config.env === 'unittest') {
        // not under production environment, output log
        ctx.coreLogger.warn('[@eggjs/security: dta global block] : decode file path %j failed.', path);
      }
    }
  }
  const normalizePath = normalize(path);
  return !(normalizePath.startsWith('../') || normalizePath.startsWith('..\\'));
}

export function checkIfIgnore(opts: { enable: boolean; matching?: PathMatchingFun }, ctx: Context) {
  // check opts.enable first
  if (!opts.enable) return true;
  return !opts.matching?.(ctx);
}

const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const topDomains: Record<string, number> = {};
['.net.cn', '.gov.cn', '.org.cn', '.com.cn'].forEach(item => {
  topDomains[item] = 2 - item.split('.').length;
});

export function getCookieDomain(hostname: string) {
  // TODO(fengmk2): support ipv6
  if (IP_RE.test(hostname)) {
    return hostname;
  }
  // app.test.domain.com => .test.domain.com
  // app.stable.domain.com => .domain.com
  // app.domain.com => .domain.com
  // domain=.domain.com;
  const splits = hostname.split('.');
  let index = -2;

  // only when `*.test.*.com` set `.test.*.com`
  if (splits.length >= 4 && splits[splits.length - 3] === 'test') {
    index = -3;
  }
  let domain = getDomain(splits, index);
  if (topDomains[domain]) {
    // app.foo.org.cn => .foo.org.cn
    domain = getDomain(splits, index + topDomains[domain]);
  }
  return domain;
}

function getDomain(splits: string[], index: number) {
  return '.' + splits.slice(index).join('.');
}

export function merge(origin: Record<string, any>, opts?: Record<string, any>) {
  if (!opts) {
    return origin;
  }
  const res: Record<string, any> = {};

  const originKeys = Object.keys(origin);
  for (let i = 0; i < originKeys.length; i++) {
    const key = originKeys[i];
    res[key] = origin[key];
  }

  const keys = Object.keys(opts);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    res[key] = opts[key];
  }
  return res;
}

export function preprocessConfig(config: SecurityConfig) {
  // transfer ssrf.ipBlackList to ssrf.checkAddress
  // ssrf.ipExceptionList can easily pick out unwanted ips from ipBlackList
  // checkAddress has higher priority than ipBlackList
  const ssrf = config.ssrf;
  if (ssrf && ssrf.ipBlackList && !ssrf.checkAddress) {
    const blackList = ssrf.ipBlackList.map(getContains);
    const exceptionList = (ssrf.ipExceptionList || []).map(getContains);
    const hostnameExceptionList = ssrf.hostnameExceptionList;
    ssrf.checkAddress = (ipAddresses, _family, hostname) => {
      // Check white hostname first
      if (hostname && hostnameExceptionList) {
        if (hostnameExceptionList.includes(hostname)) {
          return true;
        }
      }
      // ipAddresses will be array address on Node.js >= 20
      // [
      //   { address: '220.181.125.241', family: 4 },
      //   { address: '240e:964:ea02:b00:3::3ec', family: 6 }
      // ]
      if (!Array.isArray(ipAddresses)) {
        ipAddresses = [ipAddresses];
      }
      for (const ipAddress of ipAddresses) {
        let address: string;
        if (typeof ipAddress === 'string') {
          address = ipAddress;
        } else {
          // FIXME: should support ipv6
          if (ipAddress.family === 6) {
            continue;
          }
          address = ipAddress.address;
        }
        // check white list first
        for (const exception of exceptionList) {
          if (exception(address)) {
            return true;
          }
        }
        // check black list
        for (const contains of blackList) {
          if (contains(address)) {
            return false;
          }
        }
      }
      // default allow
      return true;
    };
  }

  // Make sure that `whiteList` or `protocolWhiteList` is case insensitive
  config.domainWhiteList = config.domainWhiteList || [];
  config.domainWhiteList = config.domainWhiteList.map((domain: string) => domain.toLowerCase());

  config.protocolWhiteList = config.protocolWhiteList || [];
  config.protocolWhiteList = config.protocolWhiteList.map((protocol: string) => protocol.toLowerCase());

  // Make sure refererWhiteList is case insensitive
  if (config.csrf && config.csrf.refererWhiteList) {
    config.csrf.refererWhiteList = config.csrf.refererWhiteList.map((ref: string) => ref.toLowerCase());
  }

  // Directly converted to Set collection by a private property (not documented),
  // And we NO LONGER need to do conversion in `foreach` again and again in `lib/helper/surl.ts`.
  const protocolWhiteListSet = new Set(config.protocolWhiteList);
  protocolWhiteListSet.add('http');
  protocolWhiteListSet.add('https');
  protocolWhiteListSet.add('file');
  protocolWhiteListSet.add('data');

  Object.defineProperty(config, '__protocolWhiteListSet', {
    value: protocolWhiteListSet,
    enumerable: false,
  });
}

export function getFromUrl(url: string, prop: string): string | null {
  try {
    const parsed = new URL(url);
    return Reflect.get(parsed, prop);
  } catch {
    return null;
  }
}

function getContains(ip: string) {
  if (IP.isV4Format(ip) || IP.isV6Format(ip)) {
    return (address: string) => address === ip;
  }
  return IP.cidrSubnet(ip).contains;
}
