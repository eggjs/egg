import type { PartialEggConfig } from "../lib/types.ts";

export default {
  logger: {
    consoleLevel: "WARN",
    // disable buffer for unittest
    buffer: false,
  },
} as PartialEggConfig;
