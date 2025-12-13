<div class="hero-section">
    <img src="img.png" alt="Python CQRS" class="hero-image">
    <h1 class="hero-title">Python CQRS</h1>
    <p class="hero-subtitle">Modern CQRS pattern implementation with Transaction Outbox support</p>

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

## What is it?

**Python CQRS** is a framework for implementing the CQRS (Command Query Responsibility Segregation) pattern in Python
applications. It helps separate read and write operations, improving scalability, performance, and code maintainability.

### Key Benefits

| Feature | Description |
|---------|-------------|
| 🚀 **Performance** | Separation of commands and queries, parallel event processing |
| 🔒 **Reliability** | Transaction Outbox for guaranteed event delivery |
| 🎯 **Type Safety** | Full Pydantic v2 support with runtime validation |
| 🔌 **Integrations** | FastAPI, FastStream, Kafka out of the box |
| ⚡ **Simplicity** | Bootstrap for quick setup and configuration |
| 📡 **Streaming** | Real-time progress updates with StreamingRequestHandler |
| 🔗 **Flexibility** | Chain of Responsibility pattern support |
| 📦 **Protobuf** | Protocol Buffers events serialization support |

---

## Quick Start

### Installation

```bash
pip install python-cqrs
```

### Basic Example

```python
import di
import cqrs
from cqrs.requests import bootstrap

# 1. Define commands, queries, and events
class CreateUserCommand(cqrs.Request):
    email: str
    name: str

class CreateUserResponse(cqrs.Response):
    user_id: str

# 2. Create handlers
class CreateUserHandler(cqrs.RequestHandler[CreateUserCommand, CreateUserResponse]):
    def __init__(self):
        self._events: list[cqrs.events.Event] = []
    
    @property
    def events(self) -> list[cqrs.events.Event]:
        return self._events
    
    async def handle(self, request: CreateUserCommand) -> CreateUserResponse:
        user_id = f"user_{request.email}"
        self._events.append(UserCreatedEvent(user_id=user_id, ...))
        return CreateUserResponse(user_id=user_id)

# 3. Bootstrap mediator
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=lambda m: m.bind(CreateUserCommand, CreateUserHandler),
)

# 4. Use mediator
result = await mediator.send(CreateUserCommand(email="user@example.com", name="John"))
```

See [Bootstrap](bootstrap/index.md) for detailed setup instructions.

---

## Architecture

The `python-cqrs` framework follows a clear architectural pattern:

<div class="architecture-diagram">
    <div class="arch-row">
        <div class="arch-section">
            <h4>Request</h4>
            <p>Commands & Queries</p>
        </div>
        <div class="arch-arrow">→</div>
        <div class="arch-section">
            <h4>RequestHandler</h4>
            <p>Execute business logic</p>
        </div>
    </div>
    <div class="arch-row">
        <div class="arch-arrow arch-event-arrow">→</div>
        <div class="arch-section">
            <h4>Event</h4>
            <p>Notify about changes</p>
        </div>
        <div class="arch-arrow">→</div>
        <div class="arch-section">
            <h4>EventHandler</h4>
            <p>Process side effects</p>
        </div>
    </div>
</div>

**Flow:**

1. **Commands/Queries** are sent to the mediator
2. **Request Handlers** execute business logic and may emit events
3. **Events** are automatically dispatched to event handlers
4. **Event Handlers** process side effects (notifications, read model updates, etc.)

---

## Key Features

### 🎯 CQRS Pattern

| Aspect | Description |
|--------|-------------|
| **Separation** | Clear separation of commands and queries |
| **Scaling** | Independent scaling of read/write models |
| **Optimization** | Optimization for specific use cases |
| **Handlers** | Support for both async and sync handlers |

### 📦 Transaction Outbox

| Feature | Benefit |
|---------|---------|
| **Guaranteed Delivery** | At-least-once semantics |
| **Broker Support** | Kafka support via aiokafka |
| **Failure Handling** | Automatic failure handling |
| **Event Types** | Support for Notification and ECST events |

### 🔌 Ready Integrations

| Integration | Description |
|-------------|-------------|
| **FastAPI** | HTTP API endpoints and SSE streaming support |
| **FastStream** | Kafka and RabbitMQ event processing |
| **Kafka** | Native support via aiokafka |
| **Pydantic v2** | Full data validation support |
| **Protobuf** | Protocol Buffers events serialization |

### ⚙️ Bootstrap

| Feature | Description |
|---------|-------------|
| **DI Container** | Automatic DI container setup |
| **Mapping** | Command, query, and event mapping |
| **Configurations** | Ready configurations for popular frameworks |
| **Multiple DI** | Works with `di` and `dependency-injector` libraries |

### 📡 Streaming Requests

| Feature | Use Case |
|---------|----------|
| **Incremental Processing** | `StreamingRequestHandler` for incremental processing |
| **Progress Updates** | Real-time progress updates via `StreamingRequestMediator` |
| **Large Batches** | Perfect for large batches and file processing |
| **SSE Integration** | Server-Sent Events integration with FastAPI |

### 🔗 Chain of Responsibility

| Feature | Description |
|---------|-------------|
| **Sequential Processing** | `CORRequestHandler` for sequential request processing |
| **Fallback Support** | Multiple handlers per request with fallback support |
| **Flexible Chaining** | Flexible handler chaining |

### ⚡ Parallel Event Processing

| Feature | Benefit |
|---------|---------|
| **Concurrency Limits** | Configurable concurrency limits for event handlers |
| **Parallel Processing** | Parallel processing of domain events |
| **Performance** | Improved performance for independent event handlers |

## Documentation

### Core Concepts

Start here to understand the fundamentals:

| # | Topic | Description |
|---|-------|-------------|
| 1 | [**Bootstrap**](bootstrap/index.md) | Quick project setup and configuration |
| 2 | [**Dependency Injection**](di.md) | Managing dependencies with DI containers |
| 3 | [**Request Handlers**](request_handler.md) | Working with commands and queries |
| 4 | [**Stream Handling**](stream_handling/index.md) | Incremental processing with streaming |
| 5 | [**Chain of Responsibility**](chain_of_responsibility/index.md) | Sequential request processing |
| 6 | [**Event Handling**](event_handler/index.md) | Processing domain events |
| 7 | [**Transaction Outbox**](outbox/index.md) | Reliable event delivery pattern |

!!! tip "Learning Path"
    Follow the numbered sequence for the best learning experience. Each concept builds on the previous one.

### Integrations

Learn how to integrate with popular frameworks:

| Integration | Description | Use Case |
|-------------|-------------|----------|
| [**FastAPI**](fastapi.md) | HTTP API endpoints and SSE streaming | Web applications |
| [**FastStream**](faststream.md) | Kafka and RabbitMQ event processing | Event-driven systems |
| [**Event Producing**](event_producing.md) | Publishing events to message brokers | Microservices communication |
| [**Protobuf**](protobuf.md) | Protocol Buffers serialization | High-performance scenarios |

---

## Installation

Choose the installation method that best fits your workflow:

| Method | Command | Use Case |
|--------|---------|----------|
| **PyPI** | `pip install python-cqrs` | Standard installation |
| **GitHub** | `pip install git+https://github.com/vadikko2/python-cqrs` | Latest development version |
| **uv** | `uv add python-cqrs` | Modern Python package manager |

!!! info "Requirements"
    - Python 3.8+
    - Pydantic v2
    - For integrations: FastAPI, FastStream, etc. (see specific integration docs)

---

## About

This framework is developed by the **Timeweb.Cloud** development team.

<div class="company-info">
    <p>Built with ❤️ by <a href="https://timeweb.cloud/" target="_blank" rel="noopener">Timeweb.Cloud</a> — your reliable cloud infrastructure partner.</p>
</div>
