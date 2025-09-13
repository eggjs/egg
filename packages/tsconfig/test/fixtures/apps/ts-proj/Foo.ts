import FooDecorator from './FooDecorator.ts';

@FooDecorator()
export class Foo {
  demoError() {
    try {
    } catch (err) {
      if (err instanceof TypeError) {
        console.log('type error');
      }
    }
  }
}
