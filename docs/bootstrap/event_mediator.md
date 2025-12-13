# Event Mediator

See [Bootstrap Overview](index.md) for general information.

---

## Overview

The `EventMediator` processes events received from message brokers (like Kafka, RabbitMQ). It's used in event consumers to handle incoming events.

### Basic Configuration

```python
from cqrs.events import bootstrap

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(
        cqrs.NotificationEvent[UserCreatedPayload],
        UserCreatedEventHandler
    )

event_mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    events_mapper=events_mapper,
)
```

### With Custom Middlewares

```python
from cqrs.middlewares import base

class EventLoggingMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        print(f"Processing event: {type(request).__name__}")
        result = await handle(request)
        print(f"Event processed: {type(request).__name__}")
        return result

event_mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    events_mapper=events_mapper,
    middlewares=[EventLoggingMiddleware()],
)
```

### With On Startup Callbacks

```python
def setup_event_store():
    # Initialize event store connections
    print("Event store initialized")

event_mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    events_mapper=events_mapper,
    on_startup=[setup_event_store],
)
```

### Complete Example with FastStream

```python
import di
import cqrs
from cqrs.events import bootstrap
from faststream import kafka
import faststream

class UserCreatedPayload(cqrs.Response):
    user_id: str
    email: str

class UserCreatedEventHandler(
    cqrs.EventHandler[cqrs.NotificationEvent[UserCreatedPayload]]
):
    async def handle(
        self, event: cqrs.NotificationEvent[UserCreatedPayload]
    ) -> None:
        print(f"User {event.payload.user_id} created")

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(
        cqrs.NotificationEvent[UserCreatedPayload],
        UserCreatedEventHandler
    )

def mediator_factory() -> cqrs.EventMediator:
    return bootstrap.bootstrap(
        di_container=di.Container(),
        events_mapper=events_mapper,
    )

broker = kafka.KafkaBroker(bootstrap_servers=["localhost:9092"])
app = faststream.FastStream(broker)

@broker.subscriber("user_events")
async def handle_user_event(
    event: cqrs.NotificationEvent[UserCreatedPayload],
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(event)
```
