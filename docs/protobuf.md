# Protobuf Integration

## Overview

Protobuf (Protocol Buffers) provides efficient binary serialization for events, offering significant advantages over JSON:

- **Performance** — Faster serialization/deserialization
- **Size** — Compact binary format reduces message size by 30-50%
- **Schema Evolution** — Backward and forward compatibility
- **Type Safety** — Strong typing with generated code
- **Schema Registry** — Centralized schema management

The `python-cqrs` package supports Protobuf serialization/deserialization for both Kafka and RabbitMQ through FastStream integration.

!!! note "Prerequisites"
    Understanding of [Event Producing](event_producing.md) and [FastStream Integration](faststream.md) is recommended. Protobuf is an advanced feature for high-performance scenarios.

!!! tip "When to Use"
    Use Protobuf when you need better performance, smaller message sizes, or schema evolution. For most use cases, JSON serialization (default) is sufficient.

## Setup

Install the required dependencies:

```bash
pip install python-cqrs faststream[kafka] protobuf confluent-kafka[protobuf]
```

For RabbitMQ:

```bash
pip install python-cqrs faststream[rabbit] protobuf
```

## Protobuf Event Definition

Events that support Protobuf must implement the `proto()` method that converts the event to Protobuf format.

### Basic Event Definition

```python
import pydantic
import cqrs
from your_proto_module import UserCreatedProtobuf  # Generated Protobuf class

class UserCreatedPayload(pydantic.BaseModel, frozen=True):
    user_id: str
    email: str
    name: str

class UserCreatedEvent(cqrs.NotificationEvent[UserCreatedPayload], frozen=True):
    def proto(self) -> UserCreatedProtobuf:
        """Convert event to Protobuf format."""
        return UserCreatedProtobuf(
            event_id=str(self.event_id),
            event_timestamp=str(self.event_timestamp),
            event_name=self.event_name,
            payload=UserCreatedProtobuf.Payload(
                user_id=self.payload.user_id,
                email=self.payload.email,
                name=self.payload.name,
            ),
        )
```

### Event with Nested Payloads

```python
class AddressPayload(pydantic.BaseModel, frozen=True):
    street: str
    city: str
    zip_code: str

class UserCreatedPayload(pydantic.BaseModel, frozen=True):
    user_id: str
    email: str
    name: str
    address: AddressPayload

class UserCreatedEvent(cqrs.NotificationEvent[UserCreatedPayload], frozen=True):
    def proto(self) -> UserCreatedProtobuf:
        return UserCreatedProtobuf(
            event_id=str(self.event_id),
            event_timestamp=str(self.event_timestamp),
            event_name=self.event_name,
            payload=UserCreatedProtobuf.Payload(
                user_id=self.payload.user_id,
                email=self.payload.email,
                name=self.payload.name,
                address=UserCreatedProtobuf.Payload.Address(
                    street=self.payload.address.street,
                    city=self.payload.address.city,
                    zip_code=self.payload.address.zip_code,
                ),
            ),
        )
```

## Event Producing with Protobuf

### Kafka Producer with Protobuf Serialization

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import kafka
from cqrs.adapters.kafka import KafkaProducerAdapter
from cqrs.serializers import protobuf

# Create Kafka producer with Protobuf serializer
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    client_id="my-app",
    security_protocol="PLAINTEXT",  # Or "SASL_SSL" for production
    sasl_mechanism="PLAIN",
    value_serializer=protobuf.protobuf_value_serializer,
)

# Create message broker
kafka_broker = kafka.KafkaMessageBroker(
    producer=kafka_producer,
    aiokafka_log_level="ERROR",
)

# Bootstrap with Protobuf-enabled broker
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=kafka_broker,
)
```

### Protobuf Producer with SSL

```python
import ssl
from cqrs.adapters.kafka import KafkaProducerAdapter
from cqrs.serializers import protobuf

# Create SSL context
ssl_context = ssl.create_default_context()

kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["kafka.example.com:9093"],
    security_protocol="SASL_SSL",
    sasl_mechanism="SCRAM-SHA-256",
    sasl_plain_username="username",
    sasl_plain_password="password",
    ssl_context=ssl_context,
    value_serializer=protobuf.protobuf_value_serializer,
)

kafka_broker = kafka.KafkaMessageBroker(producer=kafka_producer)
```

### Direct Event Publishing

```python
import asyncio
import os
import cqrs
from cqrs.message_brokers import kafka, protocol as broker_protocol
from cqrs.adapters.kafka import KafkaProducerAdapter
from cqrs.serializers import protobuf

# Set schema registry URL
os.environ["KAFKA_SCHEMA_REGISTRY_URL"] = "http://localhost:8085"

async def produce_protobuf_event():
    # Create event
    event = UserCreatedEvent(
        event_name="user_created",
        topic="user_events_proto",
        payload=UserCreatedPayload(
            user_id="123",
            email="user@example.com",
            name="John Doe"
        ),
    )
    
    # Create Kafka producer with Protobuf serializer
    kafka_producer = KafkaProducerAdapter(
        bootstrap_servers=["localhost:9092"],
        value_serializer=protobuf.protobuf_value_serializer,
    )
    
    # Create message broker
    broker = kafka.KafkaMessageBroker(producer=kafka_producer)
    
    # Publish event
    await broker.send_message(
        message=broker_protocol.Message(
            message_name=event.event_name,
            message_id=event.event_id,
            topic=event.topic,
            payload=event.model_dump(mode="json"),
        ),
    )

if __name__ == "__main__":
    asyncio.run(produce_protobuf_event())
```

## Event Consuming with Protobuf

### Kafka Consumer with Protobuf Deserialization

```python
import di
import faststream
import cqrs
from faststream import kafka
from cqrs.events import bootstrap
from cqrs.deserializers import protobuf
from your_proto_module import UserCreatedProtobuf

broker = kafka.KafkaBroker(bootstrap_servers=["localhost:9092"])
app = faststream.FastStream(broker)

def mediator_factory() -> cqrs.EventMediator:
    container = di.Container()
    
    def events_mapper(mapper: cqrs.EventMap) -> None:
        mapper.bind(UserCreatedEvent, UserCreatedEventHandler)
    
    return bootstrap.bootstrap(
        di_container=container,
        events_mapper=events_mapper,
    )

@broker.subscriber(
    "user_events_proto",
    group_id="protobuf-consumers",
    auto_commit=False,
    auto_offset_reset="earliest",
    value_deserializer=protobuf.ProtobufValueDeserializer(
        model=UserCreatedEvent,
        protobuf_model=UserCreatedProtobuf,
    ),
)
async def handle_user_event(
    body: UserCreatedEvent | protobuf.DeserializeProtobufError,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    # Handle deserialization errors
    if isinstance(body, protobuf.DeserializeProtobufError):
        print(f"Protobuf deserialization error: {body.error_message}")
        await msg.nack()
        return
    
    # Process valid event
    await mediator.send(body)
    await msg.ack()
```

### Protobuf Error Handling

```python
import logging

logger = logging.getLogger(__name__)

@broker.subscriber(
    "user_events_proto",
    value_deserializer=protobuf.ProtobufValueDeserializer(
        model=UserCreatedEvent,
        protobuf_model=UserCreatedProtobuf,
    ),
)
async def handle_user_event(
    body: UserCreatedEvent | protobuf.DeserializeProtobufError | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    # Check for deserialization errors
    if isinstance(body, protobuf.DeserializeProtobufError):
        logger.error(
            f"Failed to deserialize Protobuf message: {body.error_message}",
            extra={
                "error_type": body.error_type.__name__,
                "message_data": body.message_data.hex()[:100],  # First 100 bytes
            }
        )
        await msg.nack()  # Retry or send to DLQ
        return
    
    # Check for None (empty message)
    if body is None:
        await msg.ack()
        return
    
    # Process valid event
    try:
        await mediator.send(body)
        await msg.ack()
    except Exception as e:
        logger.error(f"Error processing event: {e}")
        await msg.nack()
```

### Custom Decoder for Protobuf

```python
import typing
from faststream import types

async def protobuf_message_decoder(
    msg: kafka.KafkaMessage,
    original_decoder: typing.Callable[
        [kafka.KafkaMessage],
        typing.Awaitable[types.DecodedMessage],
    ],
) -> types.DecodedMessage | None:
    """Skip empty messages and handle Protobuf decoding."""
    if not msg.body:
        return None
    
    # Additional validation can be added here
    if len(msg.body) < 10:  # Minimum Protobuf message size
        return None
    
    return await original_decoder(msg)

@broker.subscriber(
    "user_events_proto",
    decoder=protobuf_message_decoder,
    value_deserializer=protobuf.ProtobufValueDeserializer(
        model=UserCreatedEvent,
        protobuf_model=UserCreatedProtobuf,
    ),
)
async def handle_user_event(
    body: UserCreatedEvent | protobuf.DeserializeProtobufError | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    if isinstance(body, protobuf.DeserializeProtobufError):
        await msg.nack()
        return
    
    if body is not None:
        await mediator.send(body)
        await msg.ack()
```

## Schema Registry

Protobuf serialization uses Confluent Schema Registry for schema management. The Schema Registry ensures schema compatibility and versioning.

### Schema Registry Configuration

```python
import os
from cqrs.serializers import protobuf

# Set schema registry URL (defaults to http://localhost:8085)
os.environ["KAFKA_SCHEMA_REGISTRY_URL"] = "http://schema-registry:8085"

# The protobuf_value_serializer automatically uses Schema Registry
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    value_serializer=protobuf.protobuf_value_serializer,
)
```

### Schema Registry with Authentication

```python
import os
from confluent_kafka import schema_registry

# Configure Schema Registry with authentication
schema_registry_client = schema_registry.SchemaRegistryClient({
    "url": "https://schema-registry.example.com",
    "basic.auth.user.info": "username:password",
})

# Custom serializer with authenticated client
def custom_protobuf_serializer(event: cqrs.NotificationEvent):
    protobuf_event = event.proto()
    protobuf_serializer = protobuf.ProtobufSerializer(
        protobuf_event.__class__,
        schema_registry_client,
        {"use.deprecated.format": False},
    )
    # ... serialization logic
```

## Complete Examples

### Complete Producer Example

```python
import asyncio
import os
import ssl

import pydantic
import cqrs
from cqrs.message_brokers import kafka, protocol as broker_protocol
from cqrs.adapters.kafka import KafkaProducerAdapter
from cqrs.serializers import protobuf
from your_proto_module import UserCreatedProtobuf

# Set schema registry URL
os.environ["KAFKA_SCHEMA_REGISTRY_URL"] = "http://localhost:8085"

# Event payload
class UserCreatedPayload(pydantic.BaseModel, frozen=True):
    user_id: str
    email: str
    name: str

# Event with Protobuf support
class UserCreatedEvent(cqrs.NotificationEvent[UserCreatedPayload], frozen=True):
    def proto(self) -> UserCreatedProtobuf:
        return UserCreatedProtobuf(
            event_id=str(self.event_id),
            event_timestamp=str(self.event_timestamp),
            event_name=self.event_name,
            payload=UserCreatedProtobuf.Payload(
                user_id=self.payload.user_id,
                email=self.payload.email,
                name=self.payload.name,
            ),
        )

async def produce_protobuf_event():
    # Create event
    event = UserCreatedEvent(
        event_name="user_created",
        topic="user_events_proto",
        payload=UserCreatedPayload(
            user_id="123",
            email="user@example.com",
            name="John Doe"
        ),
    )
    
    # Create Kafka producer with Protobuf serializer
    kafka_producer = KafkaProducerAdapter(
        bootstrap_servers=["localhost:9092"],
        value_serializer=protobuf.protobuf_value_serializer,
    )
    
    # Create message broker
    broker = kafka.KafkaMessageBroker(producer=kafka_producer)
    
    # Publish event
    await broker.send_message(
        message=broker_protocol.Message(
            message_name=event.event_name,
            message_id=event.event_id,
            topic=event.topic,
            payload=event.model_dump(mode="json"),
        ),
    )

if __name__ == "__main__":
    asyncio.run(produce_protobuf_event())
```

### Complete Consumer Example

```python
import asyncio
import functools
import logging

import di
import faststream
import pydantic
from faststream import kafka

import cqrs
from cqrs.deserializers import protobuf
from cqrs.events import bootstrap
from your_proto_module import UserCreatedProtobuf

logging.basicConfig(level=logging.INFO)
logging.getLogger("aiokafka").setLevel(logging.ERROR)

broker = kafka.KafkaBroker(bootstrap_servers=["localhost:9092"])
app = faststream.FastStream(broker)

# Event payload
class UserCreatedPayload(pydantic.BaseModel, frozen=True):
    user_id: str
    email: str
    name: str

# Event with Protobuf support
class UserCreatedEvent(cqrs.NotificationEvent[UserCreatedPayload], frozen=True):
    def proto(self) -> UserCreatedProtobuf:
        return UserCreatedProtobuf(
            event_id=str(self.event_id),
            event_timestamp=str(self.event_timestamp),
            event_name=self.event_name,
            payload=UserCreatedProtobuf.Payload(
                user_id=self.payload.user_id,
                email=self.payload.email,
                name=self.payload.name,
            ),
        )

# Event handler (defined elsewhere)
class UserCreatedEventHandler(cqrs.EventHandler[UserCreatedEvent]):
    async def handle(self, event: UserCreatedEvent) -> None:
        print(f"User {event.payload.user_id} created: {event.payload.email}")

# Event mapper
def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(UserCreatedEvent, UserCreatedEventHandler)

# Mediator factory
@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.EventMediator:
    return bootstrap.bootstrap(
        di_container=di.Container(),
        events_mapper=events_mapper,
    )

# Kafka subscriber with Protobuf
@broker.subscriber(
    "user_events_proto",
    group_id="protobuf-service",
    auto_commit=False,
    auto_offset_reset="earliest",
    value_deserializer=protobuf.ProtobufValueDeserializer(
        model=UserCreatedEvent,
        protobuf_model=UserCreatedProtobuf,
    ),
)
async def handle_user_event(
    body: UserCreatedEvent | protobuf.DeserializeProtobufError | None,
    msg: kafka.KafkaMessage,
    mediator: cqrs.EventMediator = faststream.Depends(mediator_factory),
):
    if isinstance(body, protobuf.DeserializeProtobufError):
        print(f"Deserialization error: {body.error_message}")
        await msg.nack()
        return
    
    if body is not None:
        await mediator.send(body)
        await msg.ack()

if __name__ == "__main__":
    asyncio.run(app.run())
```

## Best Practices

### 1. Always Use Schema Registry

Schema Registry ensures schema compatibility and versioning:

```python
os.environ["KAFKA_SCHEMA_REGISTRY_URL"] = "http://schema-registry:8085"
```

### 2. Handle Deserialization Errors

Always check for `DeserializeProtobufError`:

```python
if isinstance(body, protobuf.DeserializeProtobufError):
    logger.error(f"Deserialization error: {body.error_message}")
    await msg.nack()
    return
```

### 3. Use Frozen Models

Use `frozen=True` for event payloads to ensure immutability:

```python
class UserCreatedPayload(pydantic.BaseModel, frozen=True):
    user_id: str
    email: str
```

### 4. Implement proto() Method Correctly

Ensure the `proto()` method correctly maps all fields:

```python
def proto(self) -> UserCreatedProtobuf:
    return UserCreatedProtobuf(
        event_id=str(self.event_id),
        event_timestamp=str(self.event_timestamp),
        event_name=self.event_name,
        payload=UserCreatedProtobuf.Payload(
            # Map all payload fields
        ),
    )
```

### 5. Schema Evolution

Protobuf supports schema evolution. When adding new fields:

- Use optional fields for backward compatibility
- Don't remove fields, mark them as deprecated
- Test schema compatibility before deployment

### 6. Error Logging

Log deserialization errors with context:

```python
if isinstance(body, protobuf.DeserializeProtobufError):
    logger.error(
        f"Failed to deserialize Protobuf message: {body.error_message}",
        extra={
            "error_type": body.error_type.__name__,
            "topic": msg.topic,
            "partition": msg.partition,
        }
    )
```

### 7. Performance Considerations

- Protobuf is faster than JSON for large payloads
- Use Protobuf for high-throughput scenarios
- Consider compression for very large messages
- Monitor schema registry performance

### 8. Testing

Test Protobuf serialization/deserialization:

```python
# Test event to Protobuf conversion
event = UserCreatedEvent(...)
proto_event = event.proto()
assert proto_event.event_id == str(event.event_id)

# Test Protobuf to event conversion
deserialized = UserCreatedEvent.model_validate(proto_event)
assert deserialized.event_id == event.event_id
```
