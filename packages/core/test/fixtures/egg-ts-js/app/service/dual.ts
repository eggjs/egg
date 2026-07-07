// `dual.ts` + `dual.mjs` coexist (compiled output kept beside the source).
// The `.ts` source must win; `dual.mjs` must be ignored.
module.exports = class DualService {
  static loadedFrom = 'ts';
  which() {
    return 'ts';
  }
};
