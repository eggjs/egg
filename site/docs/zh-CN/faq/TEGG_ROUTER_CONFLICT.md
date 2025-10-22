# TEGG_ROUTER_CONFLICT

## 问题

```bash
framework.RouterConflictError: register http controller GET AppController2.get failed, GET /apps/:id is conflict with exists rule /apps/:id
```

## 原因

路由冲突。

## 解决方法

1. 确保路由规则唯一。
2. 确保路由规则正确。

## 示例

AppController.get 和 AppController2.get 都定义了 /apps/:id 路由，导致路由冲突。

```ts
@Controller('/apps') // [!code focus]
export class AppController {
  @Get('/:id') // [!code focus]
  async get(@Param('id') id: string) {
    return this.app.apps.get(id);
  }
}
```

```ts
@Controller('/apps') // [!code focus]
export class AppController2 {
  @Get('/:id') // [!code focus]
  async get(@Param('id') id: string) {
    return this.app.apps.get(id);
  }
}
```
