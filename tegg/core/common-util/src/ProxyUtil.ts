export class ProxyUtil {
  static safeProxy<T extends object>(obj: T, getter: (obj: T, p: PropertyKey) => any) {
    return new Proxy(obj, {
      get(target: T, p: PropertyKey): any {
        // @ts-expect-error No index signature with a parameter of type 'string' was found on type 'Object'.
        if (Object.prototype[p]) {
          return Reflect.get(target, p);
        }
        return getter(target, p);
      },
    });
  }
}
