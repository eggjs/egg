declare module '@eggjs/core' {
  // add Request overrides types
  interface Request {
    body: any;
    get acceptJSON(): boolean;
    get query(): Record<string, string>;
    set query(obj: Record<string, string>);
    get queries(): Record<string, string[]>;
  }
}
