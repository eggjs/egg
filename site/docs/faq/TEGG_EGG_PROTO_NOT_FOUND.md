# TEGG_EGG_PROTO_NOT_FOUND

## Problem

```bash
framework.EggPrototypeNotFound: Object foo not found in LOAD_UNIT:appPort
```

## Cause

The corresponding Proto was not found in the current Egg Module, resulting in injection failure.

## Solution

1. Ensure that the corresponding Proto is defined in the current Module.
2. Ensure that the Proto's access level is set to `AccessLevel.PUBLIC`.
3. Ensure that the Proto's name is correct.
4. Ensure that the Proto's instantiation method is correct.
5. Ensure that the Proto's instantiation name is correct.
6. Ensure that the Proto's instantiation access level is correct.
7. Ensure that the Proto's instantiation instance name is correct.

## Example

```ts
import { SingletonProto, AccessLevel } from 'egg';

@SingletonProto({
  // Ensure the Proto's access level is PUBLIC
  accessLevel: AccessLevel.PUBLIC, // [!code focus]
})
export class Foo {
  async bar(): Promise<string> {
    return 'bar';
  }
}
```
