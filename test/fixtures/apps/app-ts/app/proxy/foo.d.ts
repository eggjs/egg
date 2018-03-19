declare module 'egg' {
  interface Foo {
    bar(): string;
  }

  interface IProxy {
    foo: Foo;
  }

  interface Context {
    proxy: IProxy;
  }
}