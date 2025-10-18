import type { NunjucksConfig } from './config.default.ts';

export default (): { nunjucks: Partial<NunjucksConfig> } => {
  return {
    nunjucks: {
      cache: false,
    },
  };
};
