export default { name: 'egg from ts' };

function foo(bar?: string) {
  return bar ?? '';
}

if (process.env.NOT_EXISTS) {
  console.log(foo());
}
