# Streaming Mediator

See [Bootstrap Overview](index.md) for general information.

---

## Overview

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
