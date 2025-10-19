export const ProtoDescriptorType = {
  CLASS: 'CLASS',
} as const;
export type ProtoDescriptorType = (typeof ProtoDescriptorType)[keyof typeof ProtoDescriptorType];
