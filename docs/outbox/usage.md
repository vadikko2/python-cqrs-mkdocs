# Usage

See [Transactional Outbox Overview](index.md) for general information.

---

## Overview


Events must be registered in `OutboxedEventMap` before they can be stored:

```python
import cqrs
from pydantic import BaseModel

class UserJoinedPayload(BaseModel, frozen=True):
    user_id: str
    meeting_id: str

# Register event type
cqrs.OutboxedEventMap.register(
    "user_joined",
    cqrs.NotificationEvent[UserJoinedPayload],
)
```

This registration is required for:
- Type safety when storing events
- Deserialization when reading events
- Validation of event structure


Events are published by a separate process using `EventProducer`:

```python
import asyncio
import cqrs
from cqrs.message_brokers import kafka
from cqrs.adapters import kafka as kafka_adapters

# Create message broker
broker = kafka.KafkaMessageBroker(
    producer=kafka_adapters.kafka_producer_factory(dsn="localhost:9092"),
)

# Create event producer
producer = cqrs.EventProducer(
    message_broker=broker,
    repository=outbox_repository,
)

# Publish events in batches
async def publish_events():
    async for events in producer.event_batch_generator():
        for event in events:
            await producer.send_message(event)
        await producer.repository.commit()
        await asyncio.sleep(10)  # Poll interval

asyncio.run(publish_events())
```
