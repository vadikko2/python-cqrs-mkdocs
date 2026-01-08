# Event Producing

## Overview

Event producing allows you to publish events to message brokers (Kafka, RabbitMQ) for asynchronous processing. The `python-cqrs` package provides message broker abstractions that support both JSON and Protobuf serialization.

**Key Features:**

- **Multiple Brokers** — Support for Kafka and RabbitMQ
- **Serialization Formats** — JSON support (Protobuf support available, see [Protobuf Integration](protobuf.md))
- **Type Safety** — Full Pydantic v2 support for event payloads
- **Error Handling** — Built-in retry and error handling

!!! note "Prerequisites"
    Understanding of [Event Handling](event_handler/index.md) and [Bootstrap](bootstrap/index.md) is required. Events are automatically published when command handlers emit them.

!!! tip "Related Topics"
    - [FastStream Integration](faststream.md) — For consuming events from message brokers
    - [Protobuf Integration](protobuf.md) — For Protobuf serialization
    - [Transaction Outbox](outbox/index.md) — For reliable event delivery

## Basic Event Producing

Events are produced through the `EventEmitter` which is configured in the bootstrap process:

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import devnull

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(CreateUserCommand, CreateUserCommandHandler)

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(UserCreatedEvent, UserCreatedEventHandler)

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=devnull.DevnullMessageBroker(),  # For testing
)
```

When a command handler emits events, they are automatically published to the configured message broker.

## Kafka Event Producing

### Basic Kafka Producer Setup

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import kafka
from cqrs.adapters.kafka import KafkaProducerAdapter

# Create Kafka producer adapter
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    client_id="my-app",
)

# Create message broker
kafka_broker = kafka.KafkaMessageBroker(
    producer=kafka_producer,
    aiokafka_log_level="ERROR",
)

# Bootstrap with Kafka broker
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=kafka_broker,
)
```

### Kafka Producer with SSL/TLS

```python
import ssl
from cqrs.adapters.kafka import KafkaProducerAdapter

# Create SSL context
ssl_context = ssl.create_default_context()

kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["kafka.example.com:9093"],
    security_protocol="SASL_SSL",
    sasl_mechanism="SCRAM-SHA-256",
    sasl_plain_username="username",
    sasl_plain_password="password",
    ssl_context=ssl_context,
)

kafka_broker = kafka.KafkaMessageBroker(producer=kafka_producer)
```

### Kafka Producer Configuration

```python
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    client_id="my-app",
    acks="all",  # Wait for all replicas
    enable_idempotence=True,  # Exactly-once semantics
    max_in_flight_requests_per_connection=5,
    retry_count=3,
    retry_delay=1,
)

kafka_broker = kafka.KafkaMessageBroker(
    producer=kafka_producer,
    aiokafka_log_level="ERROR",
)
```

## RabbitMQ Event Producing

### Basic RabbitMQ Producer Setup

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import amqp
from cqrs.adapters.amqp import AMQPPublisherAdapter

# Create AMQP publisher
amqp_publisher = AMQPPublisherAdapter(
    dsn="amqp://user:password@localhost:5672/",
)

# Create message broker
amqp_broker = amqp.AMQPMessageBroker(
    publisher=amqp_publisher,
    exchange_name="events",
    pika_log_level="ERROR",
)

# Bootstrap with RabbitMQ broker
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=amqp_broker,
)
```

### RabbitMQ with Connection Pooling

```python
from cqrs.adapters.amqp import amqp_publisher_factory, amqp_connection_pool_factory
import aio_pika

# Create connection pool
connection_pool = amqp_connection_pool_factory(
    url="amqp://user:password@localhost:5672/",
    pool_size=10,
)

# Create publisher with pool
amqp_publisher = amqp_publisher_factory(
    connection_pool=connection_pool,
)

amqp_broker = amqp.AMQPMessageBroker(
    publisher=amqp_publisher,
    exchange_name="events",
)
```

For Protobuf event producing, see the [Protobuf Integration](protobuf.md) documentation.

## Complete Examples

### Kafka JSON Example

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import kafka
from cqrs.adapters.kafka import KafkaProducerAdapter

# Create Kafka producer
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    client_id="my-app",
    acks="all",
    enable_idempotence=True,
)

# Create message broker
kafka_broker = kafka.KafkaMessageBroker(
    producer=kafka_producer,
    aiokafka_log_level="ERROR",
)

# Bootstrap
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=kafka_broker,
)
```

### RabbitMQ JSON Example

```python
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import amqp
from cqrs.adapters.amqp import AMQPPublisherAdapter

# Create AMQP publisher
amqp_publisher = AMQPPublisherAdapter(
    dsn="amqp://guest:guest@localhost:5672/",
)

# Create message broker
amqp_broker = amqp.AMQPMessageBroker(
    publisher=amqp_publisher,
    exchange_name="events",
    pika_log_level="ERROR",
)

# Bootstrap
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=events_mapper,
    message_broker=amqp_broker,
)
```

## Best Practices

### 1. Use Appropriate Serialization

Choose serialization format based on your needs:

- **JSON** — Human-readable, easy to debug, larger message size
- **Protobuf** — See [Protobuf Integration](protobuf.md) for Protobuf serialization

### 2. Configure Producer Settings

For Kafka, configure producer for reliability:

```python
kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["localhost:9092"],
    acks="all",  # Wait for all replicas
    enable_idempotence=True,  # Exactly-once semantics
    retry_count=3,
    retry_delay=1,
)
```

### 3. Use Connection Pooling

For RabbitMQ, use connection pooling for better performance:

```python
connection_pool = amqp_connection_pool_factory(
    url="amqp://user:password@localhost:5672/",
    pool_size=10,
)
```

### 4. Error Handling

Handle producer errors appropriately:

```python
try:
    await broker.send_message(message)
except Exception as e:
    logger.error(f"Failed to publish event: {e}")
    # Implement retry logic or dead letter queue
```

### 5. Protobuf Serialization

For Protobuf serialization, see the [Protobuf Integration](protobuf.md) documentation.

### 6. Logging

Suppress verbose broker logging:

```python
logging.getLogger("aiokafka").setLevel(logging.ERROR)  # Kafka
logging.getLogger("aio_pika").setLevel(logging.ERROR)  # RabbitMQ
```

### 7. Security

Use SSL/TLS for production:

```python
ssl_context = ssl.create_default_context()

kafka_producer = KafkaProducerAdapter(
    bootstrap_servers=["kafka.example.com:9093"],
    security_protocol="SASL_SSL",
    sasl_mechanism="SCRAM-SHA-256",
    ssl_context=ssl_context,
)
```
