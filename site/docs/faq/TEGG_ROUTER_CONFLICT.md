# TEGG_ROUTER_CONFLICT

## Issue

```bash
framework.RouterConflictError: register http controller GET AppController2.get failed, GET /apps/:id is conflict with exists rule /apps/:id
```

## Cause

Route conflict.

## Solution

1. Ensure route rules are unique.
2. Ensure route rules are correct.

## Example

Both AppController.get and AppController2.get define the /apps/:id route, causing a route conflict.

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
