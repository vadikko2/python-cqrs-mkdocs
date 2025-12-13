# Bootstrap

## Table of Contents

- [Overview](#overview)
- [Mediator Types](#mediator-types)
- [Request Mediator](#request-mediator)
- [Streaming Request Mediator](#streaming-request-mediator)
- [Event Mediator](#event-mediator)
- [Message Brokers](#message-brokers)
- [Middlewares](#middlewares)
- [Dependency Injection Containers](#dependency-injection-containers)
- [Advanced Configuration](#advanced-configuration)

## Overview

The `bootstrap` utilities simplify the initial configuration of your CQRS application. They automatically set up:

- **Dependency Injection Container** — Resolves handlers and their dependencies
- **Request Mapping** — Maps commands and queries to their handlers
- **Event Mapping** — Maps domain events to their handlers
- **Message Broker** — Configures event publishing
- **Middlewares** — Adds logging and custom middlewares
- **Event Processing** — Configures parallel event processing

## Mediator Types

The `python-cqrs` package provides three types of mediators:

1. **`RequestMediator`** — Standard mediator for commands and queries
2. **`StreamingRequestMediator`** — Mediator for streaming requests with incremental results
3. **`EventMediator`** — Mediator for processing events from message brokers

Each mediator type has its own bootstrap function and configuration options.

## Request Mediator

The `RequestMediator` is the standard mediator for handling commands and queries. It processes requests synchronously and emits events after handler execution.

### Basic Configuration

```python
import di
import cqrs
from cqrs.requests import bootstrap

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(CreateUserCommand, CreateUserCommandHandler)

def queries_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(GetUserQuery, GetUserQueryHandler)

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(
        cqrs.DomainEvent[UserCreatedPayload],
        UserCreatedEventHandler
    )

# Basic bootstrap with di.Container
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    queries_mapper=queries_mapper,
    domain_events_mapper=events_mapper,
)
```

### With Message Broker

```python
from cqrs.message_brokers import devnull, kafka

# Using DevnullMessageBroker (for testing)
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=devnull.DevnullMessageBroker(),
)

# Using KafkaMessageBroker
from cqrs.adapters.kafka import KafkaProducerAdapter

kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    client_id="my-app",
)

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=kafka.KafkaMessageBroker(
        producer=kafka_producer,
        aiokafka_log_level="ERROR",
    ),
)
```

### With Parallel Event Processing

```python
# Enable parallel event processing
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    max_concurrent_event_handlers=5,  # Process up to 5 events concurrently
    concurrent_event_handle_enable=True,  # Enable parallel processing
)
```

### With Custom Middlewares

```python
from cqrs.middlewares import base

class CustomMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        print(f"Before handling {type(request).__name__}")
        result = await handle(request)
        print(f"After handling {type(request).__name__}")
        return result

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    middlewares=[CustomMiddleware()],
)
```

### With On Startup Callbacks

```python
def initialize_database():
    # Initialize database connections, create tables, etc.
    print("Database initialized")

def setup_cache():
    # Setup cache connections
    print("Cache initialized")

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    on_startup=[initialize_database, setup_cache],
)
```

### Complete Example

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import devnull
from cqrs.middlewares import base

class CreateUserCommand(cqrs.Request):
    user_id: str
    email: str

class UserCreatedEvent(cqrs.DomainEvent):
    user_id: str
    email: str

class CreateUserCommandHandler(cqrs.RequestHandler[CreateUserCommand, None]):
    def __init__(self):
        self._events = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    async def handle(self, request: CreateUserCommand) -> None:
        # Business logic
        self._events.append(
            UserCreatedEvent(user_id=request.user_id, email=request.email)
        )

class UserCreatedEventHandler(cqrs.EventHandler[UserCreatedEvent]):
    async def handle(self, event: UserCreatedEvent) -> None:
        print(f"User {event.user_id} created with email {event.email}")

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(CreateUserCommand, CreateUserCommandHandler)

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(UserCreatedEvent, UserCreatedEventHandler)

# Complete configuration
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=devnull.DevnullMessageBroker(),
    max_concurrent_event_handlers=3,
    concurrent_event_handle_enable=True,
    on_startup=[lambda: print("Application started")],
)

# Use the mediator
result = await mediator.send(CreateUserCommand(user_id="1", email="user@example.com"))
```

## Streaming Request Mediator

The `StreamingRequestMediator` processes requests incrementally, yielding results as they become available. Perfect for batch processing, file uploads, and real-time progress updates.

### Basic Configuration

```python
from cqrs.requests import bootstrap

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(ProcessFilesCommand, ProcessFilesCommandHandler)

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(FileProcessedEvent, FileProcessedEventHandler)

mediator = bootstrap.bootstrap_streaming(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
)
```

### With Parallel Event Processing

```python
# Streaming mediator defaults to parallel event processing
mediator = bootstrap.bootstrap_streaming(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    max_concurrent_event_handlers=10,  # Default: 10
    concurrent_event_handle_enable=True,  # Default: True for streaming
)
```

### With Message Broker

```python
from cqrs.message_brokers import kafka
from cqrs.adapters.kafka import KafkaProducerAdapter

kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
)

mediator = bootstrap.bootstrap_streaming(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=kafka.KafkaMessageBroker(producer=kafka_producer),
)
```

### Complete Example

```python
import typing
import asyncio
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.requests.request_handler import StreamingRequestHandler
from cqrs.message_brokers import devnull

class ProcessFilesCommand(cqrs.Request):
    file_ids: list[str]

class FileProcessedResult(cqrs.Response):
    file_id: str
    status: str

class FileProcessedEvent(cqrs.DomainEvent):
    file_id: str
    status: str

class ProcessFilesCommandHandler(
    StreamingRequestHandler[ProcessFilesCommand, FileProcessedResult]
):
    def __init__(self):
        self._events = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events.copy()

    def clear_events(self) -> None:
        self._events.clear()

    async def handle(
        self, request: ProcessFilesCommand
    ) -> typing.AsyncIterator[FileProcessedResult]:
        for file_id in request.file_ids:
            # Simulate processing
            await asyncio.sleep(0.1)
            result = FileProcessedResult(file_id=file_id, status="completed")
            self._events.append(
                FileProcessedEvent(file_id=file_id, status="completed")
            )
            yield result

class FileProcessedEventHandler(cqrs.EventHandler[FileProcessedEvent]):
    async def handle(self, event: FileProcessedEvent) -> None:
        print(f"File {event.file_id} processed")

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(ProcessFilesCommand, ProcessFilesCommandHandler)

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(FileProcessedEvent, FileProcessedEventHandler)

mediator = bootstrap.bootstrap_streaming(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=devnull.DevnullMessageBroker(),
    max_concurrent_event_handlers=5,
    concurrent_event_handle_enable=True,
)

# Stream results
async for result in mediator.stream(
    ProcessFilesCommand(file_ids=["1", "2", "3"])
):
    if result:
        print(f"Processed: {result.file_id} - {result.status}")
```

## Event Mediator

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

## Message Brokers

Message brokers are used to publish `NotificationEvent` and `ECSTEvent` events to external systems. The `python-cqrs` package supports multiple message broker implementations.

### DevnullMessageBroker

The `DevnullMessageBroker` is a no-op broker used for testing. It doesn't actually send messages anywhere but logs warnings.

```python
from cqrs.message_brokers import devnull

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    message_broker=devnull.DevnullMessageBroker(),
)
```

### KafkaMessageBroker

The `KafkaMessageBroker` publishes events to Apache Kafka topics.

```python
from cqrs.message_brokers import kafka
from cqrs.adapters.kafka import KafkaProducerAdapter

# Create Kafka producer adapter
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    client_id="my-app",
    acks="all",  # Wait for all replicas
    enable_idempotence=True,
)

# Create message broker
kafka_broker = kafka.KafkaMessageBroker(
    producer=kafka_producer,
    aiokafka_log_level="ERROR",  # Suppress verbose logging
)

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=kafka_broker,
)
```

### AMQPMessageBroker

The `AMQPMessageBroker` publishes events to RabbitMQ or other AMQP-compatible brokers.

```python
from cqrs.message_brokers import amqp
from cqrs.adapters.amqp import AMQPPublisherAdapter
import aio_pika

# Create AMQP publisher
amqp_publisher = AMQPPublisherAdapter(
    dsn="amqp://user:password@localhost/",
)

# Create message broker
amqp_broker = amqp.AMQPMessageBroker(
    publisher=amqp_publisher,
    exchange_name="events",
    pika_log_level="ERROR",
)

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=amqp_broker,
)
```

### Custom Message Broker

You can create custom message brokers by implementing the `MessageBroker` protocol:

```python
from cqrs.message_brokers import protocol

class CustomMessageBroker(protocol.MessageBroker):
    async def send_message(self, message: protocol.Message) -> None:
        # Custom implementation
        print(f"Sending {message.message_name} to {message.topic}")
        # Send to your custom broker

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    message_broker=CustomMessageBroker(),
)
```

## Middlewares

Middlewares allow you to intercept and modify request processing. The `python-cqrs` package includes a built-in `LoggingMiddleware` and allows you to create custom middlewares.

### LoggingMiddleware

The `LoggingMiddleware` is automatically added to all mediators. It logs request and response details.

```python
# LoggingMiddleware is added automatically
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    # LoggingMiddleware is added automatically
)
```

### Custom Middleware

Create custom middlewares by implementing the `Middleware` protocol:

```python
from cqrs.middlewares import base
import time

class TimingMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        start_time = time.time()
        result = await handle(request)
        elapsed = time.time() - start_time
        print(f"Request {type(request).__name__} took {elapsed:.2f}s")
        return result

class ValidationMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        # Validate request
        if hasattr(request, 'validate'):
            request.validate()
        result = await handle(request)
        return result

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    middlewares=[TimingMiddleware(), ValidationMiddleware()],
)
```

### Middleware Order

Middlewares are executed in the order they are added, with the last middleware wrapping the handler first:

```python
# Execution order: TimingMiddleware -> ValidationMiddleware -> Handler
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    middlewares=[
        TimingMiddleware(),      # Executes first (outermost)
        ValidationMiddleware(),  # Executes second
    ],
)
```

## Dependency Injection Containers

The bootstrap functions support multiple DI container implementations.

### di.Container

The `di` library is the default and recommended DI container:

```python
import abc
import di
from di import dependent

class ServiceProtocol(abc.ABC):
    @abc.abstractmethod
    async def do_work(self) -> None:
        pass

class ServiceImpl(ServiceProtocol):
    async def do_work(self) -> None:
        print("Working...")

# Setup DI container
container = di.Container()
container.bind(
    di.bind_by_type(
        dependent.Dependent(ServiceImpl, scope="request"),
        ServiceProtocol,
    )
)

mediator = bootstrap.bootstrap(
    di_container=container,
    commands_mapper=commands_mapper,
)
```

### CQRSContainer (dependency-injector)

The `CQRSContainer` adapter allows using `dependency-injector` library:

```python
from dependency_injector import containers, providers
from cqrs.container import DependencyInjectorCQRSContainer

class ApplicationContainer(containers.DeclarativeContainer):
    # Define your services
    service = providers.Factory(ServiceImpl)

# Create CQRS container adapter
cqrs_container = DependencyInjectorCQRSContainer(ApplicationContainer())

mediator = bootstrap.bootstrap(
    di_container=cqrs_container,
    commands_mapper=commands_mapper,
)
```

## Advanced Configuration

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
