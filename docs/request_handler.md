# Request Handlers

## Overview

Request handlers process commands (write operations) and queries (read operations) in your CQRS application. They are the core of your business logic and are automatically resolved through the [Dependency Injection](di.md) container configured in [Bootstrap](bootstrap/index.md).

| Concept | Description | Can Emit Events |
|---------|-------------|----------------|
| **Commands** | Modify system state | ✅ Yes |
| **Queries** | Read data without side effects | ❌ No (typically) |
| **Handlers** | Implement business logic, resolved via DI | Depends on type |

!!! note "Prerequisites"
    Before creating handlers, ensure you've configured [Bootstrap](bootstrap/index.md) and understand [Dependency Injection](di.md).

!!! tip "Related Topics"
    - [Request / Response Types](request_response_types/index.md) — Different types for requests and responses (Pydantic, Dataclasses, attrs, etc.)
    - [Stream Handling](stream_handling/index.md) — For incremental processing
    - [Chain of Responsibility](chain_of_responsibility/index.md) — For sequential handler chains
    - [Saga Pattern](saga/index.md) — For distributed transactions with compensation
    - [Event Handling](event_handler/index.md) — For processing events emitted by command handlers

Request handlers can be divided into two main types:

## Command Handler

Command Handler executes the received command. The logic of the handler may include, for example, modifying the state of
the domain model. As a result of executing the command, an event may be produced to the broker.

| Aspect | Description |
|-------|-------------|
| **Purpose** | Execute write operations, modify system state |
| **Return Value** | Optional (can return `None` or a response) |
| **Events** | Can emit domain events via `events` property |
| **Handler Type** | `RequestHandler[Command, Response]` or `RequestHandler[Command, None]` |

!!! note "Return Value"
    By default, the command handler does not return any result, but it is not mandatory. You can return a response if needed.

<details>
<summary><strong>Command Handler Characteristics</strong></summary>

<ul>
<li><strong>Modifies state</strong>: Changes the system's state</li>
<li><strong>Can emit events</strong>: Returns events through <code>events</code> property</li>
<li><strong>Idempotent</strong>: Should be idempotent when possible</li>
<li><strong>Transactional</strong>: Often wrapped in database transactions</li>
</ul>

</details>

```python
from cqrs.requests.request_handler import RequestHandler
from cqrs.events.event import Event

class JoinMeetingCommandHandler(RequestHandler[JoinMeetingCommand, None]):

      def __init__(self, meetings_api: MeetingAPIProtocol) -> None:
          self._meetings_api = meetings_api
          self.events: list[Event] = []

      @property
      def events(self) -> typing.List[events.Event]:
          return self._events

      async def handle(self, request: JoinMeetingCommand) -> None:
          await self._meetings_api.join_user(request.user_id, request.meeting_id)
```

## Query Handler

Query Handler returns a representation of the requested data, for example, from
the [read model](https://radekmaziarka.pl/2018/01/08/cqrs-third-step-simple-read-model/#simple-read-model---to-the-rescue).

| Aspect | Description |
|-------|-------------|
| **Purpose** | Read data without modifying system state |
| **Return Value** | Always returns a response |
| **Events** | Typically does not emit events |
| **Handler Type** | `RequestHandler[Query, QueryResponse]` |

!!! info "Read Model"
    The read model can be constructed based on domain events produced by the `Command Handler`. This allows for optimized read operations.

<details>
<summary><strong>Query Handler Characteristics</strong></summary>

<ul>
<li><strong>Read-only</strong>: Does not modify system state</li>
<li><strong>No side effects</strong>: Should not have side effects</li>
<li><strong>Optimized</strong>: Can use read models optimized for specific queries</li>
<li><strong>Fast</strong>: Should be fast and efficient</li>
</ul>

</details>

```python
from cqrs.requests.request_handler import RequestHandler
from cqrs.events.event import Event

class ReadMeetingQueryHandler(RequestHandler[ReadMeetingQuery, ReadMeetingQueryResult]):

      def __init__(self, meetings_api: MeetingAPIProtocol) -> None:
          self._meetings_api = meetings_api
          self.events: list[Event] = []

      @property
      def events(self) -> typing.List[events.Event]:
          return self._events

      async def handle(self, request: ReadMeetingQuery) -> ReadMeetingQueryResult:
          link = await self._meetings_api.get_link(request.meeting_id)
          return ReadMeetingQueryResult(link=link, meeting_id=request.meeting_id)
```
