# MessageController 开发指南

## 常见错误

| 错误写法 | 正确写法 | 说明 |
|---------|---------|------|
| `from 'egg'` | `from '@eggjs/tegg'` | 所有装饰器来自 `@eggjs/tegg` |
| 多个 `@MessageMethod` | 一个 `@MessageMethod` | 一个 MessageController 只能有一个处理方法 |
| msgbroker 缺少 eventCode | 必须指定 eventCode | msgbroker 类型必须同时指定 topic + eventCode + group |

---

## 文件约定

### 文件位置与命名

MessageController 放在 module 的 `controller/` 目录下，命名规则为 `{Name}MessageController.ts`：

```
app/module-name/
├── controller/
│   ├── OrderMessageController.ts    ← 消息控制器
│   └── OrderHTTPController.ts       ← 同模块可共存 HTTP 控制器
└── service/
    └── OrderService.ts
```

---

## 场景决策树

```
需要订阅什么类型的消息？

├─ sofamq / sofamqx 消息
│  └─ → @MessageController({ type: MessageType.SOFAMQ, topic, group })
│     └─ 可选：tags 过滤
│
├─ msgbroker 消息（仅函数应用）
│  └─ → @MessageController({ type: MessageType.MSGBROKER, topic, eventCode, group })
│
└─ 需要获取消息元数据（id 等）
   └─ → @MessageMethod() 第二个参数 MessageRequest
```

---

## 端到端完整示例

### SofaMQ 消息订阅

```typescript
import { Inject, Logger, MessageController, MessageMethod, MessageType } from '@eggjs/tegg';

interface OrderPayload {
  orderId: string;
  status: string;
}

@MessageController({
  type: MessageType.SOFAMQ,
  topic: 'TP_ORDER_STATUS',
  group: 'GID_ORDER_CONSUMER',
  // tags: ['created', 'paid'],  // 可选：按 tag 过滤
})
export class OrderMessageController {
  @Inject()
  private readonly logger: Logger;

  @MessageMethod()
  async handle(data: OrderPayload): Promise<void> {
    this.logger.info('receive order message', data);
  }
}
```

### MsgBroker 消息订阅（函数应用）

```typescript
import { Inject, Logger, MessageController, MessageMethod, MessageType } from '@eggjs/tegg';

@MessageController({
  type: MessageType.MSGBROKER,
  topic: 'TP_EVENT_TOPIC',
  eventCode: 'EC_USER_REGISTER',
  group: 'S_myapp_service',
})
export class UserEventMessageController {
  @Inject()
  private readonly logger: Logger;

  @MessageMethod()
  async handle(data: object): Promise<void> {
    this.logger.info('receive user event', data);
  }
}
```

### 获取消息元数据

```typescript
import { Inject, Logger, MessageController, MessageMethod, MessageRequest, MessageType } from '@eggjs/tegg';

@MessageController({
  type: MessageType.SOFAMQ,
  topic: 'TP_SOME_TOPIC',
  group: 'GID_SOME_GROUP',
})
export class MetadataMessageController {
  @Inject()
  private readonly logger: Logger;

  @MessageMethod()
  async handle(data: object, request: MessageRequest): Promise<void> {
    this.logger.info('message id: %s, payload: %j', request.id, data);
    // 更多元数据：request.metadata
  }
}
```

---

## 参数说明

### 通用参数

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | `MessageType` | 是 | 消息类型：SOFAMQ / SOFAMQX / MSGBROKER |
| `topic` | `string` | 是 | 消息 topic |
| `group` | `string` | 是 | 订阅方 group（sofamq: GID_xxx, msgbroker: S_xxx_service） |
| `eventCode` | `string` | msgbroker 必填 | msgbroker 事件码 |
| `tags` | `string[]` | 否 | sofamq/sofamqx 按 tag 过滤 |

### 函数应用专属参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `timeout` | `number` | 消息超时时间，超时后消息中心重新投递 |
| `tps` | `number` | 消息限流 TPS |

### 标准应用专属参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `ldcSubmode` | `'LOCAL' \| 'GZONE' \| 'RZONE' \| 'CZONE'` | sofamq 订阅 zone，默认 LOCAL |
| `endpoint` | `string` | sofamqx 必填，站点端点 |
| `concurrent` | `string` | 并发数，默认 20（注意：以 group 维度生效） |

---

## 装饰器参考

| 装饰器 | 用途 | 常用参数 |
|--------|------|----------|
| `@MessageController()` | 声明消息控制器 | `{ type, topic, group, eventCode?, tags? }` |
| `@MessageMethod()` | 声明消息处理方法 | - |
| `@Inject()` | 注入 Service | - |

**注意**：
- 一个 `@MessageController` 只能有一个 `@MessageMethod`
- 标准应用暂不支持订阅 msgbroker 消息
- 函数应用中 sofamq/sofamqx 消息暂无法获取元数据
