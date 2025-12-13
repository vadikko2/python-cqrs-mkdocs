# Best Practices

See [Event Handling Overview](index.md) for general information.

---

## Overview


| Practice | Description | Impact |
|----------|-------------|--------|
| **Keep handlers fast** | Event handlers execute synchronously, so keep them fast | Performance |
| **Handle errors** | Implement error handling in event handlers | Reliability |
| **Use parallel processing** | Enable parallel processing for independent events | Performance |
| **Limit concurrency** | Set appropriate `max_concurrent_event_handlers` based on resources | Resource management |
| **Idempotency** | Make event handlers idempotent when possible | Reliability |
| **Logging** | Log important events for debugging and monitoring | Observability |

!!! warning "Performance Considerations"
    Event handlers execute synchronously in the request context. Keep them fast to avoid blocking the main request flow.

!!! tip "Parallel Processing"
    Enable parallel event processing for independent events to improve performance. Set `concurrent_event_handle_enable=True` and configure `max_concurrent_event_handlers`.


Event handling in `python-cqrs`:

- **Runtime Processing** — Events are processed synchronously in the same request context
- **Automatic Dispatch** — Events are automatically dispatched to registered handlers
- **Parallel Support** — Multiple events can be processed in parallel with configurable limits
- **Two Types** — DomainEvent (in-process) and NotificationEvent (message broker)
- **Side Effects** — Event handlers perform side effects without blocking command execution

Use event handlers to implement side effects like notifications, read model updates, and workflow triggers while keeping your command handlers focused on business logic.
