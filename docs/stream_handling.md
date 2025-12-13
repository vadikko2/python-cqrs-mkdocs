# Stream Handling

## Table of Contents

- [Overview](#overview)
- [Basic Example](#basic-example)
- [Bootstrap Setup](#bootstrap-setup)
- [Using the Streaming Mediator](#using-the-streaming-mediator)
- [Parallel Event Processing](#parallel-event-processing)
- [FastAPI Integration with SSE](#fastapi-integration-with-sse)
- [Complete Example](#complete-example)
- [Key Features](#key-features)
- [Use Cases](#use-cases)
- [Best Practices](#best-practices)
- [Differences from Regular Handlers](#differences-from-regular-handlers)

Stream handling allows you to process requests incrementally and yield results as they become available. This is particularly useful for processing large batches of items, file uploads, or any operation that benefits from real-time progress updates.

## Overview

`StreamingRequestHandler` works with `StreamingRequestMediator` to process requests incrementally. The handler yields results as they become available, and events are processed after each yield. This enables:

- **Real-time progress updates** — Clients receive results as they're processed
- **Better user experience** — No need to wait for entire batch to complete
- **Parallel event processing** — Events can be processed concurrently while streaming
- **SSE integration** — Perfect for Server-Sent Events in web applications

## Basic Example

Here's a simple example of a streaming handler:

```python
import typing
from datetime import datetime
import cqrs
from cqrs.requests.request_handler import StreamingRequestHandler
from cqrs.events.event import Event

class ProcessFilesCommand(cqrs.Request):
    file_ids: list[str]

class FileProcessedResult(cqrs.Response):
    file_id: str
    status: str
    processed_at: datetime

class ProcessFilesCommandHandler(
    StreamingRequestHandler[ProcessFilesCommand, FileProcessedResult]
):
    def __init__(self):
        self._events: list[Event] = []

    @property
    def events(self) -> list[Event]:
        return self._events.copy()

    def clear_events(self) -> None:
        self._events.clear()

    async def handle(
        self, request: ProcessFilesCommand
    ) -> typing.AsyncIterator[FileProcessedResult]:
        for file_id in request.file_ids:
            # Process file
            result = FileProcessedResult(
                file_id=file_id,
                status="completed",
                processed_at=datetime.now()
            )
            
            # Emit events
            self._events.append(
                FileProcessedEvent(file_id=file_id, ...)
            )
            
            # Yield result - events will be processed after this yield
            yield result
```

## Bootstrap Setup

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

## Using the Streaming Mediator

Once you have a streaming mediator, you can stream results:

```python
mediator = streaming_mediator_factory()

command = ProcessFilesCommand(file_ids=["file1", "file2", "file3"])

# Stream results as they become available
async for result in mediator.stream(command):
    if result is not None:
        print(f"Processed: {result.file_id} - {result.status}")
```

## Parallel Event Processing

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

> [!TIP]
> - Set `max_concurrent_event_handlers` to limit resource consumption
> - Set `concurrent_event_handle_enable=False` to process events sequentially
> - Higher concurrency improves performance but uses more resources

## FastAPI Integration with SSE

`StreamingRequestMediator` is designed for use with Server-Sent Events (SSE) in FastAPI applications:

```python
import fastapi
import json
from cqrs.requests import bootstrap

def streaming_mediator_factory() -> cqrs.StreamingRequestMediator:
    return bootstrap.bootstrap_streaming(
        di_container=container,
        commands_mapper=commands_mapper,
        domain_events_mapper=domain_events_mapper,
        message_broker=broker,
        max_concurrent_event_handlers=3,
        concurrent_event_handle_enable=True,
    )

@app.post("/process-files")
async def process_files_stream(
    command: ProcessFilesCommand,
    mediator: cqrs.StreamingRequestMediator = fastapi.Depends(
        streaming_mediator_factory
    ),
) -> fastapi.responses.StreamingResponse:
    async def generate_sse():
        yield f"data: {json.dumps({'type': 'start', 'message': 'Processing...'})}\n\n"

        async for result in mediator.stream(command):
            if result is None:
                continue
            
            sse_data = {
                "type": "progress",
                "data": result.model_dump(),
            }
            yield f"data: {json.dumps(sse_data)}\n\n"

        yield f"data: {json.dumps({'type': 'complete'})}\n\n"

    return fastapi.responses.StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
    )
```

## Complete Example

Here's a complete example demonstrating streaming handlers with parallel event processing:

```python
import asyncio
import typing
from datetime import datetime
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.message_brokers import devnull

# Domain models
class ProcessOrdersCommand(cqrs.Request):
    order_ids: list[str]

class OrderProcessedResult(cqrs.Response):
    order_id: str
    status: str
    processed_at: datetime
    items_count: int

# Domain events
class OrderProcessedEvent(cqrs.DomainEvent, frozen=True):
    order_id: str
    customer_id: str
    total_amount: float

class OrderAnalyticsEvent(cqrs.DomainEvent, frozen=True):
    order_id: str
    category: str

# Streaming handler
class ProcessOrdersCommandHandler(
    cqrs.StreamingRequestHandler[ProcessOrdersCommand, OrderProcessedResult]
):
    def __init__(self):
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events.copy()

    def clear_events(self) -> None:
        self._events.clear()

    async def handle(
        self, request: ProcessOrdersCommand
    ) -> typing.AsyncIterator[OrderProcessedResult]:
        for order_id in request.order_ids:
            # Simulate processing
            await asyncio.sleep(0.1)
            
            # Create result
            result = OrderProcessedResult(
                order_id=order_id,
                status="processed",
                processed_at=datetime.now(),
                items_count=3,
            )
            
            # Emit multiple events
            self._events.append(
                OrderProcessedEvent(
                    order_id=order_id,
                    customer_id=f"customer_{order_id}",
                    total_amount=100.0,
                )
            )
            self._events.append(
                OrderAnalyticsEvent(
                    order_id=order_id,
                    category="electronics",
                )
            )
            
            yield result

# Event handlers
class OrderProcessedEventHandler(cqrs.EventHandler[OrderProcessedEvent]):
    async def handle(self, event: OrderProcessedEvent) -> None:
        print(f"Order {event.order_id} processed for customer {event.customer_id}")

class OrderAnalyticsEventHandler(cqrs.EventHandler[OrderAnalyticsEvent]):
    async def handle(self, event: OrderAnalyticsEvent) -> None:
        print(f"Analytics updated for order {event.order_id} in category {event.category}")

# Mappers
def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(ProcessOrdersCommand, ProcessOrdersCommandHandler)

def domain_events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(OrderProcessedEvent, OrderProcessedEventHandler)
    mapper.bind(OrderAnalyticsEvent, OrderAnalyticsEventHandler)

# Bootstrap
async def main():
    mediator = bootstrap.bootstrap_streaming(
        di_container=di.Container(),
        commands_mapper=commands_mapper,
        domain_events_mapper=domain_events_mapper,
        message_broker=devnull.DevnullMessageBroker(),
        max_concurrent_event_handlers=3,
        concurrent_event_handle_enable=True,
    )
    
    command = ProcessOrdersCommand(order_ids=["order1", "order2", "order3"])
    
    async for result in mediator.stream(command):
        print(f"Processed: {result.order_id}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Key Features

### Incremental Processing

Streaming handlers process items one at a time, yielding results as they become available. This allows clients to receive progress updates in real-time.

### Event Emission

After each yield, events are collected and can be emitted. Events are processed after each yield, allowing for parallel processing of side effects.

### Parallel Event Processing

Events can be processed concurrently with configurable concurrency limits. This improves performance when multiple event handlers need to process events independently.

### SSE Integration

Streaming handlers work seamlessly with Server-Sent Events (SSE) in FastAPI, enabling real-time progress updates in web applications.

## Use Cases

Streaming handlers are ideal for:

- **Batch processing** — Processing large batches of items with progress updates
- **File uploads** — Processing uploaded files one by one
- **Data import** — Importing data with real-time progress
- **Long-running operations** — Operations that take time and benefit from progress updates
- **Real-time updates** — Applications that need to show progress to users

## Best Practices

1. **Clear events after processing** — Implement `clear_events()` to prevent event accumulation
2. **Use appropriate concurrency limits** — Set `max_concurrent_event_handlers` based on your resource constraints
3. **Handle errors gracefully** — Wrap streaming logic in try-except blocks
4. **Yield meaningful results** — Include progress information in response objects
5. **Use SSE for web applications** — Stream results via SSE for better user experience

## Differences from Regular Handlers

| Feature | Regular Handler | Streaming Handler |
|---------|----------------|-------------------|
| Response | Single response | Multiple responses (yielded) |
| Processing | All at once | Incremental |
| Progress Updates | Not available | Real-time |
| Event Processing | After completion | After each yield |
| Use Case | Simple operations | Batch/long-running operations |

Choose streaming handlers when you need incremental processing and real-time progress updates. Use regular handlers for simple, atomic operations.
