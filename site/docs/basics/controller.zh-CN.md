---
title: Controller
---

## 使用场景

通常 Web 应用会采用 `MVC` 架构，其中 C 即为控制器 (Controller)，负责解析用户的输入，处理后返回相应的结果。通俗来说，当需要在应用中增加一个对外提供服务的 HTTP 等类型的接口时，使用对应的 Controller 装饰器进行定义和实现。

应用实现 HTTPController 后，客户端可通过 HTTP 协议请求服务端的控制器，控制器处理结束后响应客户端，这是一个最基础的 ”请求 - 响应“ 流程。

## 最佳实践

一般而言，Controller 不应该包含太多的业务逻辑，仅进行和协议相关的处理逻辑。

- 获取客户端传递的请求参数，例如在 HTTPController 中通过 HTTPHeader 或 HTTPBody 等等装饰器获取请求参数。
- 对请求参数进行校验和组装，确保后续业务逻辑中处理的参数符合预期。
- 调用 Service 进行业务处理。
- 对 Service 返回的结果进行转换，例如渲染为 HTML。
- 基于通信协议，组装响应数据，返回给客户端。

## 支持的类型

egg 提供了不同的 Controller 装饰器，用于实现不同类型的接口，可依据需求场景进行选择。

| Controller 装饰器                                                | 说明                                                          |
|---------------------------------------------------------------|-------------------------------------------------------------|
| [@HTTPController / @HTTPMethod](./httpcontroller)             | 用于实现 HTTP 接口<br/>函数应用中若只需返回 JSON 类型数据时，推荐使用 WebGWController |
| [@MCPController](./mcpcontroller)             | 用于实现 MCP Server |
| [@Schedule](./schedule)                                       | 用于**标准应用**实现定时任务接口                                          |
