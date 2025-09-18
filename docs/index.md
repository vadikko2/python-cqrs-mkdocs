<div class="hero-section">
    <img src="img.png" alt="Python CQRS" class="hero-image">
    <h1 class="hero-title">Python CQRS</h1>
    <p class="hero-subtitle">Modern CQRS pattern implementation with Transaction Outbox support</p>
</div>

---

## What is it?

**Python CQRS** is a framework for implementing the CQRS (Command Query Responsibility Segregation) pattern in Python applications. It helps separate read and write operations, improving scalability, performance, and code maintainability.

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

# 1. Define a command
class CreateUserCommand(cqrs.Request):
    email: str
    name: str

# 2. Create a handler
class CreateUserHandler(cqrs.RequestHandler[CreateUserCommand, cqrs.Response]):
    async def handle(self, request: CreateUserCommand) -> cqrs.Response:
        # Your business logic
        user_id = f"user_{request.email}"
        
        # Emit an event
        self._events.append(UserCreatedEvent(
            user_id=user_id,
            email=request.email,
            name=request.name
        ))
        
        return cqrs.Response(data={"user_id": user_id})

# 3. Configure the mediator
mediator = cqrs.bootstrap.bootstrap(
    commands_mapper=lambda m: m.bind(CreateUserCommand, CreateUserHandler)
)

# 4. Use it
result = await mediator.send(CreateUserCommand(
    email="user@example.com",
    name="John Doe"
))
```

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
