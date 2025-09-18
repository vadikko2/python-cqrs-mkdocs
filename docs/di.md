# Dependency Injection

Dependency Injection (DI) is a design pattern that allows injecting dependencies into application components, simplifying their management and improving code testability.

## Overview

The `python-cqrs` package uses the `di` library for dependency injection. This allows you to bind implementations to interfaces and automatically resolve dependencies in your handlers.

## Basic Setup

Here's how to set up a DI container with `python-cqrs`:

```python
import di
from di import Container
from di.dependent import Dependent
from cqrs import OutboxedEventRepository, SqlAlchemyOutboxedEventRepository
from app.meeting_api import MeetingAPIImplementation, MeetingAPIProtocol

def setup_di() -> Container:
    """
    Setup DI container with implementation bindings.
    """
    container = Container()
    
    # Bind repository implementation
    container.bind(
        di.bind_by_type(
            Dependent(SqlAlchemyOutboxedEventRepository, scope="request"),
            OutboxedEventRepository
        )
    )
    
    # Bind service implementation
    container.bind(
        di.bind_by_type(
            Dependent(MeetingAPIImplementation, scope="request"),
            MeetingAPIProtocol
        )
    )
    
    return container
```

## Using DI with Bootstrap

Once you have your DI container set up, you can use it with the bootstrap function:

```python
import functools
from cqrs.requests import bootstrap as request_bootstrap
from app import dependencies, mapping, orm

@functools.lru_cache
def mediator_factory():
    return request_bootstrap.bootstrap(
        di_container=dependencies.setup_di(),
        commands_mapper=mapping.init_commands,
        queries_mapper=mapping.init_queries,
        domain_events_mapper=mapping.init_events,
        on_startup=[orm.init_store_event_mapper],
    )
```

## Handler with Dependencies

Here's an example of a command handler that uses dependency injection:

```python
from cqrs.requests import RequestHandler
from cqrs.events import Event
from app.meeting_api import MeetingAPIProtocol

class JoinMeetingCommandHandler(RequestHandler[JoinMeetingCommand, None]):
    
    def __init__(self, meetings_api: MeetingAPIProtocol) -> None:
        self._meetings_api = meetings_api
        self._events: list[Event] = []

    @property
    def events(self) -> list[Event]:
        return self._events

    async def handle(self, request: JoinMeetingCommand) -> None:
        await self._meetings_api.join_user(request.user_id, request.meeting_id)
        
        # Add domain event
        self._events.append(
            UserJoinedMeetingEvent(
                user_id=request.user_id,
                meeting_id=request.meeting_id
            )
        )
```

## Scopes

The `di` library supports different scopes for dependency resolution:

- **`"singleton"`**: One instance per container
- **`"request"`**: One instance per request
- **`"scoped"`**: One instance per scope

```python
# Singleton scope
container.bind(
    di.bind_by_type(
        Dependent(DatabaseConnection, scope="singleton"),
        DatabaseConnection
    )
)

# Request scope
container.bind(
    di.bind_by_type(
        Dependent(UserService, scope="request"),
        UserService
    )
)
```

## Advanced Configuration

For more complex scenarios, you can configure dependencies with additional parameters:

```python
def setup_advanced_di() -> Container:
    container = Container()
    
    # Bind with factory function
    container.bind(
        di.bind_by_type(
            Dependent(
                lambda: DatabaseConnection(
                    host="localhost",
                    port=5432,
                    database="myapp"
                ),
                scope="singleton"
            ),
            DatabaseConnection
        )
    )
    
    # Bind with dependencies
    container.bind(
        di.bind_by_type(
            Dependent(
                UserService,
                scope="request",
                use_cache=True
            ),
            UserService
        )
    )
    
    return container
```

## Testing with DI

Dependency injection makes testing easier by allowing you to mock dependencies:

```python
import pytest
from unittest.mock import Mock
from app.dependencies import setup_di
from app.handlers import JoinMeetingCommandHandler

@pytest.fixture
def mock_meeting_api():
    return Mock(spec=MeetingAPIProtocol)

@pytest.fixture
def test_container(mock_meeting_api):
    container = setup_di()
    container.bind(
        di.bind_by_type(
            Dependent(lambda: mock_meeting_api, scope="request"),
            MeetingAPIProtocol
        )
    )
    return container

async def test_join_meeting_command(test_container, mock_meeting_api):
    handler = test_container.solve(JoinMeetingCommandHandler)
    
    command = JoinMeetingCommand(user_id="user1", meeting_id="meeting1")
    await handler.handle(command)
    
    mock_meeting_api.join_user.assert_called_once_with("user1", "meeting1")
```

## Benefits

Using dependency injection with `python-cqrs` provides several benefits:

1. **Simplified dependency management**: The DI container handles creation and management of dependencies
2. **Improved testability**: Easy to mock dependencies for unit testing
3. **Flexibility**: Easy to swap implementations without changing core application code
4. **Better separation of concerns**: Dependencies are explicitly declared and injected
5. **Configuration management**: Centralized configuration of application dependencies

## Best Practices

1. **Use interfaces**: Always bind implementations to interfaces, not concrete classes
2. **Choose appropriate scopes**: Use singleton for stateless services, request for stateful ones
3. **Keep constructors simple**: Avoid complex logic in constructors
4. **Use factory functions**: For complex object creation, use factory functions
5. **Test with mocks**: Always test your handlers with mocked dependencies
