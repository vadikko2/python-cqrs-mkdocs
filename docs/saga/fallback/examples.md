# Complete Example

Here is a complete example demonstrating the Fallback pattern with Circuit Breaker and Saga execution.

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
    user_id: str
    reservation_id: str | None = None

class ReserveInventoryResponse(Response):
    reservation_id: str
    source: str  # "primary" or "fallback"

class PrimaryStep(SagaStepHandler[OrderContext, ReserveInventoryResponse]):
    def __init__(self, inventory_service):
        self._inventory_service = inventory_service

    async def act(self, context: OrderContext) -> SagaStepResult[OrderContext, ReserveInventoryResponse]:
        # Primary step - may fail
        reservation_id = await self._inventory_service.reserve_items(
            context.order_id
        )
        context.reservation_id = reservation_id
        return self._generate_step_result(
            ReserveInventoryResponse(reservation_id=reservation_id, source="primary")
        )

    async def compensate(self, context: OrderContext) -> None:
        if context.reservation_id:
            await self._inventory_service.release_items(context.reservation_id)

class FallbackStep(SagaStepHandler[OrderContext, ReserveInventoryResponse]):
    def __init__(self, fallback_service):
        self._fallback_service = fallback_service

    async def act(self, context: OrderContext) -> SagaStepResult[OrderContext, ReserveInventoryResponse]:
        # Fallback step - executes when primary fails
        # Context is restored to state before primary execution
        reservation_id = f"fallback_reservation_{context.order_id}"
        context.reservation_id = reservation_id
        return self._generate_step_result(
            ReserveInventoryResponse(reservation_id=reservation_id, source="fallback")
        )

    async def compensate(self, context: OrderContext) -> None:
        if context.reservation_id:
            await self._fallback_service.release_fallback_reservation(context.reservation_id)

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
# ... register services ...

storage = MemorySagaStorage()

def saga_mapper(mapper: cqrs.SagaMap) -> None:
    mapper.bind(OrderContext, OrderSaga)

mediator = bootstrap.bootstrap(
    di_container=di_container,
    sagas_mapper=saga_mapper,
    saga_storage=storage,
)

# Execute
context = OrderContext(order_id="123", user_id="user_1")
saga_id = uuid.uuid4()

async for step_result in mediator.stream(context, saga_id=saga_id):
    print(f"Step: {step_result.step_type.__name__}")
    if hasattr(step_result.response, "source"):
        print(f"Source: {step_result.response.source}")
```
