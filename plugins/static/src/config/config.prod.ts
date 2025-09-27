import { type PartialEggConfig } from 'egg';

export default {
  static: {
    maxAge: 31536000,
    buffer: true,
  },
} as PartialEggConfig;
