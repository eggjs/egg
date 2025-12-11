import { type PartialEggConfig } from 'egg';

const config: PartialEggConfig = {
  static: {
    maxAge: 31536000,
    buffer: true,
  },
};

export default config;
