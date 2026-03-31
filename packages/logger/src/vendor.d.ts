declare module 'circular-json-for-egg' {
  const circularJSON: {
    stringify(obj: unknown, replacer?: (key: string, value: unknown) => unknown, space?: string | number): string;
    parse(text: string): unknown;
  };
  export default circularJSON;
}
