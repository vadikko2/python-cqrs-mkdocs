# Implementation

<div class="grid cards" markdown>

-   :material-home: **Back to Transactional Outbox Overview**

    Return to the Transactional Outbox overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview


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


Events in the outbox have three possible statuses:

```python
class EventStatus(StrEnum):
    NEW = "new"              # Event is new and ready to be published
    PRODUCED = "produced"    # Event has been successfully published
    NOT_PRODUCED = "not_produced"  # Event publishing failed
```


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
