# Complete Examples

<div class="grid cards" markdown>

-   :material-home: **Back to Event Handling Overview**

    Return to the Event Handling overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview


Here's a complete example demonstrating event handling:

```python
import asyncio
import di
import cqrs
from cqrs.requests import bootstrap

# Domain event
class UserJoined(cqrs.DomainEvent, frozen=True):
    user_id: str
    meeting_id: str

# Command handler
class JoinMeetingCommand(cqrs.Request):
    user_id: str
    meeting_id: str

class JoinMeetingCommandHandler(cqrs.RequestHandler[JoinMeetingCommand, None]):
    def __init__(self):
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    async def handle(self, request: JoinMeetingCommand) -> None:
        # Business logic
        print(f"User {request.user_id} joined meeting {request.meeting_id}")
        
        # Emit domain event
        self._events.append(
            UserJoined(user_id=request.user_id, meeting_id=request.meeting_id)
        )

# Event handler
class UserJoinedEventHandler(cqrs.EventHandler[UserJoined]):
    async def handle(self, event: UserJoined) -> None:
        print(f"Processing event: User {event.user_id} joined meeting {event.meeting_id}")
        # Side effects: send notification, update read model, etc.

# Mappers
def commands_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(JoinMeetingCommand, JoinMeetingCommandHandler)

def domain_events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(UserJoined, UserJoinedEventHandler)

# Bootstrap with parallel processing
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    domain_events_mapper=domain_events_mapper,
    max_concurrent_event_handlers=3,
    concurrent_event_handle_enable=True,
)

# Execute command
await mediator.send(JoinMeetingCommand(user_id="123", meeting_id="456"))

# Flow:
# 1. Command handler executes
# 2. UserJoined event is collected
# 3. EventProcessor.emit_events runs (EventEmitter finds UserJoinedEventHandler)
# 4. UserJoinedEventHandler.handle() executes
# 5. Response is returned
```

---

## Event handler chain (follow-up events)

Event handlers can produce **follow-up events** via the `events` property. These are processed in the same pipeline (BFS in sequential mode, or under the same semaphore in parallel mode), enabling multi-level chains (e.g. L1 → L2 → L3).

```python
import typing
import cqrs
from cqrs.events.event import IEvent

# Level 1: emitted by command handler
class EventL1(cqrs.DomainEvent, frozen=True):
    seed: str

# Level 2: emitted by HandlerL1
class EventL2(cqrs.DomainEvent, frozen=True):
    seed: str

# Level 3: emitted by HandlerL2 (terminal)
class EventL3(cqrs.DomainEvent, frozen=True):
    seed: str

class HandlerL1(cqrs.EventHandler[EventL1]):
    def __init__(self) -> None:
        self._follow_ups: list[IEvent] = []

    @property
    def events(self) -> typing.Sequence[IEvent]:
        return tuple(self._follow_ups)

    async def handle(self, event: EventL1) -> None:
        # Side effects...
        self._follow_ups.append(EventL2(seed=event.seed))

class HandlerL2(cqrs.EventHandler[EventL2]):
    def __init__(self) -> None:
        self._follow_ups: list[IEvent] = []

    @property
    def events(self) -> typing.Sequence[IEvent]:
        return tuple(self._follow_ups)

    async def handle(self, event: EventL2) -> None:
        # Side effects...
        self._follow_ups.append(EventL3(seed=event.seed))

class HandlerL3(cqrs.EventHandler[EventL3]):
    async def handle(self, event: EventL3) -> None:
        # Terminal handler — no follow-ups (default events = ())
        pass

# In events_mapper:
def domain_events_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(EventL1, HandlerL1)
    mapper.bind(EventL2, HandlerL2)
    mapper.bind(EventL3, HandlerL3)
```

When you emit `EventL1(seed="x")`, the processor runs: L1 → HandlerL1 emits L2 → HandlerL2 emits L3 → HandlerL3 runs. All in the same `emit_events()` call (sequential BFS or parallel with FIRST_COMPLETED).
