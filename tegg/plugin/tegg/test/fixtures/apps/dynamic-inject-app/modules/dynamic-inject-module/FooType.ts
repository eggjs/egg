export const ContextHelloType = {
  FOO: 'FOO',
  BAR: 'BAR',
} as const;
export type ContextHelloType = (typeof ContextHelloType)[keyof typeof ContextHelloType];

export const SingletonHelloType = {
  FOO: 'FOO',
  BAR: 'BAR',
} as const;
export type SingletonHelloType = (typeof SingletonHelloType)[keyof typeof SingletonHelloType];
