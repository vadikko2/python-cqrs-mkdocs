# Event Handler Fallback

<div class="grid cards" markdown>

-   :material-home: **Back to Event Handling Overview**

    Return to the Event Handling overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview

The **Event Handler Fallback** pattern allows you to register an alternative event handler that runs when the primary event handler fails (or when the circuit breaker is open). This provides resilience for side effects such as sending notifications or updating read models when the primary path (e.g. external API) is unavailable.

| Concept | Description |
|---------|-------------|
| **Primary handler** | Main event handler that executes first |
| **Fallback handler** | Alternative handler invoked on primary failure or circuit open |
| **failure_exceptions** | Optional tuple of exception types that trigger fallback; if empty, any exception |
| **Circuit Breaker** | Optional; after threshold failures, primary is not called, fallback runs immediately |

!!! tip "When to Use"
    Use Event Handler Fallback when domain event side effects (notifications, read model updates, integrations) must degrade gracefully: e.g. enqueue for later or log when the primary handler (e.g. external notification API) fails.

## Registration

Bind the event type to `EventHandlerFallback(primary, fallback, ...)` in your domain events mapper:

```python
import cqrs

def events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(
        NotificationSent,
        cqrs.EventHandlerFallback(
            primary=PrimaryNotificationSentHandler,
            fallback=FallbackNotificationSentHandler,
            failure_exceptions=(ConnectionError, TimeoutError),  # optional
            circuit_breaker=event_cb,  # optional
        ),
    )
```

- **primary** — The primary event handler class (`EventHandler[EventType]`).
- **fallback** — The fallback event handler class; must handle the same event type.
- **failure_exceptions** — If non-empty, only these exception types trigger fallback; otherwise any exception triggers fallback.
- **circuit_breaker** — Optional `ICircuitBreaker` instance (e.g. `AioBreakerAdapter`). Use one instance per domain (e.g. one for events). When the circuit is open, the primary handler is not called and the fallback runs immediately.

## Basic Example

```python
class NotificationSent(cqrs.DomainEvent, frozen=True):
    user_id: str
    message: str

class PrimaryNotificationSentHandler(cqrs.EventHandler[NotificationSent]):
    async def handle(self, event: NotificationSent) -> None:
        # e.g. call external notification API
        raise RuntimeError("External notification service unavailable")

class FallbackNotificationSentHandler(cqrs.EventHandler[NotificationSent]):
    async def handle(self, event: NotificationSent) -> None:
        # e.g. enqueue for later or log
        logger.info("Enqueue notification for user %s: %s", event.user_id, event.message)

# In events mapper:
mapper.bind(
    NotificationSent,
    cqrs.EventHandlerFallback(
        primary=PrimaryNotificationSentHandler,
        fallback=FallbackNotificationSentHandler,
    ),
)
```

When a command handler emits `NotificationSent`, the event emitter runs the primary handler first. On exception (or when the circuit is open), the fallback handler is invoked. Events from the handler that actually ran are collected and processed.

## Circuit Breaker (optional)

To use a circuit breaker with event handlers:

```bash
pip install aiobreaker
# or: pip install python-cqrs[aiobreaker]
```

```python
from cqrs.adapters.circuit_breaker import AioBreakerAdapter

event_cb = AioBreakerAdapter(fail_max=5, timeout_duration=60)
mapper.bind(
    NotificationSent,
    cqrs.EventHandlerFallback(
        primary=PrimaryNotificationSentHandler,
        fallback=FallbackNotificationSentHandler,
        circuit_breaker=event_cb,
    ),
)
```

After `fail_max` failures, the circuit opens and the fallback runs without calling the primary handler. See [Saga Fallback — Circuit Breaker](../saga/fallback/circuit_breaker.md) for the three-state pattern (CLOSED / OPEN / HALF_OPEN).

### Circuit Breaker configuration

Use the same `AioBreakerAdapter` as for request handlers. Parameters:

| Parameter | Description | Default |
|-----------|-------------|---------|
| `fail_max` | Number of failures before opening the circuit | `5` |
| `timeout_duration` | Seconds to wait before attempting HALF_OPEN (retry) | `60` |
| `exclude` | Exception types that **do not** count as failures (e.g. business/validation errors) | `[]` |
| `storage_factory` | Factory `(name: str) -> storage` for circuit state; default is in-memory | in-memory |

**Example with `exclude`** — e.g. invalid payload should not open the circuit:

```python
event_cb = AioBreakerAdapter(
    fail_max=5,
    timeout_duration=60,
    exclude=[ValidationError],  # invalid events don't open the circuit
)
mapper.bind(
    NotificationSent,
    cqrs.EventHandlerFallback(
        primary=PrimaryNotificationSentHandler,
        fallback=FallbackNotificationSentHandler,
        circuit_breaker=event_cb,
    ),
)
```

**One instance per domain** — use one `AioBreakerAdapter` for all event handler fallbacks that share the same policy. The adapter creates an isolated circuit per handler type.

**Storage:** Default is in-memory. For multiple instances (e.g. several workers), pass a `storage_factory` that returns Redis storage so the circuit state is shared. See [Saga Fallback — Circuit Breaker: Storage Configuration](../saga/fallback/circuit_breaker.md#storage-configuration-memory-vs-redis).

**Failure filtering:** Use `failure_exceptions` on `EventHandlerFallback` to restrict which exceptions trigger fallback; use `exclude` on `AioBreakerAdapter` so certain exceptions do not open the circuit. See [Saga Fallback — Circuit Breaker](../saga/fallback/circuit_breaker.md#failure-exception-filtering).

## Related

- [Request Handler Fallback](../request_handler/fallback.md) — Fallback for command/query handlers
- [Stream Handling Fallback](../stream_handling/fallback.md) — Fallback for streaming handlers
- [Saga Fallback Pattern](../saga/fallback/index.md) — Fallback for saga steps
