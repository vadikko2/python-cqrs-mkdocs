# Transactional Outbox

## Table of Contents

- [Overview](#overview)
- [Why Use Transactional Outbox?](#why-use-transactional-outbox)
- [Pattern Flow](#pattern-flow)
- [Key Benefits](#key-benefits)
- [Interface: OutboxedEventRepository](#interface-outboxedeventrepository)
- [Event Status](#event-status)
- [Implementation: SqlAlchemyOutboxedEventRepository](#implementation-sqlalchemyoutboxedeventrepository)
- [Event Registration](#event-registration)
- [Event Publishing](#event-publishing)
- [Complete Example](#complete-example)
- [Best Practices](#best-practices)
- [Related Documentation](#related-documentation)

The Transactional Outbox pattern ensures reliable event publishing by storing events in a database table within the same transaction as business logic. This guarantees that events are persisted even if the system crashes before they can be published to a message broker.

## Overview

The Transactional Outbox pattern solves the problem of ensuring event delivery in distributed systems. When a command handler processes a request and generates events, those events need to be published to a message broker. However, if the system crashes between processing the command and publishing the event, the event can be lost.

The Outbox pattern solves this by:

1. **Storing events in database** — Events are saved to an outbox table in the same transaction as business logic
2. **Separate publishing process** — A background process reads from the outbox and publishes events
3. **At-least-once delivery** — Events are only removed from outbox after successful publishing

## Why Use Transactional Outbox?

### The Problem

Without the Outbox pattern, event publishing can fail:

```mermaid
sequenceDiagram
    participant Handler as Command Handler
    participant DB as Database
    participant Broker as Message Broker
    
    Handler->>DB: Process Command & Commit
    Handler->>Broker: Publish Event
    Note over Handler,Broker: ❌ System Crashes<br/>Event Lost!
```

### The Solution

With the Outbox pattern, events are safely stored:

```mermaid
sequenceDiagram
    participant Handler as Command Handler
    participant DB as Database
    participant Outbox as Outbox Table
    participant Publisher as Publisher Process
    participant Broker as Message Broker
    
    Handler->>DB: Process Command
    Handler->>Outbox: Save Event (same transaction)
    Handler->>DB: Commit Transaction
    Note over Handler,Outbox: ✅ System Crashes<br/>Event Safe in Outbox!
    
    Publisher->>Outbox: Read Events
    Publisher->>Broker: Publish Events
    Publisher->>Outbox: Update Status
```

## Pattern Flow

The Transactional Outbox pattern follows this flow:

```mermaid
sequenceDiagram
    participant Handler as Command Handler
    participant DB as Database
    participant Outbox as Outbox Table
    participant Publisher as Event Publisher
    participant Broker as Message Broker

    Handler->>DB: 1. Process Business Logic
    Handler->>Outbox: 2. Save Events (same transaction)
    Handler->>DB: 3. Commit Transaction
    Note over DB,Outbox: Events safely stored
    
    Publisher->>Outbox: 4. Read Events (batch)
    Publisher->>Broker: 5. Publish Events
    Publisher->>Outbox: 6. Update Status (PRODUCED)
    Publisher->>DB: 7. Commit Transaction
```

### Detailed Flow Diagram

```mermaid
graph TD
    A[Command Handler] -->|1. Process Command| B[Business Logic]
    B -->|2. Generate Events| C[Create Events]
    C -->|3. Save to Outbox| D[Outbox Table]
    B -->|Same Transaction| D
    D -->|4. Commit| E[Transaction Committed]
    
    E -->|Events Stored| F[Event Publisher Process]
    F -->|5. Read Batch| D
    D -->|6. Return Events| F
    F -->|7. Publish| G[Message Broker]
    G -->|8. Success| F
    F -->|9. Update Status| D
    F -->|10. Commit| E
    
    style D fill:#e1f5ff
    style E fill:#c8e6c9
    style G fill:#fff3e0
```

## Key Benefits

1. **Reliability** — Events are never lost, even if the system crashes
2. **Transactional Consistency** — Events are saved in the same transaction as business logic
3. **At-Least-Once Delivery** — Events are only removed after successful publishing
4. **Decoupling** — Publishing happens asynchronously, not blocking command processing
5. **Retry Capability** — Failed publishes can be retried automatically

## Interface: OutboxedEventRepository

The `OutboxedEventRepository` interface defines the contract for outbox implementations:

```python
from abc import ABC
from typing import Generic, List, Text
import cqrs
from cqrs.outbox.repository import EventStatus, OutboxedEvent

class OutboxedEventRepository(ABC, Generic[Session]):
    """Abstract interface for outbox event repositories."""
    
    def add(self, event: cqrs.NotificationEvent) -> None:
        """Add an event to the outbox repository."""
        pass
    
    async def get_many(
        self,
        batch_size: int = 100,
        topic: Text | None = None,
    ) -> List[OutboxedEvent]:
        """Get many events from the repository."""
        pass
    
    async def update_status(
        self,
        outboxed_event_id: int,
        new_status: EventStatus,
    ) -> None:
        """Update the event status."""
        pass
    
    async def commit(self) -> None:
        """Commit the transaction."""
        pass
    
    async def rollback(self) -> None:
        """Rollback the transaction."""
        pass
```

### Methods

#### `add(event)`

Adds an event to the outbox. The event is stored but not yet committed. Must be called within a transaction context.

**Parameters:**
- `event` — `cqrs.NotificationEvent` to store

**Example:**
```python
outbox.add(
    cqrs.NotificationEvent[UserJoinedPayload](
        event_name="user_joined",
        topic="user_events",
        payload=UserJoinedPayload(user_id="123", meeting_id="456"),
    )
)
```

#### `get_many(batch_size, topic)`

Retrieves events from the outbox in batches. Used by the publisher process.

**Parameters:**
- `batch_size` — Maximum number of events to retrieve (default: 100)
- `topic` — Optional topic filter to retrieve events for specific topic

**Returns:**
- `List[OutboxedEvent]` — List of outboxed events

**Example:**
```python
events = await outbox.get_many(batch_size=50, topic="user_events")
```

#### `update_status(outboxed_event_id, new_status)`

Updates the status of an event in the outbox. Used to mark events as produced or failed.

**Parameters:**
- `outboxed_event_id` — ID of the event in outbox
- `new_status` — New status (`EventStatus.NEW`, `EventStatus.PRODUCED`, `EventStatus.NOT_PRODUCED`)

**Example:**
```python
await outbox.update_status(event_id=1, new_status=EventStatus.PRODUCED)
```

#### `commit()`

Commits the current transaction. All events added via `add()` are persisted.

**Example:**
```python
outbox.add(event1)
outbox.add(event2)
await outbox.commit()  # Events are now persisted
```

#### `rollback()`

Rolls back the current transaction. All events added via `add()` are discarded.

**Example:**
```python
try:
    outbox.add(event1)
    await outbox.commit()
except Exception:
    await outbox.rollback()  # Event is discarded
```

## Event Status

Events in the outbox have three possible statuses:

```python
class EventStatus(StrEnum):
    NEW = "new"              # Event is new and ready to be published
    PRODUCED = "produced"    # Event has been successfully published
    NOT_PRODUCED = "not_produced"  # Event publishing failed
```

## Implementation: SqlAlchemyOutboxedEventRepository

The `python-cqrs` package includes a SQLAlchemy implementation of the outbox pattern.

### Database Schema

The outbox table has the following structure:

```sql
CREATE TABLE outbox (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    event_id UUID NOT NULL,
    event_id_bin BINARY(16) NOT NULL,
    event_status ENUM('new', 'produced', 'not_produced') NOT NULL DEFAULT 'new',
    flush_counter SMALLINT NOT NULL DEFAULT 0,
    event_name VARCHAR(255) NOT NULL,
    topic VARCHAR(255) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL,
    payload BLOB NOT NULL,
    UNIQUE KEY event_id_unique_index (event_id_bin, event_name)
);
```

### Features

- **UUID Support** — Events have unique IDs for idempotency
- **Binary Storage** — Efficient storage of UUIDs as binary
- **Status Tracking** — Tracks event publishing status
- **Compression Support** — Optional payload compression
- **Batch Processing** — Optimized queries for batch retrieval

### Usage

```python
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from cqrs import SqlAlchemyOutboxedEventRepository
from cqrs.compressors import ZlibCompressor

# Create session factory
session_factory = async_sessionmaker(
    create_async_engine(
        "mysql+asyncmy://user:password@localhost/database",
        isolation_level="REPEATABLE READ",
    )
)

# Create repository with optional compression
outbox = SqlAlchemyOutboxedEventRepository(
    session=session_factory(),
    compressor=ZlibCompressor(),  # Optional
)

# Use in command handler
class MyCommandHandler(RequestHandler[MyCommand, None]):
    def __init__(self, outbox: OutboxedEventRepository):
        self.outbox = outbox
    
    async def handle(self, request: MyCommand) -> None:
        # Business logic
        ...
        
        # Save events to outbox
        self.outbox.add(
            cqrs.NotificationEvent[MyPayload](
                event_name="my_event",
                topic="my_topic",
                payload=MyPayload(...),
            )
        )
        
        # Commit transaction
        await self.outbox.commit()
```

### Configuration

#### Table Name

By default, the table name is `outbox`. You can change it using the environment variable:

```bash
export OUTBOX_SQLA_TABLE=my_outbox_table
```

#### Compression

Compression is optional but recommended for large payloads:

```python
from cqrs.compressors import ZlibCompressor

outbox = SqlAlchemyOutboxedEventRepository(
    session=session,
    compressor=ZlibCompressor(),
)
```

## Event Registration

Events must be registered in `OutboxedEventMap` before they can be stored:

```python
import cqrs
from pydantic import BaseModel

class UserJoinedPayload(BaseModel, frozen=True):
    user_id: str
    meeting_id: str

# Register event type
cqrs.OutboxedEventMap.register(
    "user_joined",
    cqrs.NotificationEvent[UserJoinedPayload],
)
```

This registration is required for:
- Type safety when storing events
- Deserialization when reading events
- Validation of event structure

## Event Publishing

Events are published by a separate process using `EventProducer`:

```python
import asyncio
import cqrs
from cqrs.message_brokers import kafka
from cqrs.adapters import kafka as kafka_adapters

# Create message broker
broker = kafka.KafkaMessageBroker(
    producer=kafka_adapters.kafka_producer_factory(dsn="localhost:9092"),
)

# Create event producer
producer = cqrs.EventProducer(
    message_broker=broker,
    repository=outbox_repository,
)

# Publish events in batches
async def publish_events():
    async for events in producer.event_batch_generator():
        for event in events:
            await producer.send_message(event)
        await producer.repository.commit()
        await asyncio.sleep(10)  # Poll interval

asyncio.run(publish_events())
```

## Complete Example

Here's a complete example showing the outbox pattern:

```python
import asyncio
import di
import cqrs
from cqrs.requests import bootstrap
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Register events
class UserJoinedPayload(cqrs.BaseModel, frozen=True):
    user_id: str
    meeting_id: str

cqrs.OutboxedEventMap.register(
    "user_joined",
    cqrs.NotificationEvent[UserJoinedPayload],
)

# Command handler
class JoinMeetingCommand(cqrs.Request):
    user_id: str
    meeting_id: str

class JoinMeetingCommandHandler(cqrs.RequestHandler[JoinMeetingCommand, None]):
    def __init__(self, outbox: cqrs.OutboxedEventRepository):
        self.outbox = outbox
    
    @property
    def events(self) -> list[cqrs.Event]:
        return []
    
    async def handle(self, request: JoinMeetingCommand) -> None:
        # Business logic
        print(f"User {request.user_id} joined meeting {request.meeting_id}")
        
        # Save event to outbox
        self.outbox.add(
            cqrs.NotificationEvent[UserJoinedPayload](
                event_name="user_joined",
                topic="user_events",
                payload=UserJoinedPayload(
                    user_id=request.user_id,
                    meeting_id=request.meeting_id,
                ),
            )
        )
        
        # Commit transaction
        await self.outbox.commit()

# Setup DI
def setup_di():
    container = di.Container()
    session_factory = async_sessionmaker(
        create_async_engine("mysql+asyncmy://user:pass@localhost/db")
    )
    
    container.bind(
        di.bind_by_type(
            di.Dependent(
                lambda: cqrs.SqlAlchemyOutboxedEventRepository(
                    session=session_factory(),
                ),
                scope="request",
            ),
            cqrs.OutboxedEventRepository,
        )
    )
    return container

# Bootstrap
mediator = bootstrap.bootstrap(
    di_container=setup_di(),
    commands_mapper=lambda m: m.bind(JoinMeetingCommand, JoinMeetingCommandHandler),
)

# Use mediator
await mediator.send(JoinMeetingCommand(user_id="123", meeting_id="456"))
```

## Best Practices

1. **Always commit** — Always call `commit()` after adding events
2. **Use transactions** — Ensure outbox operations are in the same transaction as business logic
3. **Register events** — Register all event types in `OutboxedEventMap`
4. **Handle failures** — Implement retry logic in the publisher process
5. **Monitor status** — Track `NOT_PRODUCED` events for debugging
6. **Use compression** — Enable compression for large payloads
7. **Batch processing** — Process events in batches for efficiency

## Related Documentation

- [**Event Producing**](event_producing.md) — How to produce events without outbox
- [**Kafka Integration**](kafka.md) — Kafka message broker configuration
- [**Dependency Injection**](di.md) — How to inject outbox repository
