# FastStream Integration

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Kafka Integration (aiokafka)](#kafka-integration-aiokafka)
- [RabbitMQ Integration (aiopika)](#rabbitmq-integration-aiopika)
- [Event Mediator Factory](#event-mediator-factory)
- [Event Deserialization](#event-deserialization)
- [Complete Examples](#complete-examples)
- [Best Practices](#best-practices)

## Overview

FastStream is a powerful framework for building event-driven applications with message brokers. The `python-cqrs` package integrates seamlessly with FastStream to process events from Kafka and RabbitMQ using CQRS event handlers.

**Key Features:**

- **Kafka Support** — Process events from Apache Kafka topics using `aiokafka`
- **RabbitMQ Support** — Process events from RabbitMQ queues using `aiopika`
- **Type Safety** — Full Pydantic v2 support for event payloads
- **Dependency Injection** — Use FastStream's `Depends()` for mediator injection
- **Error Handling** — Built-in deserialization error handling
- **Auto-commit Control** — Fine-grained control over message acknowledgment

!!! note "Prerequisites"
    Understanding of [Event Handling](event_handler/index.md) and [Bootstrap](bootstrap/index.md) is required. This integration shows how to consume events from message brokers.

!!! tip "Related Topics"
    - [Event Producing](event_producing.md) — For publishing events to message brokers
    - [Protobuf Integration](protobuf.md) — For Protobuf serialization/deserialization
    - [Transaction Outbox](outbox/index.md) — For reliable event delivery

## Setup

Install the required dependencies:

```bash
# For Kafka
pip install faststream[kafka] python-cqrs di orjson

# For RabbitMQ
pip install faststream[rabbit] python-cqrs di orjson

# Or install both
pip install faststream[kafka,rabbit] python-cqrs di orjson
```

## Kafka Integration (aiokafka)

FastStream provides excellent support for Apache Kafka through `aiokafka`. This section shows how to consume events from Kafka topics and process them using CQRS event handlers.

### Basic Kafka Consumer Setup

```python
import di
import faststream
import cqrs
from faststream import kafka
from cqrs.events import bootstrap
from cqrs import deserializers

# Create Kafka broker
broker = kafka.KafkaBroker(bootstrap_servers=["localhost:9092"])
app = faststream.FastStream(broker)

# Event Mediator Factory
def mediator_factory() -> cqrs.EventMediator:
    container = di.Container()
    
    def events_mapper(mapper: cqrs.EventMap) -> None:
        # Your event mappings here
        mapper.bind(
            cqrs.NotificationEvent[UserCreatedPayload],
            UserCreatedEventHandler
        )
    
    return bootstrap.bootstrap(
        di_container=container,
        events_mapper=events_mapper,
    )

# Kafka subscriber
@broker.subscriber(
    "user_events",
    group_id="my-service",
    auto_commit=False,
    auto_offset_reset="earliest",
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload],
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(body)
    await msg.ack()
```

### Kafka with JSON Deserialization

```python
from cqrs import deserializers

@broker.subscriber(
    "user_events",
    group_id="my-service",
    auto_commit=False,
    value_deserializer=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload]
    | deserializers.DeserializeJsonError
    | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    # Handle deserialization errors
    if isinstance(body, deserializers.DeserializeJsonError):
        print(f"Deserialization error: {body}")
        await msg.nack()
        return
    
    if body is not None:
        await mediator.send(body)
        await msg.ack()
```

### Kafka with Custom Decoder

```python
from faststream import types

async def empty_message_decoder(
    msg: kafka.KafkaMessage,
    original_decoder: typing.Callable[
        [kafka.KafkaMessage],
        typing.Awaitable[types.DecodedMessage],
    ],
) -> types.DecodedMessage | None:
    """Skip empty messages."""
    if not msg.body:
        return None
    return await original_decoder(msg)

@broker.subscriber(
    "user_events",
    group_id="my-service",
    decoder=empty_message_decoder,
    value_deserializer=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload] | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    if body is not None:
        await mediator.send(body)
    await msg.ack()
```

### Kafka Consumer Configuration

```python
@broker.subscriber(
    "user_events",
    group_id="my-service",
    auto_commit=False,  # Manual commit control
    auto_offset_reset="earliest",  # Start from beginning
    enable_auto_commit=False,
    max_poll_records=100,  # Batch size
    value_deserializer=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload],
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    try:
        await mediator.send(body)
        await msg.ack()  # Acknowledge after successful processing
    except Exception as e:
        print(f"Error processing event: {e}")
        await msg.nack()  # Negative acknowledgment on error
```

### Multiple Kafka Topics

```python
@broker.subscriber(
    "user_events",
    group_id="my-service",
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload],
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(body)
    await msg.ack()

@broker.subscriber(
    "order_events",
    group_id="my-service",
)
async def handle_order_event(
    body: cqrs.NotificationEvent[OrderCreatedPayload],
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(body)
    await msg.ack()
```

## RabbitMQ Integration (aiopika)

FastStream also supports RabbitMQ through `aiopika`. This section shows how to consume events from RabbitMQ queues.

### Basic RabbitMQ Consumer Setup

```python
import di
import faststream
import cqrs
from faststream import rabbitmq
from cqrs.events import bootstrap
from cqrs import deserializers

# Create RabbitMQ broker
broker = rabbitmq.RabbitBroker("amqp://guest:guest@localhost:5672/")
app = faststream.FastStream(broker)

# Event Mediator Factory
def mediator_factory() -> cqrs.EventMediator:
    container = di.Container()
    
    def events_mapper(mapper: cqrs.EventMap) -> None:
        mapper.bind(
            cqrs.NotificationEvent[UserCreatedPayload],
            UserCreatedEventHandler
        )
    
    return bootstrap.bootstrap(
        di_container=container,
        events_mapper=events_mapper,
    )

# RabbitMQ subscriber
@broker.subscriber("user_events")
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload],
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(body)
```

### RabbitMQ with JSON Deserialization

```python
@broker.subscriber(
    "user_events",
    parser=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload]
    | deserializers.DeserializeJsonError,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    if isinstance(body, deserializers.DeserializeJsonError):
        print(f"Deserialization error: {body}")
        return
    
    await mediator.send(body)
```

### RabbitMQ Queue Configuration

```python
@broker.subscriber(
    "user_events",
    queue="user_events_queue",
    exchange="events",
    routing_key="user.created",
    durable=True,  # Make queue durable
    auto_delete=False,
    parser=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload],
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(body)
```

### RabbitMQ with Manual Acknowledgment

```python
@broker.subscriber(
    "user_events",
    ack=True,  # Enable manual acknowledgment
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload],
    message: rabbitmq.RabbitMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    try:
        await mediator.send(body)
        await message.ack()  # Acknowledge after successful processing
    except Exception as e:
        print(f"Error processing event: {e}")
        await message.nack()  # Negative acknowledgment on error
```

### RabbitMQ Multiple Queues

```python
@broker.subscriber("user_events")
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload],
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(body)

@broker.subscriber("order_events")
async def handle_order_event(
    body: cqrs.NotificationEvent[OrderCreatedPayload],
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    await mediator.send(body)
```

For Protobuf event handling, see the [Protobuf Integration](protobuf.md) documentation.

## Event Mediator Factory

The event mediator factory is crucial for dependency injection in FastStream subscribers. Here are different patterns:

### Singleton Mediator (Recommended)

```python
import functools
import di
import cqrs
from cqrs.events import bootstrap

@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.EventMediator:
    """Singleton mediator - created once and reused."""
    container = di.Container()
    
    def events_mapper(mapper: cqrs.EventMap) -> None:
        mapper.bind(
            cqrs.NotificationEvent[UserCreatedPayload],
            UserCreatedEventHandler
        )
    
    return bootstrap.bootstrap(
        di_container=container,
        events_mapper=events_mapper,
    )
```

### Per-Request Mediator

```python
def mediator_factory() -> cqrs.EventMediator:
    """Create new mediator for each request."""
    container = di.Container()
    
    def events_mapper(mapper: cqrs.EventMap) -> None:
        mapper.bind(
            cqrs.NotificationEvent[UserCreatedPayload],
            UserCreatedEventHandler
        )
    
    return bootstrap.bootstrap(
        di_container=container,
        events_mapper=events_mapper,
    )
```

### Mediator with Custom Middlewares

```python
import functools
from cqrs.middlewares import base

class EventLoggingMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        print(f"Processing event: {type(request).__name__}")
        result = await handle(request)
        print(f"Event processed: {type(request).__name__}")
        return result

@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.EventMediator:
    container = di.Container()
    
    def events_mapper(mapper: cqrs.EventMap) -> None:
        mapper.bind(
            cqrs.NotificationEvent[UserCreatedPayload],
            UserCreatedEventHandler
        )
    
    return bootstrap.bootstrap(
        di_container=container,
        events_mapper=events_mapper,
        middlewares=[EventLoggingMiddleware()],
    )
```

## Event Deserialization

FastStream requires proper deserialization of messages from brokers. The `python-cqrs` package provides `JsonDeserializer` for this purpose.

### Basic Deserialization

```python
from cqrs import deserializers

@broker.subscriber(
    "user_events",
    value_deserializer=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload]
    | deserializers.DeserializeJsonError
    | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    if isinstance(body, deserializers.DeserializeJsonError):
        # Handle deserialization error
        print(f"Failed to deserialize: {body}")
        await msg.nack()
        return
    
    if body is not None:
        await mediator.send(body)
        await msg.ack()
```

### Error Handling

```python
@broker.subscriber(
    "user_events",
    value_deserializer=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload]
    | deserializers.DeserializeJsonError
    | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    # Check for deserialization errors
    if isinstance(body, deserializers.DeserializeJsonError):
        # Log error and send to DLQ (Dead Letter Queue)
        print(f"Deserialization error: {body.error}")
        await msg.nack()  # Don't acknowledge, message will be retried
        return
    
    # Check for None (empty message)
    if body is None:
        await msg.ack()  # Acknowledge empty messages
        return
    
    # Process valid event
    try:
        await mediator.send(body)
        await msg.ack()
    except Exception as e:
        print(f"Error processing event: {e}")
        await msg.nack()  # Retry on processing error
```

## Complete Examples

### Kafka Complete Example

```python
import asyncio
import functools
import logging
import typing

import di
import faststream
import orjson
import pydantic
from faststream import kafka, types

import cqrs
from cqrs import deserializers
from cqrs.events import bootstrap

logging.basicConfig(level=logging.INFO)
logging.getLogger("aiokafka").setLevel(logging.ERROR)

# Create Kafka broker
broker = kafka.KafkaBroker(bootstrap_servers=["localhost:9092"])
app = faststream.FastStream(broker)

# Event payload
class UserCreatedPayload(pydantic.BaseModel):
    user_id: str
    email: str
    name: str

# Event handler (defined elsewhere)
class UserCreatedEventHandler(
    cqrs.EventHandler[cqrs.NotificationEvent[UserCreatedPayload]]
):
    async def handle(
        self, event: cqrs.NotificationEvent[UserCreatedPayload]
    ) -> None:
        print(f"User {event.payload.user_id} created: {event.payload.email}")

# Event mapper
def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(
        cqrs.NotificationEvent[UserCreatedPayload],
        UserCreatedEventHandler
    )

# Mediator factory
@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.EventMediator:
    return bootstrap.bootstrap(
        di_container=di.Container(),
        events_mapper=events_mapper,
    )

# Custom decoder
async def empty_message_decoder(
    msg: kafka.KafkaMessage,
    original_decoder: typing.Callable[
        [kafka.KafkaMessage],
        typing.Awaitable[types.DecodedMessage],
    ],
) -> types.DecodedMessage | None:
    if not msg.body:
        return None
    return await original_decoder(msg)

# Kafka subscriber
@broker.subscriber(
    "user_events",
    group_id="user-service",
    auto_commit=False,
    auto_offset_reset="earliest",
    value_deserializer=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
    decoder=empty_message_decoder,
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload]
    | deserializers.DeserializeJsonError
    | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    if isinstance(body, deserializers.DeserializeJsonError):
        print(f"Deserialization error: {body}")
        await msg.nack()
        return
    
    if body is not None:
        await mediator.send(body)
        await msg.ack()

if __name__ == "__main__":
    asyncio.run(app.run())
```

### RabbitMQ Complete Example

```python
import functools
import logging

import di
import faststream
import pydantic
from faststream import rabbitmq

import cqrs
from cqrs import deserializers
from cqrs.events import bootstrap

logging.basicConfig(level=logging.INFO)

# Create RabbitMQ broker
broker = rabbitmq.RabbitBroker("amqp://guest:guest@localhost:5672/")
app = faststream.FastStream(broker)

# Event payload
class UserCreatedPayload(pydantic.BaseModel):
    user_id: str
    email: str
    name: str

# Event handler (defined elsewhere)
class UserCreatedEventHandler(
    cqrs.EventHandler[cqrs.NotificationEvent[UserCreatedPayload]]
):
    async def handle(
        self, event: cqrs.NotificationEvent[UserCreatedPayload]
    ) -> None:
        print(f"User {event.payload.user_id} created: {event.payload.email}")

# Event mapper
def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(
        cqrs.NotificationEvent[UserCreatedPayload],
        UserCreatedEventHandler
    )

# Mediator factory
@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.EventMediator:
    return bootstrap.bootstrap(
        di_container=di.Container(),
        events_mapper=events_mapper,
    )

# RabbitMQ subscriber
@broker.subscriber(
    "user_events",
    queue="user_events_queue",
    exchange="events",
    routing_key="user.created",
    durable=True,
    parser=deserializers.JsonDeserializer(
        model=cqrs.NotificationEvent[UserCreatedPayload],
    ),
)
async def handle_user_event(
    body: cqrs.NotificationEvent[UserCreatedPayload]
    | deserializers.DeserializeJsonError,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    if isinstance(body, deserializers.DeserializeJsonError):
        print(f"Deserialization error: {body}")
        return
    
    await mediator.send(body)

if __name__ == "__main__":
    import asyncio
    asyncio.run(app.run())
```

## Best Practices

### 1. Use Singleton Mediator Factory

Always use `@functools.lru_cache` for mediator factory to avoid recreating mediators:

```python
@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.EventMediator:
    return bootstrap.bootstrap(...)
```

### 2. Handle Deserialization Errors

Always check for `DeserializeJsonError` before processing:

```python
if isinstance(body, deserializers.DeserializeJsonError):
    # Handle error
    await msg.nack()
    return
```

### 3. Manual Acknowledgment

Use manual acknowledgment for better control:

```python
@broker.subscriber(
    "events",
    auto_commit=False,  # Kafka
    ack=True,  # RabbitMQ
)
async def handle_event(...):
    try:
        await mediator.send(body)
        await msg.ack()  # Acknowledge success
    except Exception as e:
        await msg.nack()  # Retry on error
```

### 4. Error Handling

Wrap event processing in try-except:

```python
async def handle_event(...):
    try:
        await mediator.send(body)
        await msg.ack()
    except Exception as e:
        print(f"Error: {e}")
        await msg.nack()  # Retry
```

### 5. Logging Configuration

Suppress verbose broker logging:

```python
logging.getLogger("aiokafka").setLevel(logging.ERROR)  # Kafka
logging.getLogger("aio_pika").setLevel(logging.ERROR)  # RabbitMQ
```

### 6. Empty Message Handling

Handle empty messages gracefully:

```python
async def empty_message_decoder(...):
    if not msg.body:
        return None
    return await original_decoder(msg)
```

### 7. Multiple Event Types

Use separate subscribers for different event types:

```python
@broker.subscriber("user_events")
async def handle_user_event(...):
    ...

@broker.subscriber("order_events")
async def handle_order_event(...):
    ...
```
