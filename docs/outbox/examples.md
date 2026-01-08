# Examples

<div class="grid cards" markdown>

-   :material-home: **Back to Transactional Outbox Overview**

    Return to the Transactional Outbox overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview


Here's a complete example showing the outbox pattern:

```python
import asyncio
import di
import cqrs
from cqrs.requests import bootstrap
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

# Register events
class UserJoinedPayload(cqrs.BaseModel, frozen=True):
    user_id: str
    meeting_id: str

cqrs.OutboxedEventMap.register(
    "user_joined",
    cqrs.NotificationEvent[UserJoinedPayload],
)

# Command handler
class JoinMeetingCommand(cqrs.Request):
    user_id: str
    meeting_id: str

class JoinMeetingCommandHandler(cqrs.RequestHandler[JoinMeetingCommand, None]):
    def __init__(self, outbox: cqrs.OutboxedEventRepository):
        self.outbox = outbox
    
    @property
    def events(self) -> list[cqrs.Event]:
        return []
    
    async def handle(self, request: JoinMeetingCommand) -> None:
        # Business logic
        print(f"User {request.user_id} joined meeting {request.meeting_id}")
        
        # Save event to outbox
        self.outbox.add(
            cqrs.NotificationEvent[UserJoinedPayload](
                event_name="user_joined",
                topic="user_events",
                payload=UserJoinedPayload(
                    user_id=request.user_id,
                    meeting_id=request.meeting_id,
                ),
            )
        )
        
        # Commit transaction
        await self.outbox.commit()

# Setup DI
def setup_di():
    container = di.Container()
    session_factory = async_sessionmaker(
        create_async_engine("mysql+asyncmy://user:pass@localhost/db")
    )
    
    container.bind(
        di.bind_by_type(
            di.Dependent(
                lambda: cqrs.SqlAlchemyOutboxedEventRepository(
                    session=session_factory(),
                ),
                scope="request",
            ),
            cqrs.OutboxedEventRepository,
        )
    )
    return container

# Bootstrap
mediator = bootstrap.bootstrap(
    di_container=setup_di(),
    commands_mapper=lambda m: m.bind(JoinMeetingCommand, JoinMeetingCommandHandler),
)

# Use mediator
await mediator.send(JoinMeetingCommand(user_id="123", meeting_id="456"))
```
