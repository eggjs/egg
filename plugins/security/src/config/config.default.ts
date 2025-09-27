import z from 'zod';
import { Context } from '@eggjs/core';

const CSRFSupportRequestItem = z.object({
  path: z.instanceof(RegExp),
  methods: z.array(z.string()),
});
export type CSRFSupportRequestItem = z.infer<typeof CSRFSupportRequestItem>;

export const LookupAddress = z.object({
  address: z.string(),
  family: z.number(),
});
export type LookupAddress = z.infer<typeof LookupAddress>;

const LookupAddressAndStringArray = z.union([z.string(), LookupAddress]).array();
const SSRFCheckAddressFunction = z
  .function()
  .args(
    z.union([z.string(), LookupAddress, LookupAddressAndStringArray]),
    z.union([z.number(), z.string()]),
    z.string()
  )
  .returns(z.boolean());
/**
 * SSRF check address function
 * `(address, family, hostname) => boolean`
 */
export type SSRFCheckAddressFunction = z.infer<typeof SSRFCheckAddressFunction>;

export const SecurityMiddlewareName = z.enum([
  'csrf',
  'hsts',
  'methodnoallow',
  'noopen',
  'nosniff',
  'csp',
  'xssProtection',
  'xframe',
  'dta',
]);
export type SecurityMiddlewareName = z.infer<typeof SecurityMiddlewareName>;

/**
 * (ctx) => boolean
 */
const IgnoreOrMatchHandler = z.function().args(z.instanceof(Context)).returns(z.boolean());
export type IgnoreOrMatchHandler = z.infer<typeof IgnoreOrMatchHandler>;

const IgnoreOrMatch = z.union([z.string(), z.instanceof(RegExp), IgnoreOrMatchHandler]);
export type IgnoreOrMatch = z.infer<typeof IgnoreOrMatch>;

const IgnoreOrMatchOption = z.union([IgnoreOrMatch, IgnoreOrMatch.array()]).optional();
export type IgnoreOrMatchOption = z.infer<typeof IgnoreOrMatchOption>;

/**
 * security options
 * @member Config#security
 */
export const SecurityConfig = z.object({
  /**
   * domain white list
   *
   * Default to `[]`
   */
  domainWhiteList: z.array(z.string()).default([]),
  /**
   * protocol white list
   *
   * Default to `[]`
   */
  protocolWhiteList: z.array(z.string()).default([]),
  /**
   * default open security middleware
   *
   * Default to `'csrf,hsts,methodnoallow,noopen,nosniff,csp,xssProtection,xframe,dta'`
   */
  defaultMiddleware: z.union([z.string(), z.array(SecurityMiddlewareName)]).default(SecurityMiddlewareName.options),
  /**
   * whether defend csrf attack
   */
  csrf: z.preprocess(
    val => {
      // transform old config, `csrf: false` to `csrf: { enable: false }`
      if (typeof val === 'boolean') {
        return { enable: val };
      }
      return val;
    },
    z
      .object({
        match: IgnoreOrMatchOption,
        ignore: IgnoreOrMatchOption,
        /**
         * Default to `true`
         */
        enable: z.boolean().default(true),
        /**
         * csrf token detect source type
         *
         * Default to `'ctoken'`
         */
        type: z.enum(['ctoken', 'referer', 'all', 'any']).default('ctoken'),
        /**
         * ignore json request
         *
         * Default to `false`
         *
         * @deprecated is not safe now, don't use it
         */
        ignoreJSON: z.boolean().default(false),
        /**
         * csrf token cookie name
         *
         * Default to `'csrfToken'`
         */
        cookieName: z.union([z.string(), z.array(z.string())]).default('csrfToken'),
        /**
         * csrf token session name
         *
         * Default to `'csrfToken'`
         */
        sessionName: z.string().default('csrfToken'),
        /**
         * csrf token request header name
         *
         * Default to `'x-csrf-token'`
         */
        headerName: z.string().default('x-csrf-token'),
        /**
         * csrf token request body field name
         *
         * Default to `'_csrf'`
         */
        bodyName: z.union([z.string(), z.array(z.string())]).default('_csrf'),
        /**
         * csrf token request query field name
         *
         * Default to `'_csrf'`
         */
        queryName: z.union([z.string(), z.array(z.string())]).default('_csrf'),
        /**
         * rotate csrf token when it is invalid
         *
         * Default to `false`
         */
        rotateWhenInvalid: z.boolean().default(false),
        /**
         * These config works when using `'ctoken'` type
         *
         * Default to `false`
         */
        useSession: z.boolean().default(false),
        /**
         * csrf token cookie domain setting,
         * can be `(ctx) => string` or `string`
         *
         * Default to `undefined`, auto set the cookie domain in the safe way
         */
        cookieDomain: z.union([z.string(), z.function().args(z.instanceof(Context)).returns(z.string())]).optional(),
        /**
         * csrf token check requests config
         */
        supportedRequests: z
          .array(CSRFSupportRequestItem)
          .default([{ path: /^\//, methods: ['POST', 'PATCH', 'DELETE', 'PUT', 'CONNECT'] }]),
        /**
         * referer or origin header white list.
         * It only works when using `'referer'` type
         *
         * Default to `[]`
         */
        refererWhiteList: z.array(z.string()).default([]),
        /**
         * csrf token cookie options
         *
         * Default to `{
         *   signed: false,
         *   httpOnly: false,
         *   overwrite: true,
         * }`
         */
        cookieOptions: z
          .object({
            signed: z.boolean(),
            httpOnly: z.boolean(),
            overwrite: z.boolean(),
          })
          .default({
            signed: false,
            httpOnly: false,
            overwrite: true,
          }),
      })
      .default({})
  ),
  /**
   * whether enable X-Frame-Options response header
   */
  xframe: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `true`
       */
      enable: z.boolean().default(true),
      /**
       * X-Frame-Options value, can be `'DENY'`, `'SAMEORIGIN'`, `'ALLOW-FROM https://example.com'`
       *
       * Default to `'SAMEORIGIN'`
       */
      value: z.string().default('SAMEORIGIN'),
    })
    .default({}),
  /**
   * whether enable Strict-Transport-Security response header
   */
  hsts: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `false`
       */
      enable: z.boolean().default(false),
      /**
       * Max age of Strict-Transport-Security in seconds
       *
       * Default to `365 * 24 * 3600`
       */
      maxAge: z.number().default(365 * 24 * 3600),
      /**
       * Whether include sub domains
       *
       * Default to `false`
       */
      includeSubdomains: z.boolean().default(false),
    })
    .default({}),
  /**
   * whether enable Http Method filter
   */
  methodnoallow: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `true`
       */
      enable: z.boolean().default(true),
    })
    .default({}),
  /**
   * whether enable IE automatically download open
   */
  noopen: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `true`
       */
      enable: z.boolean().default(true),
    })
    .default({}),
  /**
   * whether enable IE8 automatically detect mime
   */
  nosniff: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `true`
       */
      enable: z.boolean().default(true),
    })
    .default({}),
  /**
   * whether enable IE8 XSS Filter
   */
  xssProtection: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `true`
       */
      enable: z.boolean().default(true),
      /**
       * X-XSS-Protection response header value
       *
       * Default to `'1; mode=block'`
       */
      value: z.coerce.string().default('1; mode=block'),
    })
    .default({}),
  /**
   * content security policy config
   */
  csp: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `false`
       */
      enable: z.boolean().default(false),
      // https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP#csp_overview
      policy: z.record(z.union([z.string(), z.array(z.string()), z.boolean()])).default({}),
      /**
       * whether enable report only mode
       * Default to `undefined`
       */
      reportOnly: z.boolean().optional(),
      /**
       * whether support IE
       * Default to `undefined`
       */
      supportIE: z.boolean().optional(),
    })
    .default({}),
  /**
   * whether enable referrer policy
   * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Referrer-Policy
   */
  referrerPolicy: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `false`
       */
      enable: z.boolean().default(false),
      /**
       * referrer policy value
       *
       * Default to `'no-referrer-when-downgrade'`
       */
      value: z.string().default('no-referrer-when-downgrade'),
    })
    .default({}),
  /**
   * whether enable auto avoid directory traversal attack
   */
  dta: z
    .object({
      match: IgnoreOrMatchOption,
      ignore: IgnoreOrMatchOption,
      /**
       * Default to `true`
       */
      enable: z.boolean().default(true),
    })
    .default({}),
  ssrf: z
    .object({
      ipBlackList: z.array(z.string()).optional(),
      ipExceptionList: z.array(z.string()).optional(),
      hostnameExceptionList: z.array(z.string()).optional(),
      checkAddress: SSRFCheckAddressFunction.optional(),
    })
    .default({}),
  match: z.union([IgnoreOrMatch, IgnoreOrMatch.array()]).optional(),
  ignore: z.union([IgnoreOrMatch, IgnoreOrMatch.array()]).optional(),
  __protocolWhiteListSet: z.set(z.string()).optional().readonly(),
});
export type SecurityConfig = z.infer<typeof SecurityConfig>;

const SecurityHelperOnTagAttrHandler = z
  .function()
  .args(z.string(), z.string(), z.string(), z.boolean())
  .returns(z.union([z.string(), z.void()]));

/**
 * (tag: string, name: string, value: string, isWhiteAttr: boolean) => string | void
 */
export type SecurityHelperOnTagAttrHandler = z.infer<typeof SecurityHelperOnTagAttrHandler>;

export const SecurityHelperConfig = z.object({
  shtml: z
    .object({
      /**
       * tag attribute white list
       */
      whiteList: z.record(z.array(z.string())).optional(),
      /**
       * domain white list
       * @deprecated use `config.security.domainWhiteList` instead
       */
      domainWhiteList: z.array(z.string()).optional(),
      /**
       * tag attribute handler
       */
      onTagAttr: SecurityHelperOnTagAttrHandler.optional(),
    })
    .default({}),
});
export type SecurityHelperConfig = z.infer<typeof SecurityHelperConfig>;

export default {
  security: SecurityConfig.parse({}),
  helper: SecurityHelperConfig.parse({}),
};
