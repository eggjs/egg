# TEGG_EGG_PROTO_NOT_FOUND

## 问题

```bash
framework.EggPrototypeNotFound: Object foo not found in LOAD_UNIT:appPort
```

## 原因

未在当前 Egg Module 中找到对应的 Proto，导致注入失败。

## 解决方法

1. 确保在当前 Module 中定义了对应的 Proto。
2. 确保 Proto 的访问级别为 `AccessLevel.PUBLIC`。
3. 确保 Proto 的名称正确。
4. 确保 Proto 的实例化方式正确。
5. 确保 Proto 的实例化名称正确。
6. 确保 Proto 的实例化访问级别正确。
7. 确保 Proto 的实例化实例化名称正确。

## 示例

```ts
import { SingletonProto, AccessLevel } from 'egg';

@SingletonProto({
  // 确保 Proto 的访问级别为 PUBLIC
  accessLevel: AccessLevel.PUBLIC,
})
export class Foo {
  async bar(): Promise<string> {
    return 'bar';
  }
}
```
