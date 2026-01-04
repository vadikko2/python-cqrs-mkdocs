# Saga Storage

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
    async def update_context(saga_id, context) -> None
    async def update_status(saga_id, status) -> None
    async def log_step(saga_id, step_name, action, status, details=None) -> None
    async def load_saga_state(saga_id) -> tuple[SagaStatus, dict]
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
status, context_data = await storage.load_saga_state(saga_id)
history = await storage.get_step_history(saga_id)
```

**Features:**

- ✅ Fast and lightweight
- ✅ No database setup required
- ❌ Not persistent (data lost on restart)

## SQLAlchemy Storage

Database-backed implementation for production.

### Database Schema

**saga_executions:**

- `id` (UUID) - Primary key
- `status` (VARCHAR) - PENDING, RUNNING, COMPENSATING, COMPLETED, FAILED
- `context` (JSON)
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

```python
import uuid
import cqrs
from cqrs.saga import bootstrap
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from cqrs.saga.storage.sqlalchemy import SqlAlchemySagaStorage, Base

# Setup
engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Initialize tables (run once)
async with engine.begin() as conn:
    await conn.run_sync(Base.metadata.create_all)

# Create storage
async def create_storage() -> SqlAlchemySagaStorage:
    return SqlAlchemySagaStorage(SessionLocal())

# Usage
storage = await create_storage()

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

async for step_result in mediator.stream(context, saga_id=saga_id):
    print(f"Step: {step_result.step_type.__name__}")

await storage.session.commit()
```

## Choosing Storage

**Memory Storage:**

- ✅ Unit tests, development
- ❌ Not persistent

**SQLAlchemy Storage:**

- ✅ Production, multi-process
- ✅ Recovery after restarts
- ✅ Audit trail

## Best Practices

1. **Use persistent storage in production** — Memory storage loses data on restart
2. **Create indexes** — Index `saga_id` and `created_at` for better performance
3. **Handle session lifecycle** — Commit and close SQLAlchemy sessions properly
4. **Monitor storage size** — Archive old saga logs periodically
