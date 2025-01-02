declare module '@eggjs/core' {
  // add Response overrides types
  interface Response {
    get realStatus(): number;
    set realStatus(status: number);
  }
}
