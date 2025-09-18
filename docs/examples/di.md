# DI Examples

This page contains comprehensive examples of using Dependency Injection with `python-cqrs`, including production and test configurations.

## Production Dependencies Setup

```python
# app/dependencies.py
import di
from di import Container
from di.dependent import Dependent
from cqrs import OutboxedEventRepository, SqlAlchemyOutboxedEventRepository
from app.services import (
    MeetingAPIProtocol, 
    MeetingAPIImplementation,
    EmailServiceProtocol,
    SMTPEmailService,
    DatabaseConnection,
    PostgreSQLConnection
)
from app.repositories import UserRepository, UserRepositoryProtocol

def setup_production_di() -> Container:
    """Setup DI container for production environment."""
    container = Container()
    
    # Database connection
    container.bind(
        di.bind_by_type(
            Dependent(
                lambda: PostgreSQLConnection(
                    host="prod-db.example.com",
                    port=5432,
                    database="meetings_db",
                    username="app_user",
                    password="secure_password"
                ),
                scope="singleton"
            ),
            DatabaseConnection
        )
    )
    
    # Repository implementations
    container.bind(
        di.bind_by_type(
            Dependent(SqlAlchemyOutboxedEventRepository, scope="request"),
            OutboxedEventRepository
        )
    )
    
    container.bind(
        di.bind_by_type(
            Dependent(UserRepository, scope="request"),
            UserRepositoryProtocol
        )
    )
    
    # Service implementations
    container.bind(
        di.bind_by_type(
            Dependent(MeetingAPIImplementation, scope="request"),
            MeetingAPIProtocol
        )
    )
    
    container.bind(
        di.bind_by_type(
            Dependent(
                lambda: SMTPEmailService(
                    smtp_host="smtp.example.com",
                    smtp_port=587,
                    username="noreply@example.com",
                    password="email_password"
                ),
                scope="singleton"
            ),
            EmailServiceProtocol
        )
    )
    
    return container
```

## Test Dependencies Setup

```python
# tests/dependencies.py
import di
from di import Container
from di.dependent import Dependent
from unittest.mock import Mock, AsyncMock
from cqrs import OutboxedEventRepository
from app.services import (
    MeetingAPIProtocol, 
    EmailServiceProtocol,
    DatabaseConnection
)
from app.repositories import UserRepositoryProtocol

def setup_test_di() -> Container:
    """Setup DI container for testing environment."""
    container = Container()
    
    # Mock database connection
    mock_db = Mock(spec=DatabaseConnection)
    mock_db.connect.return_value = None
    mock_db.disconnect.return_value = None
    
    container.bind(
        di.bind_by_type(
            Dependent(lambda: mock_db, scope="singleton"),
            DatabaseConnection
        )
    )
    
    # Mock repository
    mock_outbox_repo = Mock(spec=OutboxedEventRepository)
    mock_outbox_repo.save_event = AsyncMock()
    mock_outbox_repo.get_pending_events = AsyncMock(return_value=[])
    
    container.bind(
        di.bind_by_type(
            Dependent(lambda: mock_outbox_repo, scope="request"),
            OutboxedEventRepository
        )
    )
    
    # Mock user repository
    mock_user_repo = Mock(spec=UserRepositoryProtocol)
    mock_user_repo.get_user = AsyncMock()
    mock_user_repo.save_user = AsyncMock()
    
    container.bind(
        di.bind_by_type(
            Dependent(lambda: mock_user_repo, scope="request"),
            UserRepositoryProtocol
        )
    )
    
    # Mock meeting API
    mock_meeting_api = Mock(spec=MeetingAPIProtocol)
    mock_meeting_api.join_user = AsyncMock()
    mock_meeting_api.leave_user = AsyncMock()
    mock_meeting_api.get_meeting_info = AsyncMock()
    
    container.bind(
        di.bind_by_type(
            Dependent(lambda: mock_meeting_api, scope="request"),
            MeetingAPIProtocol
        )
    )
    
    # Mock email service
    mock_email_service = Mock(spec=EmailServiceProtocol)
    mock_email_service.send_email = AsyncMock()
    
    container.bind(
        di.bind_by_type(
            Dependent(lambda: mock_email_service, scope="singleton"),
            EmailServiceProtocol
        )
    )
    
    return container
```

## Command Handler with Dependencies

```python
# app/handlers/meeting_handlers.py
from cqrs.requests import RequestHandler
from cqrs.events import Event
from app.services import MeetingAPIProtocol, EmailServiceProtocol
from app.repositories import UserRepositoryProtocol
from app.models import JoinMeetingCommand, UserJoinedMeetingEvent

class JoinMeetingCommandHandler(RequestHandler[JoinMeetingCommand, None]):
    
    def __init__(
        self, 
        meetings_api: MeetingAPIProtocol,
        email_service: EmailServiceProtocol,
        user_repo: UserRepositoryProtocol
    ) -> None:
        self._meetings_api = meetings_api
        self._email_service = email_service
        self._user_repo = user_repo
        self._events: list[Event] = []

    @property
    def events(self) -> list[Event]:
        return self._events

    async def handle(self, request: JoinMeetingCommand) -> None:
        # Get user information
        user = await self._user_repo.get_user(request.user_id)
        
        # Join the meeting
        await self._meetings_api.join_user(request.user_id, request.meeting_id)
        
        # Send notification email
        await self._email_service.send_email(
            to=user.email,
            subject="Meeting Joined",
            body=f"You have successfully joined meeting {request.meeting_id}"
        )
        
        # Add domain event
        self._events.append(
            UserJoinedMeetingEvent(
                user_id=request.user_id,
                meeting_id=request.meeting_id,
                joined_at=datetime.utcnow()
            )
        )
```

## Query Handler with Dependencies

```python
# app/handlers/meeting_queries.py
from cqrs.requests import RequestHandler
from app.services import MeetingAPIProtocol
from app.models import GetMeetingInfoQuery, GetMeetingInfoResult

class GetMeetingInfoQueryHandler(RequestHandler[GetMeetingInfoQuery, GetMeetingInfoResult]):
    
    def __init__(self, meetings_api: MeetingAPIProtocol) -> None:
        self._meetings_api = meetings_api

    @property
    def events(self) -> list[Event]:
        return []

    async def handle(self, request: GetMeetingInfoQuery) -> GetMeetingInfoResult:
        meeting_info = await self._meetings_api.get_meeting_info(request.meeting_id)
        
        return GetMeetingInfoResult(
            meeting_id=meeting_info.id,
            title=meeting_info.title,
            participants=meeting_info.participants,
            start_time=meeting_info.start_time,
            end_time=meeting_info.end_time
        )
```

## Bootstrap with Environment-Specific DI

```python
# app/bootstrap.py
import os
import functools
from cqrs.requests import bootstrap as request_bootstrap
from app import dependencies, mapping, orm

def get_environment():
    """Get current environment from environment variable."""
    return os.getenv("ENVIRONMENT", "development")

@functools.lru_cache
def mediator_factory():
    """Factory function that creates mediator with environment-specific DI."""
    environment = get_environment()
    
    if environment == "test":
        di_container = dependencies.setup_test_di()
    else:
        di_container = dependencies.setup_production_di()
    
    return request_bootstrap.bootstrap(
        di_container=di_container,
        commands_mapper=mapping.init_commands,
        queries_mapper=mapping.init_queries,
        domain_events_mapper=mapping.init_events,
        on_startup=[orm.init_store_event_mapper],
    )
```

## Pytest Test Examples

```python
# tests/test_meeting_handlers.py
import pytest
from unittest.mock import AsyncMock, Mock
from app.handlers.meeting_handlers import JoinMeetingCommandHandler
from app.models import JoinMeetingCommand, User
from tests.dependencies import setup_test_di

@pytest.fixture
def test_container():
    """Create test DI container with mocked dependencies."""
    return setup_test_di()

@pytest.fixture
def mock_user():
    """Create mock user for testing."""
    user = Mock(spec=User)
    user.id = "user123"
    user.email = "test@example.com"
    user.name = "Test User"
    return user

@pytest.fixture
def join_meeting_command():
    """Create test command."""
    return JoinMeetingCommand(
        user_id="user123",
        meeting_id="meeting456"
    )

@pytest.mark.asyncio
async def test_join_meeting_command_success(test_container, mock_user, join_meeting_command):
    """Test successful meeting join."""
    # Get mocked dependencies
    user_repo = test_container.solve(UserRepositoryProtocol)
    meeting_api = test_container.solve(MeetingAPIProtocol)
    email_service = test_container.solve(EmailServiceProtocol)
    
    # Setup mock responses
    user_repo.get_user.return_value = mock_user
    meeting_api.join_user.return_value = None
    email_service.send_email.return_value = None
    
    # Create handler
    handler = test_container.solve(JoinMeetingCommandHandler)
    
    # Execute command
    await handler.handle(join_meeting_command)
    
    # Verify interactions
    user_repo.get_user.assert_called_once_with("user123")
    meeting_api.join_user.assert_called_once_with("user123", "meeting456")
    email_service.send_email.assert_called_once_with(
        to="test@example.com",
        subject="Meeting Joined",
        body="You have successfully joined meeting meeting456"
    )
    
    # Verify events were created
    assert len(handler.events) == 1
    event = handler.events[0]
    assert event.user_id == "user123"
    assert event.meeting_id == "meeting456"

@pytest.mark.asyncio
async def test_join_meeting_command_user_not_found(test_container, join_meeting_command):
    """Test meeting join when user is not found."""
    # Get mocked dependencies
    user_repo = test_container.solve(UserRepositoryProtocol)
    meeting_api = test_container.solve(MeetingAPIProtocol)
    email_service = test_container.solve(EmailServiceProtocol)
    
    # Setup mock to raise exception
    user_repo.get_user.side_effect = UserNotFoundError("User not found")
    
    # Create handler
    handler = test_container.solve(JoinMeetingCommandHandler)
    
    # Execute command and expect exception
    with pytest.raises(UserNotFoundError):
        await handler.handle(join_meeting_command)
    
    # Verify that meeting API was not called
    meeting_api.join_user.assert_not_called()
    email_service.send_email.assert_not_called()

@pytest.mark.asyncio
async def test_join_meeting_command_email_failure(test_container, mock_user, join_meeting_command):
    """Test meeting join when email sending fails."""
    # Get mocked dependencies
    user_repo = test_container.solve(UserRepositoryProtocol)
    meeting_api = test_container.solve(MeetingAPIProtocol)
    email_service = test_container.solve(EmailServiceProtocol)
    
    # Setup mock responses
    user_repo.get_user.return_value = mock_user
    meeting_api.join_user.return_value = None
    email_service.send_email.side_effect = EmailServiceError("SMTP connection failed")
    
    # Create handler
    handler = test_container.solve(JoinMeetingCommandHandler)
    
    # Execute command and expect exception
    with pytest.raises(EmailServiceError):
        await handler.handle(join_meeting_command)
    
    # Verify that user was retrieved and meeting API was called
    user_repo.get_user.assert_called_once_with("user123")
    meeting_api.join_user.assert_called_once_with("user123", "meeting456")

@pytest.mark.asyncio
async def test_get_meeting_info_query(test_container):
    """Test meeting info query."""
    # Get mocked dependencies
    meeting_api = test_container.solve(MeetingAPIProtocol)
    
    # Setup mock response
    mock_meeting_info = Mock()
    mock_meeting_info.id = "meeting456"
    mock_meeting_info.title = "Team Standup"
    mock_meeting_info.participants = ["user123", "user456"]
    mock_meeting_info.start_time = datetime(2024, 1, 15, 10, 0)
    mock_meeting_info.end_time = datetime(2024, 1, 15, 10, 30)
    
    meeting_api.get_meeting_info.return_value = mock_meeting_info
    
    # Create handler
    handler = test_container.solve(GetMeetingInfoQueryHandler)
    
    # Execute query
    query = GetMeetingInfoQuery(meeting_id="meeting456")
    result = await handler.handle(query)
    
    # Verify result
    assert result.meeting_id == "meeting456"
    assert result.title == "Team Standup"
    assert result.participants == ["user123", "user456"]
    
    # Verify API was called
    meeting_api.get_meeting_info.assert_called_once_with("meeting456")
```

## Integration Test Example

```python
# tests/test_integration.py
import pytest
from app.bootstrap import mediator_factory
from app.models import JoinMeetingCommand, GetMeetingInfoQuery

@pytest.fixture
def test_mediator():
    """Create mediator with test dependencies."""
    # Set test environment
    import os
    os.environ["ENVIRONMENT"] = "test"
    
    # Clear cache to get fresh mediator
    mediator_factory.cache_clear()
    
    return mediator_factory()

@pytest.mark.asyncio
async def test_meeting_workflow_integration(test_mediator):
    """Test complete meeting workflow."""
    # Join meeting
    join_command = JoinMeetingCommand(
        user_id="user123",
        meeting_id="meeting456"
    )
    
    await test_mediator.send(join_command)
    
    # Get meeting info
    info_query = GetMeetingInfoQuery(meeting_id="meeting456")
    meeting_info = await test_mediator.send(info_query)
    
    # Verify meeting info
    assert meeting_info.meeting_id == "meeting456"
    assert "user123" in meeting_info.participants
```
