# FastAPI Integration

See [Stream Handling Overview](index.md) for general information.

---

## Overview


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
