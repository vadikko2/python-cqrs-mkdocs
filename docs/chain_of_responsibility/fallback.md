# Chain of Responsibility Fallback

<div class="grid cards" markdown>

-   :material-home: **Back to Chain of Responsibility Overview**

    Return to the Chain of Responsibility overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview

You can combine **Chain of Responsibility** with **Request Handler Fallback**: the primary handler is a `RequestHandler` that delegates to a COR chain; when the chain raises (e.g. downstream failure), the fallback handler is invoked. This is useful when a request is first tried through a chain (e.g. cache → DB → external API) and you want a default/cached response if the whole chain fails.

| Concept | Description |
|---------|-------------|
| **Primary** | A `RequestHandler` that runs the COR chain (e.g. injects chain entry via DI) |
| **Fallback** | A `RequestHandler` used when the chain raises |
| **Flow** | `mediator.send(request)` dispatches to primary; primary calls the chain; on exception, fallback runs |

!!! tip "When to Use"
    Use COR + Fallback when you have a chain of strategies (CoR) and a clear fallback path if the entire chain fails (e.g. connection errors to the last handler).

## Registration

Bind the request type to `RequestHandlerFallback` with a **wrapper** handler as primary (the one that runs the chain) and a simple handler as fallback:

```python
import cqrs
from cqrs.requests.cor_request_handler import CORRequestHandler, build_chain

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(
        FetchDataCommand,
        cqrs.RequestHandlerFallback(
            primary=CORChainWrapperHandler,   # RequestHandler that delegates to chain
            fallback=FallbackFetchDataHandler,
            failure_exceptions=(ConnectionError, TimeoutError),
        ),
    )
```

Build the chain and inject the chain entry (first handler) so the wrapper receives it:

```python
source_a = SourceAHandler()
source_b = SourceBHandler()
default = DefaultChainHandler()
build_chain([source_a, source_b, default])

di_container.bind(
    di.bind_by_type(
        dependent.Dependent(lambda: source_a, scope="request"),
        SourceAHandler,
    ),
)

mediator = bootstrap.bootstrap(
    di_container=di_container,
    commands_mapper=commands_mapper,
)
```

## Wrapper Handler

The primary handler is a normal `RequestHandler` that holds the chain entry and delegates:

```python
class CORChainWrapperHandler(
    cqrs.RequestHandler[FetchDataCommand, FetchDataResult],
):
    """Primary handler: runs the COR chain; chain entry injected via DI."""

    def __init__(self, chain_entry: SourceAHandler) -> None:
        self._chain_entry = chain_entry

    @property
    def events(self) -> list[cqrs.Event]:
        return []

    async def handle(self, request: FetchDataCommand) -> FetchDataResult:
        result = await self._chain_entry.handle(request)
        if result is None:
            raise ValueError("COR chain did not handle the request")
        return result
```

When any handler in the chain raises (e.g. `ConnectionError`), the dispatcher catches it and invokes the fallback handler. Use `failure_exceptions` to restrict fallback to specific exception types.

## Fallback Handler

The fallback is a simple `RequestHandler` that returns a default or cached response:

```python
class FallbackFetchDataHandler(
    cqrs.RequestHandler[FetchDataCommand, FetchDataResult],
):
    @property
    def events(self) -> list[cqrs.Event]:
        return []

    async def handle(self, request: FetchDataCommand) -> FetchDataResult:
        return FetchDataResult(
            data="cached_or_default",
            source="fallback",
        )
```

## Circuit Breaker configuration

CoR + Fallback uses `RequestHandlerFallback`, so Circuit Breaker is configured the same way as for [Request Handler Fallback](../request_handler/fallback.md#circuit-breaker-optional).

- **Adapter:** `AioBreakerAdapter` from `cqrs.adapters.circuit_breaker`.
- **Parameters:** `fail_max` (default `5`), `timeout_duration` (seconds, default `60`), `exclude` (exceptions that do not open the circuit), optional `storage_factory` for distributed state.
- **One instance per domain** — e.g. one adapter for request fallbacks (including COR wrapper); the adapter creates an isolated circuit per handler type.

Example:

```python
from cqrs.adapters.circuit_breaker import AioBreakerAdapter

request_cb = AioBreakerAdapter(fail_max=5, timeout_duration=60)
mapper.bind(
    FetchDataCommand,
    cqrs.RequestHandlerFallback(
        primary=CORChainWrapperHandler,
        fallback=FallbackFetchDataHandler,
        failure_exceptions=(ConnectionError, TimeoutError),
        circuit_breaker=request_cb,
    ),
)
```

Full configuration (exclude, storage_factory, failure_exceptions) is described in [Request Handler Fallback — Circuit Breaker configuration](../request_handler/fallback.md#circuit-breaker-configuration) and [Saga Fallback — Circuit Breaker](../saga/fallback/circuit_breaker.md).

## Related

- [Request Handler Fallback](../request_handler/fallback.md) — Fallback for command/query handlers
- [Chain of Responsibility Examples](examples.md) — Registering and building COR chains
- [Saga Fallback Pattern](../saga/fallback/index.md) — Fallback for saga steps
