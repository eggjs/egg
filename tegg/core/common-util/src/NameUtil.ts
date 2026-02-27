export class NameUtil {
  /**
   * Strip $N suffix added by compiler decorator transforms (e.g., oxc/tsdown).
   * During decorator downlevel, compilers may rename class expressions to avoid
   * name conflicts (e.g., BackgroundTaskHelper -> BackgroundTaskHelper$1).
   */
  static cleanName(name: string): string {
    return name.replace(/\$\d+$/, '');
  }

  static getClassName(constructor: Function): string {
    const name = NameUtil.cleanName(constructor.name);
    return name[0].toLowerCase() + name.substring(1);
  }
}
