# Saga Mediator

<div class="grid cards" markdown>

-   :material-home: **Back to Bootstrap Overview**

    Return to the Bootstrap overview page with all configuration options.

    [:octicons-arrow-left-24: Back to Overview](index.md)

-   :material-sitemap: **Saga Pattern**

    Flow, storage, recovery, and compensation.

    [:octicons-arrow-right-24: Read More](../saga/index.md)

</div>

## Overview

The `SagaMediator` runs orchestrated sagas: it resolves the saga by context type, creates a transaction, and streams step results. It is bootstrapped via `cqrs.saga.bootstrap.bootstrap()` with a saga map, DI container, optional saga storage, and optional event mapping for domain events emitted by steps.

### Basic Configuration

```python
import di
import cqrs
from cqrs.saga import bootstrap
from cqrs.saga.storage.memory import MemorySagaStorage

def saga_mapper(mapper: cqrs.SagaMap) -> None:
    mapper.bind(OrderContext, OrderSaga)

storage = MemorySagaStorage()

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    sagas_mapper=saga_mapper,
    saga_storage=storage,
)
```

### With Domain Events

Steps can emit domain events; the mediator uses an event emitter and event map (same as request bootstrap). Register handlers via `domain_events_mapper`:

```python
def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(InventoryReservedEvent, InventoryReservedEventHandler)

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    sagas_mapper=saga_mapper,
    domain_events_mapper=events_mapper,
    saga_storage=storage,
)
```

### With Message Broker

By default the event emitter uses `DevnullMessageBroker`. To publish events to Kafka or RabbitMQ, pass `message_broker`:

```python
from cqrs.message_brokers import kafka
from cqrs.adapters.kafka import KafkaProducerAdapter

kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    client_id="my-app",
)

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    sagas_mapper=saga_mapper,
    domain_events_mapper=events_mapper,
    saga_storage=storage,
    message_broker=kafka.KafkaMessageBroker(
        producer=kafka_producer,
        aiokafka_log_level="ERROR",
    ),
)
```

### With Middlewares and On Startup

```python
from cqrs.middlewares import base

class SagaLoggingMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        print(f"Before saga step: {type(request).__name__}")
        result = await handle(request)
        print(f"After saga step: {type(request).__name__}")
        return result

def init_storage():
    # e.g. create tables for SqlAlchemySagaStorage
    pass

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    sagas_mapper=saga_mapper,
    saga_storage=storage,
    middlewares=[SagaLoggingMiddleware()],
    on_startup=[init_storage],
)
```

### Executing a Saga

Use `mediator.stream(context, saga_id=...)` to run the saga. It returns an async iterator; consume it with `async for`:

```python
import uuid

context = OrderContext(order_id="123", items=["item_1"], total_amount=100.0)
saga_id = uuid.uuid4()

async for step_result in mediator.stream(context, saga_id=saga_id):
    print(f"Step completed: {step_result.step_type.__name__}")
```

For recovery, use the same `saga_id` and call `recover_saga()` (see [Saga Recovery](../saga/recovery.md)).

### Complete Example

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

class OrderSaga(Saga[OrderContext]):
    steps = [ReserveInventoryStep]

# Register services in container
di_container = di.Container()
# di_container.bind(...)

def saga_mapper(mapper: cqrs.SagaMap) -> None:
    mapper.bind(OrderContext, OrderSaga)

storage = MemorySagaStorage()
mediator = bootstrap.bootstrap(
    di_container=di_container,
    sagas_mapper=saga_mapper,
    saga_storage=storage,
)

context = OrderContext(order_id="123", items=["item_1"], total_amount=100.0)
saga_id = uuid.uuid4()

async for step_result in mediator.stream(context, saga_id=saga_id):
    print(f"Step: {step_result.step_type.__name__}")
```

## Bootstrap Parameters

| Parameter | Description |
|-----------|-------------|
| `di_container` | DI container (`di.Container` or CQRS `Container`) for resolving saga step handlers |
| `sagas_mapper` | Callable that receives `cqrs.SagaMap` and registers context type → saga class (e.g. `mapper.bind(OrderContext, OrderSaga)`) |
| `saga_storage` | Optional `ISagaStorage` implementation. If `None`, defaults to in-memory behaviour when storage is needed. For production, use e.g. `SqlAlchemySagaStorage` and register it in the container |
| `domain_events_mapper` | Optional callable to register event handlers (for events emitted by steps) |
| `message_broker` | Optional message broker for event publishing; defaults to `DevnullMessageBroker` |
| `middlewares` | Optional list of middlewares for request processing |
| `on_startup` | Optional list of callables invoked once when bootstrap runs |
| `max_concurrent_event_handlers` | Max concurrent event handlers (default: 1) |
| `concurrent_event_handle_enable` | Whether to process events in parallel (default: True) |
