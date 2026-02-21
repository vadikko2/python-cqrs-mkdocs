# Request Handler Fallback

<div class="grid cards" markdown>

-   :material-home: **Back to Request Handlers Overview**

    Return to the Request Handlers overview page.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview

The **Request Handler Fallback** pattern allows you to register an alternative handler that runs when the primary request handler fails (or when the circuit breaker is open). This provides resilience for commands and queries when the primary path (e.g. database or external API) is unavailable.

| Concept | Description |
|---------|-------------|
| **Primary handler** | Main request handler that executes first |
| **Fallback handler** | Alternative handler invoked on primary failure or circuit open |
| **failure_exceptions** | Optional tuple of exception types that trigger fallback; if empty, any exception |
| **Circuit Breaker** | Optional; after threshold failures, primary is not called, fallback runs immediately |

!!! tip "When to Use"
    Use Request Handler Fallback when you need resilient reads or writes: cached/default responses when the primary path fails, or when integrating with external services that may be temporarily unavailable.

## Registration

Bind the request type to `RequestHandlerFallback(primary, fallback, ...)` in your commands or queries mapper:

```python
import cqrs

def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(
        GetUserProfileCommand,
        cqrs.RequestHandlerFallback(
            primary=PrimaryGetUserProfileHandler,
            fallback=FallbackGetUserProfileHandler,
            failure_exceptions=(ConnectionError, TimeoutError),  # optional
            circuit_breaker=request_cb,  # optional
        ),
    )
```

- **primary** — The primary request handler class (`RequestHandler` or `StreamingRequestHandler`).
- **fallback** — The fallback handler class; must handle the same request/response types.
- **failure_exceptions** — If non-empty, only these exception types trigger fallback; otherwise any exception triggers fallback.
- **circuit_breaker** — Optional `ICircuitBreaker` instance (e.g. `AioBreakerAdapter`). Use one instance per domain (e.g. one for requests). When the circuit is open, the primary handler is not called and the fallback runs immediately.

## Basic Example

```python
class GetUserProfileCommand(cqrs.Request):
    user_id: str

class UserProfileResult(cqrs.Response):
    user_id: str
    name: str
    source: str  # "primary" or "fallback"

class PrimaryGetUserProfileHandler(
    cqrs.RequestHandler[GetUserProfileCommand, UserProfileResult],
):
    @property
    def events(self) -> list[cqrs.Event]:
        return []

    async def handle(self, request: GetUserProfileCommand) -> UserProfileResult:
        # e.g. database call that may raise
        raise ConnectionError("Database unavailable")

class FallbackGetUserProfileHandler(
    cqrs.RequestHandler[GetUserProfileCommand, UserProfileResult],
):
    @property
    def events(self) -> list[cqrs.Event]:
        return []

    async def handle(self, request: GetUserProfileCommand) -> UserProfileResult:
        return UserProfileResult(
            user_id=request.user_id,
            name="Unknown User",
            source="fallback",
        )

# In mapper:
mapper.bind(
    GetUserProfileCommand,
    cqrs.RequestHandlerFallback(
        primary=PrimaryGetUserProfileHandler,
        fallback=FallbackGetUserProfileHandler,
        failure_exceptions=(ConnectionError, TimeoutError),
    ),
)
```

The mediator dispatches to the primary handler; on exception (or when the circuit is open), the fallback handler is invoked. The response and events from the handler that actually ran are returned.

## Circuit Breaker (optional)

To use a circuit breaker, install the optional dependency and pass an adapter instance:

```bash
pip install aiobreaker
# or: pip install python-cqrs[aiobreaker]
```

```python
from cqrs.adapters.circuit_breaker import AioBreakerAdapter

request_cb = AioBreakerAdapter(fail_max=5, timeout_duration=60)
mapper.bind(
    GetUserProfileCommand,
    cqrs.RequestHandlerFallback(
        primary=PrimaryGetUserProfileHandler,
        fallback=FallbackGetUserProfileHandler,
        failure_exceptions=(ConnectionError, TimeoutError),
        circuit_breaker=request_cb,
    ),
)
```

After `fail_max` failures, the circuit opens: the primary handler is not called and the fallback runs immediately. See [Saga Fallback — Circuit Breaker](../saga/fallback/circuit_breaker.md) for the same three-state pattern (CLOSED / OPEN / HALF_OPEN).

### Circuit Breaker configuration

Adapter `AioBreakerAdapter` (from `cqrs.adapters.circuit_breaker`) implements `ICircuitBreaker` and accepts the following parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `fail_max` | Number of failures before opening the circuit | `5` |
| `timeout_duration` | Seconds to wait before attempting HALF_OPEN (retry) | `60` |
| `exclude` | Exception types that **do not** count as failures (e.g. business errors) | `[]` |
| `storage_factory` | Factory `(name: str) -> storage` for circuit state; default is in-memory | in-memory |

**Example with `exclude`** — business exceptions do not open the circuit:

```python
class UserNotFoundError(Exception):
    pass

request_cb = AioBreakerAdapter(
    fail_max=5,
    timeout_duration=60,
    exclude=[UserNotFoundError],  # 404-style errors don't open the circuit
)
mapper.bind(
    GetUserProfileCommand,
    cqrs.RequestHandlerFallback(
        primary=PrimaryGetUserProfileHandler,
        fallback=FallbackGetUserProfileHandler,
        circuit_breaker=request_cb,
    ),
)
```

**One instance per domain** — use a single `AioBreakerAdapter` instance for all request fallbacks that share the same policy (e.g. one for commands). The adapter creates an isolated circuit per handler type (identifier = handler class).

**Storage:** By default the circuit state is in-memory (per process). For distributed apps, you can pass a `storage_factory` that returns Redis (or other) storage so the circuit state is shared across instances. See [Saga Fallback — Circuit Breaker: Storage Configuration](../saga/fallback/circuit_breaker.md#storage-configuration-memory-vs-redis).

**Failure filtering:** Use `failure_exceptions` on `RequestHandlerFallback` to restrict which exceptions trigger fallback; use `exclude` on `AioBreakerAdapter` to prevent certain exceptions from opening the circuit. Details: [Saga Fallback — Circuit Breaker: Failure Exception Filtering and Business Exception Exclusion](../saga/fallback/circuit_breaker.md#failure-exception-filtering).

## Streaming Handlers

`RequestHandlerFallback` also supports **streaming handlers**. Both `primary` and `fallback` can be `StreamingRequestHandler`. When the primary stream raises (e.g. after yielding some items), the dispatcher switches to the fallback handler's stream. See [Stream Handling Fallback](../stream_handling/fallback.md) for details.

## Related

- [Event Handler Fallback](../event_handler/fallback.md) — Fallback for event handlers
- [Stream Handling Fallback](../stream_handling/fallback.md) — Fallback for streaming handlers
- [Chain of Responsibility](../chain_of_responsibility/index.md) — Can be combined with fallback (COR as primary)
- [Saga Fallback Pattern](../saga/fallback/index.md) — Fallback for saga steps
