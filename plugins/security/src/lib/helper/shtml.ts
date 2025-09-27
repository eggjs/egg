import type { BaseContextClass } from 'egg';
import xss from 'xss';

import { isSafeDomain, getFromUrl } from '../utils.ts';
import type { SecurityHelperOnTagAttrHandler } from '../../types.ts';

const BUILD_IN_ON_TAG_ATTR = Symbol('buildInOnTagAttr');

// default rule: https://github.com/leizongmin/js-xss/blob/master/lib/default.js
// add domain filter based on xss module
// custom options http://jsxss.com/zh/options.html
// eg: support a tag，filter attributes except for title : whiteList: {a: ['title']}
export default function shtml(this: BaseContextClass, val: string) {
  if (typeof val !== 'string') {
    return val;
  }

  const securityOptions = this.ctx.securityOptions;
  const buildInOnTagAttrHandler: SecurityHelperOnTagAttrHandler | undefined = undefined;
  const shtmlConfig = {
    ...this.app.config.helper.shtml,
    ...securityOptions.shtml,
    [BUILD_IN_ON_TAG_ATTR]: buildInOnTagAttrHandler,
  };
  const domainWhiteList = this.app.config.security.domainWhiteList;
  const app = this.app;
  // filter href and src attribute if not in domain white list
  if (!shtmlConfig[BUILD_IN_ON_TAG_ATTR]) {
    shtmlConfig[BUILD_IN_ON_TAG_ATTR] = (_tag, name, value, isWhiteAttr) => {
      if (isWhiteAttr && (name === 'href' || name === 'src')) {
        if (!value) {
          return;
        }

        value = String(value);
        if (value[0] === '/' || value[0] === '#') {
          return;
        }

        const hostname = getFromUrl(value, 'hostname');
        if (!hostname) {
          return;
        }

        // If we don't have our hostname in the app.security.domainWhiteList,
        // Just check for `shtmlConfig.domainWhiteList` and `ctx.whiteList`.
        if (!isSafeDomain(hostname, domainWhiteList)) {
          // Check for `shtmlConfig.domainWhiteList` first (duplicated now)
          if (shtmlConfig.domainWhiteList && shtmlConfig.domainWhiteList.length > 0) {
            app.deprecate(
              '[@eggjs/security/lib/helper/shtml] `config.helper.shtml.domainWhiteList` has been deprecate. Please use `config.security.domainWhiteList` instead.'
            );
            if (!isSafeDomain(hostname, shtmlConfig.domainWhiteList)) {
              return '';
            }
          } else {
            return '';
          }
        }
      }
    };

    // avoid overriding user configuration 'onTagAttr'
    if (shtmlConfig.onTagAttr) {
      const customOnTagAttrHandler = shtmlConfig.onTagAttr;
      shtmlConfig.onTagAttr = function (tag, name, value, isWhiteAttr) {
        const result = customOnTagAttrHandler.apply(this, [tag, name, value, isWhiteAttr]);
        if (result !== undefined) {
          return result;
        }
        // fallback to build-in handler
        return shtmlConfig[BUILD_IN_ON_TAG_ATTR]!.apply(this, [tag, name, value, isWhiteAttr]);
      };
    } else {
      shtmlConfig.onTagAttr = shtmlConfig[BUILD_IN_ON_TAG_ATTR];
    }
  }

  return xss(val, shtmlConfig);
}
