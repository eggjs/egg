export interface NunjucksConfig {
  /**
   * Controls if output with dangerous characters are escaped automatically
   * @default true
   */
  autoescape: boolean;
  /**
   * Throw errors when outputting a null/undefined value
   * @default false
   */
  throwOnUndefined: boolean;
  /**
   * Automatically remove trailing newlines from a block/tag
   * @default false
   */
  trimBlocks: boolean;
  /**
   * Automatically remove leading whitespace from a block/tag
   * @default false
   */
  lstripBlocks: boolean;
  /**
   * Use a cache and recompile templates each time. false in local env.
   * @default true
   */
  cache: boolean;
  /**
   * Internal property set by engine, do not set directly
   * @internal
   */
  noCache?: boolean;
}

export default {
  nunjucks: {
    autoescape: true,
    throwOnUndefined: false,
    trimBlocks: false,
    lstripBlocks: false,
    cache: true,
  } as NunjucksConfig,
};
