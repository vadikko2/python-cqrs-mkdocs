# Saga Examples

## Basic Saga Example

```python
from cqrs.saga.saga import Saga
from cqrs.saga.step import SagaStepHandler, SagaStepResult
from cqrs.saga.storage.memory import MemorySagaStorage
from cqrs.saga.models import SagaContext
import dataclasses
import uuid

@dataclasses.dataclass
class OrderContext(SagaContext):
    order_id: str
    items: list[str]
    total_amount: float
    inventory_reservation_id: str | None = None
    payment_id: str | None = None

class ReserveInventoryStep(SagaStepHandler[OrderContext, Response]):
    def __init__(self, inventory_service):
        self._inventory_service = inventory_service

    async def act(self, context: OrderContext) -> SagaStepResult:
        reservation_id = await self._inventory_service.reserve_items(
            context.order_id, context.items
        )
        context.inventory_reservation_id = reservation_id
        return self._generate_step_result(Response())

    async def compensate(self, context: OrderContext) -> None:
        if context.inventory_reservation_id:
            await self._inventory_service.release_items(
                context.inventory_reservation_id
            )

# Create and execute saga
storage = MemorySagaStorage()
saga = Saga(
    steps=[ReserveInventoryStep, ProcessPaymentStep],
    container=container,
    storage=storage,
)

async with saga.transaction(context=context, saga_id=uuid.uuid4()) as transaction:
    async for step_result in transaction:
        print(f"Step completed: {step_result.step_type.__name__}")
```

**Complete example:** [`examples/saga.py`](https://github.com/vadikko2/cqrs/blob/master/examples/saga.py)

---

## Recovery Example

```python
from cqrs.saga.recovery import recover_saga

# Recover interrupted saga
saga_id = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")

try:
    await recover_saga(saga, saga_id, OrderContext)
    print("Saga recovered successfully!")
except RuntimeError:
    # Expected if saga was in COMPENSATING/FAILED state
    print("Compensation completed")
```

**Complete example:** [`examples/saga_recovery.py`](https://github.com/vadikko2/cqrs/blob/master/examples/saga_recovery.py)

---

## FastAPI SSE Integration

```python
import fastapi
import json
from cqrs.saga.saga import Saga

@app.post("/process-order")
async def process_order(request: ProcessOrderRequest):
    async def generate_sse():
        saga = Saga(steps=[...], container=container, storage=storage)
        saga_id = uuid.uuid4()
        
        yield f"data: {json.dumps({'type': 'start', 'saga_id': str(saga_id)})}\n\n"
        
        async with saga.transaction(context=context, saga_id=saga_id) as transaction:
            async for step_result in transaction:
                yield f"data: {json.dumps({'type': 'step_progress', 'step': step_result.step_type.__name__})}\n\n"
        
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    
    return fastapi.responses.StreamingResponse(
        generate_sse(), media_type="text/event-stream"
    )
```

**Complete example:** [`examples/saga_fastapi_sse.py`](https://github.com/vadikko2/cqrs/blob/master/examples/saga_fastapi_sse.py)

---

## SQLAlchemy Storage Example

```python
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from cqrs.saga.storage.sqlalchemy import SqlAlchemySagaStorage, Base

# Setup
engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def create_storage() -> SqlAlchemySagaStorage:
    return SqlAlchemySagaStorage(SessionLocal())

# Usage
storage = await create_storage()
saga = Saga(steps=[...], container=container, storage=storage)

async with saga.transaction(context=context, saga_id=uuid.uuid4()) as transaction:
    async for step_result in transaction:
        print(f"Step: {step_result.step_type.__name__}")

await storage.session.commit()
```

---

## Compensation Retry Configuration

```python
saga = Saga(
    steps=[...],
    container=container,
    storage=storage,
    compensation_retry_count=5,      # Retry up to 5 times
    compensation_retry_delay=2.0,    # Start with 2 second delay
    compensation_retry_backoff=1.5,  # Multiply delay by 1.5 each time
)
```

## Background Recovery Job

```python
import asyncio
from cqrs.saga.recovery import recover_saga

async def recovery_job():
    while True:
        incomplete_sagas = await find_incomplete_sagas()
        for saga_id in incomplete_sagas:
            try:
                await recover_saga(saga, saga_id, OrderContext)
            except RuntimeError:
                pass  # Compensation completed
        await asyncio.sleep(60)  # Scan every minute
```

## More Examples

- [Basic Saga](https://github.com/vadikko2/cqrs/blob/master/examples/saga.py)
- [Recovery](https://github.com/vadikko2/cqrs/blob/master/examples/saga_recovery.py)
- [FastAPI SSE](https://github.com/vadikko2/cqrs/blob/master/examples/saga_fastapi_sse.py)
