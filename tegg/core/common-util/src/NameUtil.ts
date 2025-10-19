export class NameUtil {
  static getClassName(constructor: Function): string {
    return constructor.name[0].toLowerCase() + constructor.name.substring(1);
  }
}
