# Event Handling

## Overview

<div class="grid cards" markdown>

-   :material-routes: **Event Flow**

    Understanding how events flow through the system from handlers to processing.

    [:octicons-arrow-right-24: Read More](event_flow.md)

-   :material-clock-fast: **Runtime Processing**

    How events are processed synchronously in the same request context.

    [:octicons-arrow-right-24: Read More](runtime_processing.md)

-   :material-sync: **Parallel Processing**

    Configuring parallel event processing with concurrency limits.

    [:octicons-arrow-right-24: Read More](parallel_processing.md)

-   :material-tag-multiple: **Event Types**

    DomainEvent vs NotificationEvent and when to use each type.

    [:octicons-arrow-right-24: Read More](event_types.md)

-   :material-code-json: **Examples**

    Complete examples of event handling patterns.

    [:octicons-arrow-right-24: Read More](examples.md)

-   :material-lightbulb-on: **Best Practices**

    Best practices and recommendations for event handling.

    [:octicons-arrow-right-24: Read More](best_practices.md)

-   :material-backup-restore: **Fallback**

    Fallback handler when primary event handler fails or circuit breaker is open.

    [:octicons-arrow-right-24: Read More](fallback.md)

</div>

Event handlers process domain events that are emitted from command handlers. These events represent something that happened in the domain and trigger side effects like sending notifications, updating read models, or triggering other workflows.

When a command handler processes a request, it can emit domain events through the `events` property. These events are automatically collected and processed by event handlers registered in the system. **Event handlers** can in turn produce **follow-up events** via their own `events` property; these follow-ups are processed in the same pipeline (sequential BFS or parallel with semaphore), enabling multi-level event chains.

| Aspect | Description |
|--------|-------------|
| **Runtime Processing** | Events are processed synchronously in the same request context, not asynchronously |
| **Automatic Dispatch** | Events are automatically dispatched to registered handlers after command execution |
| **Event Propagation** | Handlers can return follow-up events via `events`; they are processed in the same run (BFS or parallel) |
| **Parallel Support** | Multiple events can be processed in parallel with configurable concurrency limits |
| **Side Effects** | Event handlers perform side effects without blocking the main command flow |

!!! note "Prerequisites"
    Understanding of [Request Handlers](../request_handler/index.md) and [Bootstrap](../bootstrap/index.md) is required. Events are emitted by command handlers and processed by event handlers.

!!! tip "Related Topics"
    - [Transaction Outbox](../outbox/index.md) — For reliable event delivery to message brokers
    - [Event Producing](../event_producing.md) — For publishing events to Kafka/RabbitMQ
    - [FastStream Integration](../faststream.md) — For consuming events from message brokers
