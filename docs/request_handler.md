# Request Handlers

Request handlers can be divided into two main types:

1. [Command Handler](#command-handler)
2. [Query Handler](#query-handler)

## **Command Handler**

Command Handler executes the received command. The logic of the handler may include, for example, modifying the state of
the domain model. As a result of executing the command, an event may be produced to the broker.

??? note

    By default, the command handler does not return any result, but it is not mandatory.

```python
from cqrs.requests.request_handler import RequestHandler, SyncRequestHandler
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


class SyncJoinMeetingCommandHandler(SyncRequestHandler[JoinMeetingCommand, None]):

      def __init__(self, meetings_api: MeetingAPIProtocol) -> None:
          self._meetings_api = meetings_api
          self.events: list[Event] = []

      @property
      def events(self) -> typing.List[events.Event]:
          return self._events

      def handle(self, request: JoinMeetingCommand) -> None:
          # do some sync logic
          ...
```

## **Query Handler**

Query Handler returns a representation of the requested data, for example, from
the [read model](https://radekmaziarka.pl/2018/01/08/cqrs-third-step-simple-read-model/#simple-read-model---to-the-rescue).

??? info

    The read model can be constructed based on domain events produced by the `Command Handler`.

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

A complete examples can be found [here](examples/request_handler.md).
