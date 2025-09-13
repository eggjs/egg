export default function FooDecorator() {
  return function (target: any) {
    console.log('decorator to class: ', target);
  };
}
