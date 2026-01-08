# Saga Storage

<div class="grid cards" markdown>

-   :material-home: **Back to Saga Overview**

    Return to the Saga Pattern overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

Storage persists saga state and execution history, enabling recovery of interrupted sagas and ensuring eventual consistency.

## Overview

Two storage implementations:

| Storage Type | Use Case | Persistence |
|--------------|----------|------------|
| **MemorySagaStorage** | Testing, development | In-memory (not persistent) |
| **SqlAlchemySagaStorage** | Production | Database (persistent) |

## Storage Interface

```python
class ISagaStorage(abc.ABC):
    async def create_saga(saga_id, name, context) -> None
    async def update_context(saga_id, context, current_version: int | None = None) -> None
    async def update_status(saga_id, status) -> None
    async def log_step(saga_id, step_name, action, status, details=None) -> None
    async def load_saga_state(saga_id, *, read_for_update: bool = False) -> tuple[SagaStatus, dict, int]
    async def get_step_history(saga_id) -> list[SagaLogEntry]
```

## Memory Storage

In-memory implementation for testing and development.

```python
import cqrs
from cqrs.saga import bootstrap
from cqrs.saga.storage.memory import MemorySagaStorage

storage = MemorySagaStorage()

# Register saga in SagaMap
def saga_mapper(mapper: cqrs.SagaMap) -> None:
    mapper.bind(OrderContext, OrderSaga)

# Create saga mediator using bootstrap
mediator = bootstrap.bootstrap(
    di_container=di_container,
    sagas_mapper=saga_mapper,
    saga_storage=storage,
)

# Access storage data
status, context_data, version = await storage.load_saga_state(saga_id)
history = await storage.get_step_history(saga_id)
```

**Features:**

- ✅ Fast and lightweight
- ✅ No database setup required
- ❌ Not persistent (data lost on restart)

## SQLAlchemy Storage

Database-backed implementation for production. It uses a session factory to manage transactions internally, ensuring that every step is committed immediately ("checkpointing").

### Database Schema

**saga_executions:**

- `id` (UUID) - Primary key
- `status` (VARCHAR) - PENDING, RUNNING, COMPENSATING, COMPLETED, FAILED
- `context` (JSON)
- `version` (INTEGER) - Optimistic locking version (default: 1)
- `created_at`, `updated_at` (TIMESTAMP)

**saga_logs:**

- `id` (BIGSERIAL) - Primary key
- `saga_id` (UUID) - Foreign key
- `step_name` (VARCHAR)
- `action` (VARCHAR) - "act" or "compensate"
- `status` (VARCHAR) - STARTED, COMPLETED, FAILED
- `details` (TEXT)
- `created_at` (TIMESTAMP)

**Indexes:** `saga_id`, `created_at`

### Usage

The storage requires an `async_sessionmaker` to create short-lived sessions for each operation.

```python
import uuid
import cqrs
from cqrs.saga import bootstrap
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from cqrs.saga.storage.sqlalchemy import SqlAlchemySagaStorage, Base

# Setup Engine with connection pool
engine = create_async_engine(
    "postgresql+asyncpg://user:pass@localhost/db",
    pool_size=20,
    max_overflow=10,
)

# Create session factory (factory, NOT session instance)
session_factory = async_sessionmaker(engine, expire_on_commit=False)

# Initialize tables (run once)
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)

# Initialize storage with session FACTORY
storage = SqlAlchemySagaStorage(session_factory)

# Register saga in SagaMap
def saga_mapper(mapper: cqrs.SagaMap) -> None:
    mapper.bind(OrderContext, OrderSaga)

# Create saga mediator using bootstrap
mediator = bootstrap.bootstrap(
    di_container=di_container,
    sagas_mapper=saga_mapper,
    saga_storage=storage,
)

# Execute saga
context = OrderContext(...)
saga_id = uuid.uuid4()

# The storage will automatically commit each step to the database
async for step_result in mediator.stream(context, saga_id=saga_id):
    print(f"Step: {step_result.step_type.__name__}")
```

### Transaction Management

**SqlAlchemySagaStorage** handles transactions automatically:

1.  Each method (`create_saga`, `log_step`, etc.) opens a new session.
2.  The operation is performed.
3.  `session.commit()` is called immediately.
4.  The session is closed.

This design ensures:

- **Crash Safety:** Even if the application crashes mid-saga, all completed steps are safely persisted.
- **Connection Efficiency:** Connections are returned to the pool immediately after each operation.
- **Isolation:** Saga storage operations don't interfere with your business logic transactions.

### Concurrency Control

The storage implementation provides two mechanisms to handle concurrency in distributed environments:

#### 1. Optimistic Locking (Versioning)

To prevent "lost updates" when multiple steps might update the context simultaneously (though sagas typically execute sequentially), the `version` column is used.

- `update_context` accepts an optional `current_version`.
- If provided, the storage checks if `version == current_version`.
- If matched, it updates the context and increments the version (`version + 1`).
- If not matched, it raises `SagaConcurrencyError`, indicating the state was modified by another process.

#### 2. Row Locking (Recovery Safety)

When recovering a saga (e.g., after a crash), it is critical that only one worker picks up the saga to avoid duplicate execution.

- `load_saga_state(..., read_for_update=True)` uses `SELECT ... FOR UPDATE` (in SQL databases).
- This acquires a row-level lock on the saga execution record.
- Other workers attempting to lock the same saga will wait or fail, ensuring exclusive access during the recovery process.

## Choosing Storage

**Memory Storage:**

- ✅ Unit tests, development
- ❌ Not persistent

**SQLAlchemy Storage:**

- ✅ Production, multi-process
- ✅ Recovery after restarts
- ✅ Audit trail
- ✅ Robust transaction management

## Best Practices

1.  **Use persistent storage in production** — Memory storage loses data on restart
2.  **Configure Connection Pool** — Set appropriate `pool_size` and `max_overflow` for your load.
3.  **Create indexes** — Index `saga_id` and `created_at` for better performance
4.  **Monitor storage size** — Archive old saga logs periodically
