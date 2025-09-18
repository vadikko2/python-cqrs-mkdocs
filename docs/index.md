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

- 🚀 **Performance** — separation of commands and queries
- 🔒 **Reliability** — Transaction Outbox for guaranteed event delivery
- 🎯 **Type Safety** — full Pydantic v2 support
- 🔌 **Integrations** — FastAPI, FastStream, Kafka out of the box
- ⚡ **Simplicity** — bootstrap for quick setup

---

## Quick Start

### Installation

```bash
pip install python-cqrs
```

### Basic Example

```python
import cqrs
from cqrs.events import Event
from datetime import datetime

class CreateUserCommand(cqrs.Request): # (1)
    email: str
    name: str

class GetUserQuery(cqrs.Request):
    user_id: str

class CreateUserResponse(cqrs.Response): # (2)
    user_id: str
    email: str
    name: str

class GetUserResponse(cqrs.Response):
    user_id: str
    email: str
    name: str
    created_at: str

class UserCreatedEvent(Event): # (3)
    user_id: str
    email: str
    name: str
    created_at: datetime

class CreateUserHandler(cqrs.RequestHandler[CreateUserCommand, CreateUserResponse]): # (4)
    def __init__(self):
        self._events: list[Event] = [] # (5)
    
    @property
    def events(self) -> list[Event]:
        return self._events # (6)
    
    async def handle(self, request: CreateUserCommand) -> CreateUserResponse:
        user_id = f"user_{request.email}" # (7)
        
        self._events.append(UserCreatedEvent( # (9)
            user_id=user_id,
            email=request.email,
            name=request.name,
            created_at=datetime.utcnow()
        ))
        
        return CreateUserResponse(
            user_id=user_id,
            email=request.email,
            name=request.name
        )

class GetUserHandler(cqrs.RequestHandler[GetUserQuery, GetUserResponse]):
    @property
    def events(self) -> list[Event]:
        return [] # (8)
    
    async def handle(self, request: GetUserQuery) -> GetUserResponse:
        return GetUserResponse( # (10)
            user_id=request.user_id,
            email="user@example.com",
            name="John Doe",
            created_at="2024-01-01T00:00:00Z"
        )

class UserCreatedEventHandler(cqrs.EventHandler[UserCreatedEvent]): # (11)
    async def handle(self, event: UserCreatedEvent) -> None:
        print(f"User created: {event.name} ({event.email}) with ID: {event.user_id}") # (12)

mediator = cqrs.bootstrap.bootstrap( # (13)
    commands_mapper=lambda m: m.bind(CreateUserCommand, CreateUserHandler),
    queries_mapper=lambda m: m.bind(GetUserQuery, GetUserHandler),
    domain_events_mapper=lambda m: m.bind(UserCreatedEvent, UserCreatedEventHandler)
)

result = await mediator.send(CreateUserCommand( # (14)
    email="user@example.com",
    name="John Doe"
))

user_data = await mediator.send(GetUserQuery( # (15)
    user_id="user_user@example.com"
))
```

1. **Commands and Queries**: Commands modify system state, queries read data. Both inherit from `cqrs.Request`.

2. **Response Classes**: Response classes inherit from `cqrs.Response` and define the structure of returned data.

3. **Events**: Events inherit from `cqrs.events.Event` and represent domain events that occurred.

4. **Handlers**: **Command Handler** modifies state and can emit events. **Query Handler** reads data and typically doesn't emit events. Both must implement the `events` property

5. **Event Storage**: Command handlers store events in `_events` list to emit them after processing.

6. **Events Property**: Required by `RequestHandler` interface to access emitted events.

7. **Business Logic**: Generate unique identifiers and perform domain operations.

8. **Query Events**: Queries typically don't emit events as they only read data.

9. **Event Emission**: Command handlers emit domain events by adding them to the `_events` list.

10. **Read Model**: Query handlers fetch data from read models optimized for specific queries.

11. **Event Handler**: Event handlers process domain events and handle side effects like notifications or read model updates.

12. **Side Effects**: Event handlers handle side effects such as sending notifications, updating read models, or triggering other processes.

13. **Mediator Configuration**: Bootstrap creates the mediator with command, query, and event mappings.

14. **Usage**: Commands modify state and may emit events

15. **Usage**: Queries read data without side effects

---

## Key Features

### 🎯 CQRS Pattern

- Clear separation of commands and queries
- Independent scaling of read/write models
- Optimization for specific use cases

### 📦 Transaction Outbox

- Guaranteed event delivery
- Kafka, RabbitMQ support
- Automatic failure handling

### 🔌 Ready Integrations

- **FastAPI** — HTTP API endpoints
- **FastStream** — Kafka event processing
- **Kafka** — via aiokafka
- **Pydantic v2** — data validation

### ⚙️ Bootstrap

- Automatic DI container setup
- Command, query, and event mapping
- Ready configurations for popular frameworks

---

## Architecture

<div class="architecture-diagram">
    <div class="arch-section">
        <h4>Commands</h4>
        <p>Modify system state</p>
    </div>
    <div class="arch-arrow">→</div>
    <div class="arch-section">
        <h4>Handlers</h4>
        <p>Execute business logic</p>
    </div>
    <div class="arch-arrow">→</div>
    <div class="arch-section">
        <h4>Events</h4>
        <p>Notify about changes</p>
    </div>
    <div class="arch-arrow">→</div>
    <div class="arch-section">
        <h4>Outbox</h4>
        <p>Guaranteed delivery</p>
    </div>
</div>

---

## FastAPI Integration

```python
import fastapi
import cqrs

app = fastapi.FastAPI()

@app.post("/users")
async def create_user(
    command: CreateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(get_mediator)
):
    result = await mediator.send(command)
    return {"user_id": result.data["user_id"]}
```

## Kafka Event Processing

```python
import faststream
from faststream import kafka

@broker.subscriber("user_events")
async def handle_user_event(
    event: cqrs.NotificationEvent[UserCreatedPayload],
    mediator: cqrs.EventMediator = faststream.Depends(get_mediator)
):
    await mediator.send(event)
```

---

## Documentation

### Core Concepts

- [**Bootstrap**](bootstrap.md) — quick project setup
- [**Request Handlers**](request_handler.md) — working with commands and queries
- [**Event Handling**](event_consuming.md) — event processing
- [**Transaction Outbox**](outbox.md) — reliable event delivery

### Integrations

- [**FastAPI Integration**](fastapi.md) — HTTP API
- [**FastStream Integration**](faststream.md) — Kafka events
- [**Dependency Injection**](di.md) — dependency management
- [**Kafka Integration**](kafka.md) — Kafka configuration
- [**Event Producing**](event_producing.md) — event publishing

### Examples

- [**Examples**](examples/index.md) — practical examples and tutorials

---

## Installation

### Standard Installation

```bash
pip install python-cqrs
```

### From GitHub

```bash
pip install git+https://github.com/vadikko2/python-cqrs
```

### Using uv

```bash
uv add python-cqrs
```

---

## About

This framework is developed by the **Timeweb.Cloud** development team.

<div class="company-info">
    <p>Built with ❤️ by <a href="https://timeweb.cloud/" target="_blank" rel="noopener">Timeweb.Cloud</a> — your reliable cloud infrastructure partner.</p>
</div>
