# Bootstrap

## Overview

<div class="grid cards" markdown>

-   :material-code-tags: **Request Mediator**

    Standard mediator for commands and queries with automatic handler resolution.

    [:octicons-arrow-right-24: Read More](request_mediator.md)

-   :material-play-circle: **Streaming Request Mediator**

    For incremental processing and Server-Sent Events (SSE) support.

    [:octicons-arrow-right-24: Read More](streaming_mediator.md)

-   :material-bell-ring: **Event Mediator**

    For processing events from message brokers like Kafka and RabbitMQ.

    [:octicons-arrow-right-24: Read More](event_mediator.md)

-   :material-sitemap: **Saga Mediator**

    Orchestrated sagas with step streaming, storage, and recovery.

    [:octicons-arrow-right-24: Read More](saga_mediator.md)

-   :material-message-processing: **Message Brokers**

    Configure Kafka, RabbitMQ, and custom brokers for event publishing.

    [:octicons-arrow-right-24: Read More](message_brokers.md)

-   :material-filter-variant: **Middlewares**

    Request interception and modification with custom middleware support.

    [:octicons-arrow-right-24: Read More](middlewares.md)

-   :material-puzzle: **DI Containers**

    Dependency injection configuration and container setup.

    [:octicons-arrow-right-24: Read More](di_containers.md)

-   :material-cog: **Advanced Configuration**

    Combining all options and manual setup for complex scenarios.

    [:octicons-arrow-right-24: Read More](advanced.md)

</div>

The `bootstrap` utilities simplify the initial configuration of your CQRS application. They automatically set up:

- **Dependency Injection Container** — Resolves handlers and their dependencies (see [Dependency Injection](../di.md))
- **Request Mapping** — Maps commands and queries to their handlers (see [Request Handlers](../request_handler.md))
- **Event Mapping** — Maps domain events to their handlers (see [Event Handling](../event_handler/index.md))
- **Saga Mapping** — Maps saga context types to saga classes (see [Saga Pattern](../saga/index.md))
- **Message Broker** — Configures event publishing (see [Event Producing](../event_producing.md))
- **Middlewares** — Adds logging and custom middlewares
- **Event Processing** — Configures parallel event processing

!!! tip "Getting Started"
    If you're new to `python-cqrs`, start here! Bootstrap is the foundation for all other features. After configuring bootstrap, proceed to [Request Handlers](../request_handler.md) to learn how to create command and query handlers.

!!! note "Navigation"
    Use the navigation menu on the left to explore different mediator types and configuration options. Each section covers a specific aspect of bootstrap configuration.

## Mediator Types

The `python-cqrs` package provides four types of mediators:

| Mediator Type | Use Case | Bootstrap Function |
|---------------|----------|-------------------|
| **`RequestMediator`** | Standard commands and queries | `cqrs.requests.bootstrap.bootstrap()` |
| **`StreamingRequestMediator`** | Streaming requests with incremental results | `cqrs.requests.bootstrap.bootstrap_streaming()` |
| **`EventMediator`** | Processing events from message brokers | `cqrs.events.bootstrap.bootstrap()` |
| **`SagaMediator`** | Orchestrated sagas with step streaming and recovery | `cqrs.saga.bootstrap.bootstrap()` |

!!! note "Mediator Comparison"
    Each mediator type has its own bootstrap function and configuration options. Choose based on your use case:
    
    - **RequestMediator**: Most common, handles standard CQRS operations
    - **StreamingRequestMediator**: For real-time progress updates (SSE, WebSockets)
    - **EventMediator**: For consuming events from Kafka/RabbitMQ
    - **SagaMediator**: For distributed transactions with steps and compensation

<details>
<summary><strong>When to use each mediator?</strong></summary>

<ul>
<li><strong>RequestMediator</strong>: Use for standard HTTP API endpoints (GET, POST, PUT, DELETE)</li>
<li><strong>StreamingRequestMediator</strong>: Use when you need to stream results back to clients (file processing, batch operations)</li>
<li><strong>EventMediator</strong>: Use in FastStream consumers to process events from message brokers</li>
<li><strong>SagaMediator</strong>: Use when coordinating multiple steps across services with automatic compensation on failure</li>
</ul>

</details>

## Quick Navigation

- **[Request Mediator](request_mediator.md)** — Standard mediator for commands and queries
- **[Streaming Request Mediator](streaming_mediator.md)** — For incremental processing and SSE
- **[Event Mediator](event_mediator.md)** — For processing events from message brokers
- **[Saga Mediator](saga_mediator.md)** — Orchestrated sagas with storage and recovery
- **[Message Brokers](message_brokers.md)** — Kafka, RabbitMQ, and custom brokers
- **[Middlewares](middlewares.md)** — Request interception and modification
- **[DI Containers](di_containers.md)** — Dependency injection configuration
- **[Advanced Configuration](advanced.md)** — Combining all options and manual setup
