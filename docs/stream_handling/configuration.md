# Configuration

See [Stream Handling Overview](index.md) for general information.

---

## Overview


To use streaming handlers, you need to bootstrap a `StreamingRequestMediator`:

```python
import functools
from cqrs.requests import bootstrap

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(ProcessFilesCommand, ProcessFilesCommandHandler)

def domain_events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(FileProcessedEvent, FileProcessedEventHandler)

@functools.cache
def streaming_mediator_factory() -> cqrs.StreamingRequestMediator:
    return bootstrap.bootstrap_streaming(
        di_container=container,
        commands_mapper=commands_mapper,
        domain_events_mapper=domain_events_mapper,
        message_broker=broker,
        max_concurrent_event_handlers=3,  # Process up to 3 events in parallel
        concurrent_event_handle_enable=True,  # Enable parallel processing
    )
```


Once you have a streaming mediator, you can stream results:

```python
mediator = streaming_mediator_factory()

command = ProcessFilesCommand(file_ids=["file1", "file2", "file3"])

# Stream results as they become available
async for result in mediator.stream(command):
    if result is not None:
        print(f"Processed: {result.file_id} - {result.status}")
```


Streaming handlers support parallel event processing. After each yield, events are collected and can be processed concurrently:

```python
class ProcessOrdersCommandHandler(
    cqrs.StreamingRequestHandler[ProcessOrdersCommand, OrderProcessedResult]
):
    def __init__(self):
        self._events: list[Event] = []

    @property
    def events(self) -> list[Event]:
        return self._events.copy()

    def clear_events(self) -> None:
        self._events.clear()

    async def handle(
        self, request: ProcessOrdersCommand
    ) -> typing.AsyncIterator[OrderProcessedResult]:
        for order_id in request.order_ids:
            # Process order
            result = OrderProcessedResult(order_id=order_id, ...)
            
            # Emit multiple events that will be processed in parallel
            self._events.append(OrderProcessedEvent(order_id=order_id, ...))
            self._events.append(OrderAnalyticsEvent(order_id=order_id, ...))
            self._events.append(InventoryUpdateEvent(order_id=order_id, ...))
            self._events.append(AuditLogEvent(order_id=order_id, ...))
            
            yield result
            # Events are processed in parallel after each yield
```

### Configuration

Control parallel event processing with these parameters:

- **`max_concurrent_event_handlers`** — Maximum number of event handlers that can run simultaneously (default: `10` for streaming mediator)
- **`concurrent_event_handle_enable`** — Enable/disable parallel processing (default: `True` for streaming mediator)

```python
mediator = bootstrap.bootstrap_streaming(
    di_container=container,
    commands_mapper=commands_mapper,
    domain_events_mapper=domain_events_mapper,
    max_concurrent_event_handlers=5,  # Process up to 5 events in parallel
    concurrent_event_handle_enable=True,  # Enable parallel processing
)
```

!!! tip "Configuration Tips"
    - Set `max_concurrent_event_handlers` to limit resource consumption
    - Set `concurrent_event_handle_enable=False` to process events sequentially
    - Higher concurrency improves performance but uses more resources
