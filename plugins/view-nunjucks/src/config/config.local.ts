import type { NunjucksConfig } from './config.default.ts';

export default {
  nunjucks: {
    cache: false,
  } as Partial<NunjucksConfig>,
};
