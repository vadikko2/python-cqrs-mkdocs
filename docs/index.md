<div class="hero-section">
    <img src="img.png" alt="Python CQRS" class="hero-image">
    <h1 class="hero-title">Python CQRS</h1>
    <p class="hero-subtitle">Event-Driven Architecture Framework for Distributed Systems</p>

    <div class="project-links">
        <a href="https://github.com/vadikko2/python-cqrs" class="project-link star-link" target="_blank" rel="noopener">
            <span class="star-link-icon star-link-icon-github">🐙</span>
            <span class="star-link-text">Star if cool</span>
            <span class="star-link-icon star-link-icon-star">⭐</span>
            <span class="star-link-icon star-link-icon-sparkle">✨</span>
            <span class="star-link-icon star-link-icon-sparkle">✨</span>
        </a>
        <div class="project-links-row">
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

</div>

!!! warning "Breaking Changes in v5.0.0"
    Starting with version 5.0.0, **Pydantic support will become optional**. The default implementations of `Request`, `Response`, `DomainEvent`, and `NotificationEvent` will be migrated to dataclasses-based implementations.

    See the [planned release discussion on GitHub](https://github.com/vadikko2/python-cqrs/discussions/57) for the full list of breaking changes and migration details.

---

## Core Features

<div class="grid cards" markdown>

-   :material-rocket-launch: **Bootstrap**

    Quick project setup and configuration with automatic DI container setup.

    [:octicons-arrow-right-24: Read More](bootstrap/index.md)

-   :material-code-tags: **Request Handlers**

    Handle commands and queries with full type safety and async support.

    [:octicons-arrow-right-24: Read More](request_handler.md)

-   :material-sync: **Saga Pattern**

    Orchestrated Saga for distributed transactions with automatic compensation.

    [:octicons-arrow-right-24: Read More](saga/index.md)

-   :material-bell-ring: **Event Handling**

    Process domain events with parallel processing and runtime execution.

    [:octicons-arrow-right-24: Read More](event_handler/index.md)

-   :material-database-outline: **Transaction Outbox**

    Guaranteed event delivery with at-least-once semantics.

    [:octicons-arrow-right-24: Read More](outbox/index.md)

-   :material-link-variant: **Chain of Responsibility**

    Sequential request processing with flexible handler chaining.

    [:octicons-arrow-right-24: Read More](chain_of_responsibility/index.md)

-   :material-play-circle: **Streaming**

    Incremental processing with real-time progress updates via SSE.

    [:octicons-arrow-right-24: Read More](stream_handling/index.md)

-   :material-puzzle: **Integrations**

    FastAPI and FastStream integrations out of the box.

    [:octicons-arrow-right-24: Read More](fastapi.md)

-   :material-graph: **Mermaid Diagrams**

    Visualize architecture patterns and flows with interactive Mermaid diagrams.

    [:octicons-arrow-right-24: Read More](mermaid/index.md)

</div>

---

## What is it?

**Python CQRS** is a framework for implementing the CQRS (Command Query Responsibility Segregation) pattern in Python applications. It helps separate read and write operations, improving scalability, performance, and code maintainability.

**Key Highlights:**

- :material-rocket-launch: **Performance** — Separation of commands and queries, parallel event processing
- :material-shield-check: **Reliability** — Transaction Outbox for guaranteed event delivery, Saga with compensation support and eventual consistency
- :material-check-circle: **Flexible Types** — Easy integration with any type: [Pydantic, dataclasses, msgspec, attrs, TypedDict and more](request_response_types/index.md)
- :material-puzzle: **Ready Integrations** — FastAPI and FastStream out of the box
- :material-lightning-bolt: **Simple Setup** — Bootstrap for quick configuration
- :material-application-braces: **Proven Patterns** — CQRS, Saga, Outbox and more to keep services decoupled and maintainable

---

## Project status

<div class="project-status-table-wrap" markdown="1">

| Group | Badges |
|-------|--------|
| Python version & PyPI | [![Python Versions](https://img.shields.io/pypi/pyversions/python-cqrs?logo=python&logoColor=white)](https://pypi.org/project/python-cqrs/) [![PyPI](https://img.shields.io/pypi/v/python-cqrs?label=pypi&logo=pypi)](https://pypi.org/project/python-cqrs/) |
| Downloads | [![Total downloads](https://pepy.tech/badge/python-cqrs)](https://pepy.tech/projects/python-cqrs) [![Downloads per month](https://pepy.tech/badge/python-cqrs/month)](https://pepy.tech/projects/python-cqrs) |
| Quality & CI | [![Coverage](https://img.shields.io/codecov/c/github/vadikko2/python-cqrs?logo=codecov&logoColor=white)](https://codecov.io/gh/vadikko2/python-cqrs) [![CodSpeed](https://img.shields.io/endpoint?url=https://codspeed.io/badge.json)](https://codspeed.io/vadikko2/python-cqrs?utm_source=badge) |
| Documentation & community | [![Documentation](https://img.shields.io/badge/docs-mkdocs-blue?logo=readthedocs)](https://mkdocs.python-cqrs.dev/) [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/vadikko2/python-cqrs) |

</div>

---

## Installation

Install Python CQRS using pip or uv:

**Using pip:**

```bash
pip install python-cqrs
```

**Using uv:**

```bash
uv pip install python-cqrs
```

!!! info "Requirements"
    Python 3.10+

---

## Quick Start

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
