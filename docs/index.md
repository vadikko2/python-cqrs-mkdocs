<div class="hero-section">
    <img src="img.png" alt="Python CQRS" class="hero-image">
    <h1 class="hero-title">Python CQRS</h1>
    <p class="hero-subtitle">Event-Driven Architecture Framework for Distributed Systems</p>

    <div class="project-links">
        <a href="https://github.com/vadikko2/python-cqrs" class="project-link github-link" target="_blank" rel="noopener">
            <span class="icon">🐙</span>
            <span class="text">GitHub</span>
        </a>
        <a href="https://pypi.org/project/python-cqrs/" class="project-link pypi-link" target="_blank" rel="noopener">
            <span class="icon">📦</span>
            <span class="text">PyPI</span>
        </a>
        <a href="https://clickpy.clickhouse.com/dashboard/python-cqrs" class="project-link stats-link" target="_blank" rel="noopener">
            <span class="icon">📊</span>
            <span class="text">Downloads</span>
        </a>
    </div>

</div>

---

## Core Features

<div class="grid cards" markdown>

-   :material-rocket-launch: **Bootstrap**

    Quick project setup and configuration with automatic DI container setup.

    [:octicons-arrow-right-24: Get Started](bootstrap/index.md)

-   :material-code-tags: **Request Handlers**

    Handle commands and queries with full type safety and async support.

    [:octicons-arrow-right-24: Learn More](request_handler.md)

-   :material-sync: **Saga Pattern**

    Orchestrated Saga for distributed transactions with automatic compensation.

    [:octicons-arrow-right-24: Explore](saga/index.md)

-   :material-bell-ring: **Event Handling**

    Process domain events with parallel processing and runtime execution.

    [:octicons-arrow-right-24: Discover](event_handler/index.md)

-   :material-database-outline: **Transaction Outbox**

    Guaranteed event delivery with at-least-once semantics.

    [:octicons-arrow-right-24: Read More](outbox/index.md)

-   :material-link-variant: **Chain of Responsibility**

    Sequential request processing with flexible handler chaining.

    [:octicons-arrow-right-24: See Details](chain_of_responsibility/index.md)

-   :material-play-circle: **Streaming**

    Incremental processing with real-time progress updates via SSE.

    [:octicons-arrow-right-24: Learn More](stream_handling/index.md)

-   :material-puzzle: **Integrations**

    FastAPI, FastStream, Kafka, and Protobuf integrations out of the box.

    [:octicons-arrow-right-24: View Integrations](fastapi.md)

</div>

---

## What is it?

**Python CQRS** is a framework for implementing the CQRS (Command Query Responsibility Segregation) pattern in Python applications. It helps separate read and write operations, improving scalability, performance, and code maintainability.

**Key Highlights:**

- :material-rocket-launch: **Performance** — Separation of commands and queries, parallel event processing
- :material-shield-check: **Reliability** — Transaction Outbox for guaranteed event delivery
- :material-check-circle: **Type Safety** — Full Pydantic v2 support with runtime validation
- :material-puzzle: **Ready Integrations** — FastAPI, FastStream, Kafka out of the box
- :material-lightning-bolt: **Simple Setup** — Bootstrap for quick configuration

---

## Quick Start

```bash
pip install python-cqrs
```

```python
import di
import cqrs
from cqrs.requests import bootstrap

# Define command, response and handler
class CreateUserCommand(cqrs.Request):
    email: str
    name: str

class CreateUserResponse(cqrs.Response):
    user_id: str

class CreateUserHandler(cqrs.RequestHandler[CreateUserCommand, CreateUserResponse]):
    async def handle(self, request: CreateUserCommand) -> CreateUserResponse:
        # Your business logic here
        user_id = f"user_{request.email}"
        return CreateUserResponse(user_id=user_id)

# Bootstrap and use
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=lambda m: m.bind(CreateUserCommand, CreateUserHandler),
)

result = await mediator.send(CreateUserCommand(email="user@example.com", name="John"))
```

See [Bootstrap](bootstrap/index.md) for detailed setup instructions.

---

## Architecture

**Request** → **RequestHandler** → **Event** → **EventHandler**

Commands and queries flow through handlers, which execute business logic and emit events. Events are automatically dispatched to event handlers for side effects processing.

---

## Installation

```bash
pip install python-cqrs
```

!!! info "Requirements"
    Python 3.8+ • Pydantic v2

---

## Documentation

Explore the comprehensive documentation to learn more about each feature:

- **[Bootstrap](bootstrap/index.md)** — Quick project setup and configuration
- **[Request Handlers](request_handler.md)** — Working with commands and queries
- **[Saga Pattern](saga/index.md)** — Distributed transactions with automatic compensation
- **[Event Handling](event_handler/index.md)** — Processing domain events
- **[Transaction Outbox](outbox/index.md)** — Reliable event delivery
- **[Stream Handling](stream_handling/index.md)** — Incremental processing with streaming
- **[Chain of Responsibility](chain_of_responsibility/index.md)** — Sequential request processing
- **[Integrations](fastapi.md)** — FastAPI, FastStream, Kafka, Protobuf

---

## About

This framework is developed by the **Timeweb.Cloud** development team.

<div class="company-info">
    <p>Built with ❤️ by <a href="https://timeweb.cloud/" target="_blank" rel="noopener">Timeweb.Cloud</a> — your reliable cloud infrastructure partner.</p>
</div>
