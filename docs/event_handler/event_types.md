# Event Types

<div class="grid cards" markdown>

-   :material-home: **Back to Event Handling Overview**

    Return to the Event Handling overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview


| Event Type | Processing | Use Case |
|------------|------------|----------|
| **DomainEvent** | Processed by event handlers in-process | Domain logic, read model updates |
| **NotificationEvent** | Sent to message brokers | Cross-service communication |

### DomainEvent

Domain events represent something that happened in the domain. They are processed by event handlers:

```python
class UserJoined(cqrs.DomainEvent, frozen=True):
    user_id: str
    meeting_id: str

class UserJoinedEventHandler(cqrs.EventHandler[UserJoined]):
    async def handle(self, event: UserJoined) -> None:
        # Process domain event
        ...
```

### NotificationEvent

Notification events are sent to message brokers:

```python
class UserJoinedNotification(cqrs.NotificationEvent[UserJoinedPayload]):
    event_name: str = "user_joined"
    topic: str = "user_events"
    payload: UserJoinedPayload

# Automatically sent to message broker via EventEmitter
```

### Event Type Comparison

| Aspect | DomainEvent | NotificationEvent |
|--------|---------------------|-------------------------|
| **Processing** | In-process handlers | Message broker |
| **Latency** | Synchronous | Asynchronous |
| **Reliability** | Immediate | Requires Outbox pattern |
| **Use Case** | Domain logic | Cross-service communication |
