# Event Handling

## Table of Contents

- [Overview](#overview)
- [Event Flow](event_flow.md)
- [Runtime Processing](runtime_processing.md)
- [Parallel Processing](parallel_processing.md)
- [Event Types](event_types.md)
- [Examples](examples.md)
- [Best Practices](best_practices.md)

## Overview

Event handlers process domain events that are emitted from command handlers. These events represent something that happened in the domain and trigger side effects like sending notifications, updating read models, or triggering other workflows.

When a command handler processes a request, it can emit domain events through the `events` property. These events are automatically collected and processed by event handlers registered in the system.

| Aspect | Description |
|--------|-------------|
| **Runtime Processing** | Events are processed synchronously in the same request context, not asynchronously |
| **Automatic Dispatch** | Events are automatically dispatched to registered handlers after command execution |
| **Parallel Support** | Multiple events can be processed in parallel with configurable concurrency limits |
| **Side Effects** | Event handlers perform side effects without blocking the main command flow |

!!! note "Prerequisites"
    Understanding of [Request Handlers](../request_handler.md) and [Bootstrap](../bootstrap/index.md) is required. Events are emitted by command handlers and processed by event handlers.

!!! tip "Related Topics"
    - [Transaction Outbox](../outbox/index.md) — For reliable event delivery to message brokers
    - [Event Producing](../event_producing.md) — For publishing events to Kafka/RabbitMQ
    - [FastStream Integration](../faststream.md) — For consuming events from message brokers

## Quick Navigation

- **[Event Flow](event_flow.md)** — Understanding how events flow through the system
- **[Runtime Processing](runtime_processing.md)** — How events are processed synchronously
- **[Parallel Processing](parallel_processing.md)** — Configuring parallel event processing
- **[Event Types](event_types.md)** — DomainEvent vs NotificationEvent
- **[Examples](examples.md)** — Complete examples
- **[Best Practices](best_practices.md)** — Best practices and recommendations
