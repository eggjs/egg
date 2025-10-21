# Controller

## Use Cases

Typically, web applications adopt the `MVC` architecture, where `C` stands for Controller, which is responsible for parsing user input, processing it, and returning the corresponding result.

In simple terms, when you need to add an interface that provides services such as HTTP to the application, use the corresponding Controller decorator to define and implement it.

After implementing an HTTPController, clients can request the server's controller via HTTP protocol. After the controller completes processing, it responds to the client. This is the most basic "request-response" flow.

## Best Practices

Generally speaking, Controllers should not contain too much business logic and should only handle protocol-related processing.

- Get request parameters passed by the client, such as using decorators like HTTPHeader or HTTPBody in HTTPController to obtain request parameters.
- Validate and assemble request parameters to ensure that parameters processed in subsequent business logic meet expectations.
- Call Service for business processing.
- Transform the results returned by Service, such as rendering to HTML.
- Based on the communication protocol, assemble response data and return it to the client.

## Supported Types

Egg provides different Controller decorators for implementing different types of interfaces, which can be selected based on requirements.

| Controller Decorator                                 | Description                                             |
| ---------------------------------------------------- | ------------------------------------------------------- |
| [@HTTPController / @HTTPMethod](./httpcontroller.md) | Used to implement HTTP interfaces                       |
| [@MCPController](./mcpcontroller.md)                 | Used to implement MCP Server                            |
| [@Schedule](./schedule.md)                           | Used for **standard apps** to implement scheduled tasks |
