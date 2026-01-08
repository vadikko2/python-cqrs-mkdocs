# Saga Examples

## Basic Saga Example

```python
import dataclasses
import uuid
import di

import cqrs
from cqrs.saga import bootstrap
from cqrs.saga.saga import Saga
from cqrs.saga.step import SagaStepHandler, SagaStepResult
from cqrs.saga.storage.memory import MemorySagaStorage
from cqrs.saga.models import SagaContext
from cqrs.response import Response

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

# Define saga class with steps
class OrderSaga(Saga[OrderContext]):
    steps = [ReserveInventoryStep, ProcessPaymentStep]

# Setup DI container
di_container = di.Container()
# ... register services ...

# Create saga storage
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

# Execute saga
context = OrderContext(order_id="123", items=["item_1"], total_amount=100.0)
saga_id = uuid.uuid4()

async for step_result in mediator.stream(context, saga_id=saga_id):
    print(f"Step completed: {step_result.step_type.__name__}")
```

**Complete example:** [`examples/saga.py`](https://github.com/vadikko2/cqrs/blob/master/examples/saga.py)

---

## Recovery Example

```python
from cqrs.saga.recovery import recover_saga

# Get saga instance (or keep reference to saga class)
saga = OrderSaga()

# Recover interrupted saga
saga_id = uuid.UUID("550e8400-e29b-41d4-a716-446655440000")

try:
    await recover_saga(
        saga=saga,
        saga_id=saga_id,
        context_builder=OrderContext,
        container=di_container,  # Same container used in bootstrap
        storage=storage,
    )
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
import uuid
from cqrs.saga import bootstrap

def mediator_factory() -> cqrs.SagaMediator:
    """Create saga mediator using bootstrap."""
    return bootstrap.bootstrap(
        di_container=di_container,
        sagas_mapper=saga_mapper,
        saga_storage=storage,
    )

@app.post("/process-order")
async def process_order(
    request: ProcessOrderRequest,
    mediator: cqrs.SagaMediator = fastapi.Depends(mediator_factory),
):
    async def generate_sse():
        saga_id = uuid.uuid4()
        context = OrderContext(...)
        
        yield f"data: {json.dumps({'type': 'start', 'saga_id': str(saga_id)})}\n\n"
        
        async for step_result in mediator.stream(context, saga_id=saga_id):
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
from cqrs.saga import bootstrap

# Setup
engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

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

---

## Compensation Retry Configuration

Compensation retry configuration is handled at the transaction level. When using `SagaMediator`, retry settings can be configured when creating the saga transaction. However, the recommended approach is to configure retry settings in your saga class or use the default settings.

For advanced retry configuration, you can access the transaction directly:

```python
# Note: Compensation retry is configured at the SagaTransaction level
# When using mediator.stream(), default retry settings are used
# For custom retry configuration, you may need to access the transaction directly
```

## Background Recovery Job

```python
import asyncio
from cqrs.saga.recovery import recover_saga

async def recovery_job():
    saga = OrderSaga()  # Get saga instance
    while True:
        incomplete_sagas = await find_incomplete_sagas()
        for saga_id in incomplete_sagas:
            try:
                await recover_saga(
                    saga=saga,
                    saga_id=saga_id,
                    context_builder=OrderContext,
                    container=di_container,
                    storage=storage,
                )
            except RuntimeError:
                pass  # Compensation completed
        await asyncio.sleep(60)  # Scan every minute
```

## Fallback Pattern Example

```python
import dataclasses
import uuid
import di
from di import dependent

import cqrs
from cqrs.saga import bootstrap
from cqrs.saga.fallback import Fallback
from cqrs.adapters.circuit_breaker import AioBreakerAdapter
from cqrs.saga.saga import Saga
from cqrs.saga.step import SagaStepHandler, SagaStepResult
from cqrs.saga.storage.memory import MemorySagaStorage
from cqrs.saga.models import SagaContext
from cqrs.response import Response

@dataclasses.dataclass
class OrderContext(SagaContext):
    order_id: str
    reservation_id: str | None = None

class ReserveInventoryResponse(Response):
    reservation_id: str
    source: str

class PrimaryStep(SagaStepHandler[OrderContext, ReserveInventoryResponse]):
    async def act(self, context: OrderContext) -> SagaStepResult[OrderContext, ReserveInventoryResponse]:
        # Primary step that may fail
        raise RuntimeError("Service unavailable")

class FallbackStep(SagaStepHandler[OrderContext, ReserveInventoryResponse]):
    async def act(self, context: OrderContext) -> SagaStepResult[OrderContext, ReserveInventoryResponse]:
        # Fallback step executes when primary fails
        reservation_id = f"fallback_reservation_{context.order_id}"
        context.reservation_id = reservation_id
        return self._generate_step_result(
            ReserveInventoryResponse(reservation_id=reservation_id, source="fallback")
        )

class OrderSaga(Saga[OrderContext]):
    steps = [
        Fallback(
            step=PrimaryStep,
            fallback=FallbackStep,
            circuit_breaker=AioBreakerAdapter(
                fail_max=2,
                timeout_duration=60,
            ),
        ),
    ]

# Setup
di_container = di.Container()
storage = MemorySagaStorage()

def saga_mapper(mapper: cqrs.SagaMap) -> None:
    mapper.bind(OrderContext, OrderSaga)

mediator = bootstrap.bootstrap(
    di_container=di_container,
    sagas_mapper=saga_mapper,
    saga_storage=storage,
)

# Execute
context = OrderContext(order_id="123")
saga_id = uuid.uuid4()

async for step_result in mediator.stream(context, saga_id=saga_id):
    print(f"Step: {step_result.step_type.__name__}")
```

**Complete example:** [`examples/saga_fallback.py`](https://github.com/vadikko2/cqrs/blob/master/examples/saga_fallback.py)

---

## More Examples

- [Basic Saga](https://github.com/vadikko2/cqrs/blob/master/examples/saga.py)
- [Recovery](https://github.com/vadikko2/cqrs/blob/master/examples/saga_recovery.py)
- [FastAPI SSE](https://github.com/vadikko2/cqrs/blob/master/examples/saga_fastapi_sse.py)
- [Fallback Pattern](https://github.com/vadikko2/cqrs/blob/master/examples/saga_fallback.py)
