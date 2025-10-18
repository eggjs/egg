import '@eggjs/tegg-plugin/types';
import './app.ts';

import { type AttributeOptions } from '@eggjs/tegg-orm-decorator';
import type { DataType } from './lib/types.ts';

declare module '@eggjs/tegg-orm-decorator' {
  // @ts-expect-error: DataType is not defined in tegg-orm-decorator
  export function Attribute(
    dataType: DataType,
    options?: AttributeOptions
  ): (target: any, propertyKey: PropertyKey) => void;
}
