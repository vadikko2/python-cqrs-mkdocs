# Stream Handling Fallback

<div class="grid cards" markdown>

-   :material-home: **Back to Stream Handling Overview**

    Return to the Stream Handling overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview

The **Stream Handling Fallback** uses the same `RequestHandlerFallback` wrapper as ordinary request handlers, but with **streaming handlers** as primary and fallback. When the primary streaming handler fails (e.g. raises after yielding some items), the dispatcher switches to the fallback streaming handler and consumes its stream. This is useful when the primary stream source (e.g. live API) can fail mid-way and you want to continue with a fallback stream (e.g. cached or degraded results).

| Concept | Description |
|---------|-------------|
| **Primary** | `StreamingRequestHandler` that yields first; may raise during iteration |
| **Fallback** | `StreamingRequestHandler` used when primary raises |
| **Flow** | `mediator.stream(request)` yields from primary until it raises, then yields from fallback |

!!! tip "When to Use"
    Use streaming fallback when you stream results from a primary source that can fail partway through (e.g. connection lost). The fallback can yield from cache or a degraded path so the client still receives a complete stream.

## Registration

Bind the streaming command to `RequestHandlerFallback` with both handlers as `StreamingRequestHandler`:

```python
import cqrs

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(
        StreamItemsCommand,
        cqrs.RequestHandlerFallback(
            primary=PrimaryStreamItemsHandler,
            fallback=FallbackStreamItemsHandler,
            failure_exceptions=(ConnectionError, TimeoutError),  # optional
            circuit_breaker=stream_cb,  # optional
        ),
    )
```

Use `bootstrap_streaming` to obtain a `StreamingRequestMediator`; when you call `mediator.stream(request)`, the dispatcher runs the primary handler's async generator. If the primary raises, the fallback handler's stream is used.

## Basic Example

```python
from typing import AsyncIterator
import cqrs
from cqrs.requests.request_handler import StreamingRequestHandler

class StreamItemsCommand(cqrs.Request):
    item_ids: list[str]

class StreamItemResult(cqrs.Response):
    item_id: str
    status: str
    source: str  # "primary" or "fallback"

class PrimaryStreamItemsHandler(
    cqrs.StreamingRequestHandler[StreamItemsCommand, StreamItemResult],
):
    def __init__(self) -> None:
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events.copy()

    def clear_events(self) -> None:
        self._events.clear()

    async def handle(
        self, request: StreamItemsCommand
    ) -> AsyncIterator[StreamItemResult]:
        for i, item_id in enumerate(request.item_ids):
            if i >= 2:
                raise ConnectionError("Stream connection lost")
            yield StreamItemResult(
                item_id=item_id, status="processed", source="primary"
            )

class FallbackStreamItemsHandler(
    cqrs.StreamingRequestHandler[StreamItemsCommand, StreamItemResult],
):
    # ... same events protocol ...

    async def handle(
        self, request: StreamItemsCommand
    ) -> AsyncIterator[StreamItemResult]:
        for item_id in request.item_ids:
            yield StreamItemResult(
                item_id=item_id, status="from_fallback", source="fallback"
            )

# Mapper
mapper.bind(
    StreamItemsCommand,
    cqrs.RequestHandlerFallback(
        primary=PrimaryStreamItemsHandler,
        fallback=FallbackStreamItemsHandler,
        failure_exceptions=(ConnectionError, TimeoutError),
    ),
)

# Usage: bootstrap_streaming(...), then:
async for response in mediator.stream(StreamItemsCommand(item_ids=["a", "b", "c", "d"])):
    if response is not None:
        print(response.item_id, response.source)  # primary, primary, fallback, fallback...
```

The client receives items from the primary stream until it raises, then items from the fallback stream. Optional `failure_exceptions` and `circuit_breaker` behave as for non-streaming [Request Handler Fallback](../request_handler/fallback.md).

## Circuit Breaker configuration

Streaming fallback uses the same `RequestHandlerFallback` wrapper, so Circuit Breaker is configured the same way as for [Request Handler Fallback](../request_handler/fallback.md#circuit-breaker-optional).

- **Adapter:** `AioBreakerAdapter` from `cqrs.adapters.circuit_breaker`.
- **Parameters:** `fail_max` (default `5`), `timeout_duration` (seconds, default `60`), `exclude` (exceptions that do not count as failures), optional `storage_factory` for Redis/distributed state.
- **One instance per domain** — e.g. one adapter for all streaming fallbacks that share the same policy; the adapter creates an isolated circuit per handler type.

Example:

```python
from cqrs.adapters.circuit_breaker import AioBreakerAdapter

stream_cb = AioBreakerAdapter(fail_max=3, timeout_duration=30)
mapper.bind(
    StreamItemsCommand,
    cqrs.RequestHandlerFallback(
        primary=PrimaryStreamItemsHandler,
        fallback=FallbackStreamItemsHandler,
        failure_exceptions=(ConnectionError, TimeoutError),
        circuit_breaker=stream_cb,
    ),
)
```

Full configuration options (exclude, storage_factory, failure_exceptions) are described in [Request Handler Fallback — Circuit Breaker configuration](../request_handler/fallback.md#circuit-breaker-configuration) and [Saga Fallback — Circuit Breaker](../saga/fallback/circuit_breaker.md).

## Related

- [Request Handler Fallback](../request_handler/fallback.md) — Same wrapper for non-streaming handlers
- [Stream Handling Configuration](configuration.md) — Bootstrap and mediator setup
- [Saga Fallback Pattern](../saga/fallback/index.md) — Fallback for saga steps
