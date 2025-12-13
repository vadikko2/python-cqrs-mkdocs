# Event Flow

See [Event Handling Overview](index.md) for general information.

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
    participant Dispatcher as Event Dispatcher
    participant Handlers as Event Handlers
    participant Emitter as Event Emitter

    Client->>Mediator: 1. Send Command
    Mediator->>Handler: 2. Execute Handler
    Handler->>Handler: 3. Business Logic
    Handler->>Events: 4. Collect Events
    Handler-->>Mediator: 5. Return Response
    
    Mediator->>Dispatcher: 6. Process Events
    Dispatcher->>Handlers: 7. Execute Handlers
    Handlers-->>Dispatcher: 8. Complete
    
    Mediator->>Emitter: 9. Emit Events
    Emitter->>Emitter: 10. Send to Broker/Handlers
    
    Mediator-->>Client: 11. Return Response
```

### Detailed Event Processing Flow

```mermaid
graph TD
    A[Command Handler Executes] -->|Collect Events| B[Events Property]
    B -->|Return Events| C[RequestMediator]
    C -->|Has Events?| D{Events Exist?}
    
    D -->|No| E[Return Response]
    D -->|Yes| F[Process Events Parallel]
    
    F -->|For Each Event| G[EventDispatcher]
    G -->|Find Handlers| H[EventMap Lookup]
    H -->|Resolve Handler| I[DI Container]
    I -->|Execute| J[Event Handler]
    J -->|Complete| K{More Events?}
    
    K -->|Yes| F
    K -->|No| L[Emit Events]
    
    L -->|DomainEvent| M[Process via Handlers]
    L -->|NotificationEvent| N[Send to Broker]
    
    M --> E
    N --> E
    
    style A fill:#e1f5ff
    style B fill:#fff3e0
    style G fill:#c8e6c9
    style J fill:#c8e6c9
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

### 2. Event Dispatch

After the command handler completes, the mediator collects events and dispatches them:

```python
dispatch_result = await self._dispatcher.dispatch(request)

if dispatch_result.events:
    # Process events (parallel or sequential)
    await self._process_events_parallel(dispatch_result.events.copy())
    # Emit events to broker or handlers
    await self._send_events(dispatch_result.events.copy())
```

### 3. Event Processing

Events are processed through `EventDispatcher`, which finds registered handlers and executes them:

```mermaid
graph TD
    A[EventDispatcher.dispatch] -->|1. Get Event Type| B[EventMap.get]
    B -->|2. Find Handlers| C{Handlers Found?}
    C -->|No| D[Log Warning]
    C -->|Yes| E[Loop Through Handlers]
    E -->|3. Resolve Handler| F[DI Container]
    F -->|4. Execute Handler| G[Handler.handle]
    G -->|5. Process Side Effects| H[Complete]
    
    style A fill:#e1f5ff
    style G fill:#c8e6c9
    style H fill:#fff3e0
```

### 4. Event Emission

After processing, events are emitted through `EventEmitter`:

- **DomainEvent** — Processed by event handlers (in-process)
- **NotificationEvent** — Sent to message broker (Kafka, RabbitMQ, etc.)
