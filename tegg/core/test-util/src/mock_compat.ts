// Compatibility shim for node:test mock API.
// Bun doesn't implement mock.method / mock.fn / mock.reset,
// so we provide a lightweight polyfill when running on Bun.

interface MockContext {
  method<T extends object>(obj: T, key: keyof T, impl: (...args: any[]) => any): void;
  fn(impl?: (...args: any[]) => any): (...args: any[]) => any;
  reset(): void;
}

let mockCompat: MockContext;

if (process.versions.bun) {
  const originals: Array<{ obj: any; key: string | symbol; original: any }> = [];

  mockCompat = {
    method<T extends object>(obj: T, key: keyof T, impl: (...args: any[]) => any): void {
      originals.push({ obj, key, original: obj[key] });
      (obj as any)[key] = impl;
    },
    fn(impl?: (...args: any[]) => any): (...args: any[]) => any {
      const calls: any[][] = [];
      const mockFn = (...args: any[]) => {
        calls.push(args);
        return impl?.(...args);
      };
      (mockFn as any).mock = { calls };
      return mockFn;
    },
    reset(): void {
      for (const { obj, key, original } of originals) {
        obj[key] = original;
      }
      originals.length = 0;
    },
  };
} else {
  // Use the real node:test mock on Node.js
  // Dynamic import to avoid Bun trying to resolve it
  const nodeTest = await import('node:test');
  mockCompat = nodeTest.mock as unknown as MockContext;
}

export { mockCompat as mock };
