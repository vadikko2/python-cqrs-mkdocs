# Event Flow

<div class="grid cards" markdown>

-   :material-home: **Back to Event Handling Overview**

    Return to the Event Handling overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview

The event handling flow follows these steps:

### High-Level Flow

```mermaid
sequenceDiagram
    autonumber
    participant Client
    participant Mediator
    participant Handler as Command Handler
    participant Events as Events Collection
    participant Processor as Event Processor
    participant Emitter as Event Emitter
    participant Handlers as Event Handlers
    participant Broker as Message Broker

    Client->>Mediator: 1. Send Command
    Mediator->>Handler: 2. Execute Handler
    Handler->>Handler: 3. Business Logic
    Handler->>Events: 4. Collect Events
    Handler-->>Mediator: 5. Return Response
    
    Mediator->>Processor: 6. Emit Events
    Processor->>Emitter: 7. Emit Each Event
    
    alt DomainEvent
        Emitter->>Handlers: 8. Execute Event Handlers
        Handlers-->>Emitter: 9. Complete
    else NotificationEvent
        Emitter->>Broker: 8. Send to Message Broker
        Broker-->>Emitter: 9. Complete
    end
    
    Emitter-->>Processor: 10. Complete
    Processor-->>Mediator: 11. Complete
    Mediator-->>Client: 12. Return Response
```

### Detailed Event Processing Flow

```mermaid
graph TD
    A[Command Handler Executes] -->|Collect Events| B[Events Property]
    B -->|Return Events| C[RequestMediator]
    C -->|Has Events?| D{Events Exist?}
    
    D -->|No| E[Return Response]
    D -->|Yes| F[EventProcessor.emit_events]
    
    F -->|For Each Event| G{Parallel Enabled?}
    
    G -->|No| H[Sequential: EventEmitter.emit]
    G -->|Yes| I[Parallel: Create Task with Semaphore]
    I --> J[EventEmitter.emit]
    
    H --> K{Event Type?}
    J --> K
    
    K -->|DomainEvent| L[EventEmitter: Find Handlers]
    K -->|NotificationEvent| M[EventEmitter: Send to Broker]
    
    L --> N[EventMap Lookup]
    N --> O[Resolve Handler from DI]
    O --> P[Execute Event Handler]
    P --> Q{More Events?}
    
    M --> Q
    Q -->|Yes| F
    Q -->|No| E
    
    style A fill:#e1f5ff
    style B fill:#fff3e0
    style F fill:#c8e6c9
    style L fill:#c8e6c9
    style P fill:#c8e6c9
    style E fill:#f3e5f5
```


### 1. Event Collection

Command handlers collect events in the `events` property:

```python
class JoinMeetingCommandHandler(RequestHandler[JoinMeetingCommand, None]):
    def __init__(self):
        self._events: list[Event] = []

    @property
    def events(self) -> list[Event]:
        return self._events

    async def handle(self, request: JoinMeetingCommand) -> None:
        # Business logic
        STORAGE[request.meeting_id].append(request.user_id)
        
        # Collect domain event
        self._events.append(
            UserJoined(user_id=request.user_id, meeting_id=request.meeting_id)
        )
```

### 2. Event Emission

After the command handler completes, the mediator collects events and emits them through EventProcessor:

```python
dispatch_result = await self._dispatcher.dispatch(request)

# Events are emitted through EventProcessor
# EventProcessor uses EventEmitter which handles:
# - DomainEvent: processes via event handlers (in-process)
# - NotificationEvent: sends to message broker
await self._event_processor.emit_events(dispatch_result.events)
```

The `EventProcessor` handles parallel or sequential processing based on configuration, and `EventEmitter` routes events to appropriate handlers or message brokers.

### 3. Event Processing via EventEmitter

Events are processed through `EventEmitter`, which routes them based on event type:

```mermaid
graph TD
    A[EventEmitter.emit] -->|1. Get Event Type| B{Event Type?}
    
    B -->|DomainEvent| C[EventMap.get]
    C -->|2. Find Handlers| D{Handlers Found?}
    D -->|No| E[Log Warning]
    D -->|Yes| F[Loop Through Handlers]
    F -->|3. Resolve Handler| G[DI Container]
    G -->|4. Execute Handler| H[Handler.handle]
    H -->|5. Process Side Effects| I[Complete]
    
    B -->|NotificationEvent| J{Message Broker?}
    J -->|No| K[Raise RuntimeError]
    J -->|Yes| L[Send to Message Broker]
    L --> I
    
    style A fill:#e1f5ff
    style H fill:#c8e6c9
    style I fill:#fff3e0
```

### 4. Event Routing

`EventEmitter` automatically routes events based on their type:

- **DomainEvent** — Processed by event handlers registered in EventMap (in-process, synchronous)
- **NotificationEvent** — Sent to message broker (Kafka, RabbitMQ, etc.) for asynchronous processing

!!! important "Single Processing"
    Events are processed **only once** through EventEmitter. There is no duplicate processing - DomainEvents are handled by event handlers, and NotificationEvents are sent to message brokers.
