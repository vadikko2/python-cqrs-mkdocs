# Message Brokers

See [Bootstrap Overview](index.md) for general information.

---

## Overview

Message brokers are used to publish `NotificationEvent` and `ECSTEvent` events to external systems. The `python-cqrs` package supports multiple message broker implementations.

| Broker Type | Use Case | Production Ready |
|-------------|----------|------------------|
| **DevnullMessageBroker** | Testing, development | ❌ No |
| **KafkaMessageBroker** | High-throughput, distributed systems | ✅ Yes |
| **AMQPMessageBroker** | RabbitMQ, traditional message queues | ✅ Yes |

<details>
<summary><strong>Choosing a Message Broker</strong></summary>

<ul>
<li><strong>DevnullMessageBroker</strong>: Use for testing and development when you don't need actual message publishing</li>
<li><strong>KafkaMessageBroker</strong>: Use for high-throughput, distributed systems with strong ordering guarantees</li>
<li><strong>AMQPMessageBroker</strong>: Use for traditional message queue patterns, RabbitMQ integration</li>
</ul>

</details>

### DevnullMessageBroker

The `DevnullMessageBroker` is a no-op broker used for testing. It doesn't actually send messages anywhere but logs warnings.

!!! warning "Development Only"
    Never use `DevnullMessageBroker` in production. It's designed for testing and development only.

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
