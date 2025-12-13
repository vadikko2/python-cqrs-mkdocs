# Advanced

See [Bootstrap Overview](index.md) for general information.

---

### Combining All Options

Here's a complete example combining all configuration options:

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import kafka
from cqrs.adapters.kafka import KafkaProducerAdapter
from cqrs.middlewares import base

# DI Container setup
container = di.Container()
# ... bind dependencies ...

# Mappers
def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(CreateUserCommand, CreateUserCommandHandler)

def queries_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(GetUserQuery, GetUserQueryHandler)

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(UserCreatedEvent, UserCreatedEventHandler)

# Custom middleware
class CustomMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        # Custom logic
        return await handle(request)

# Message broker
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
)
kafka_broker = kafka.KafkaMessageBroker(producer=kafka_producer)

# Startup callbacks
def init_database():
    print("Database initialized")

def init_cache():
    print("Cache initialized")

# Complete bootstrap
mediator = bootstrap.bootstrap(
    di_container=container,
    commands_mapper=commands_mapper,
    queries_mapper=queries_mapper,
    domain_events_mapper=events_mapper,
    message_broker=kafka_broker,
    middlewares=[CustomMiddleware()],
    on_startup=[init_database, init_cache],
    max_concurrent_event_handlers=5,
    concurrent_event_handle_enable=True,
)
```

### Manual Setup (Advanced)

For advanced use cases, you can manually set up mediators and emitters:

```python
from cqrs.requests import bootstrap
from cqrs.events import EventEmitter

# Manually create event emitter
event_emitter = bootstrap.setup_event_emitter(
    container=container,
    domain_events_mapper=events_mapper,
    message_broker=kafka_broker,
)

# Manually create mediator
mediator = bootstrap.setup_mediator(
    event_emitter=event_emitter,
    container=container,
    middlewares=[CustomMiddleware()],
    commands_mapper=commands_mapper,
    queries_mapper=queries_mapper,
    max_concurrent_event_handlers=5,
    concurrent_event_handle_enable=True,
)
```
