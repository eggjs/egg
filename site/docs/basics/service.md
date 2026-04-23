---
title: Service
order: 8
---

# Service

> ⚠️ **Translation in Progress**: This page is being translated. For now, please refer to the [Chinese version](/zh-CN/basics/service).

Service is an abstraction layer for encapsulating business logic in complex business scenarios. It provides the following advantages:

- Keeps Controller logic simpler
- Maintains business logic independence - Services can be reused by multiple Controllers
- Separates logic from presentation, making it easier to write test cases

## Usage Scenarios

- Data processing: When information needs to be retrieved from a database and calculated before displaying to users
- Third-party service calls: Such as fetching GitHub information

## Defining a Service

```js
// app/service/user.js
const Service = require('egg').Service;

class UserService extends Service {
  async find(uid) {
    const user = await this.ctx.db.query('select * from user where uid = ?', uid);
    return user;
  }
}

module.exports = UserService;
```

## Properties

Each Service instance has access to:

- `this.ctx`: Current request [Context](./extend.md#context) object
- `this.app`: Current [Application](./extend.md#application) object
- `this.service`: Access to other Services
- `this.config`: Application [configuration](./config.md)
- `this.logger`: Logger object for debugging

For more details, please refer to the [Chinese documentation](/zh-CN/basics/service).
