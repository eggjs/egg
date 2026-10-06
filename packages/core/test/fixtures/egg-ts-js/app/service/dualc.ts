// `dualc.ts` + `dualc.cjs` coexist. The `.ts` source must win; `dualc.cjs` ignored.
module.exports = class DualcService {
  static loadedFrom = 'ts';
  which() {
    return 'ts';
  }
};
