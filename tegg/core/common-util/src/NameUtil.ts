export class NameUtil {
  static getClassName(constructor: Function) {
    return constructor.name[0].toLowerCase() + constructor.name.substring(1);
  }
}
