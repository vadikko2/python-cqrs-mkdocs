# **Request Handler**

This page demonstrates comprehensive examples of request handlers with advanced patterns including event handling,
validation, error management, and WebSocket integration.

## Basic Example

```python
import asyncio
import logging
import typing
from collections import defaultdict

import di

import cqrs
from cqrs.requests import bootstrap

logging.basicConfig(level=logging.DEBUG)

STORAGE = defaultdict[str, typing.List[str]](lambda: [])


class JoinMeetingCommand(cqrs.Request):
    user_id: str
    meeting_id: str


class ReadMeetingQuery(cqrs.Request):
    meeting_id: str


class ReadMeetingQueryResult(cqrs.Response):
    users: list[str]


class JoinMeetingCommandHandler(cqrs.RequestHandler[JoinMeetingCommand, None]):
    @property
    def events(self):
        return []

    async def handle(self, request: JoinMeetingCommand) -> None:
        STORAGE[request.meeting_id].append(request.user_id)
        print(f"User {request.user_id} joined meeting {request.meeting_id}")


class ReadMeetingQueryHandler(
    cqrs.RequestHandler[ReadMeetingQuery, ReadMeetingQueryResult],
):
    @property
    def events(self):
        return []

    async def handle(self, request: ReadMeetingQuery) -> ReadMeetingQueryResult:
        return ReadMeetingQueryResult(users=STORAGE[request.meeting_id])


def command_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(JoinMeetingCommand, JoinMeetingCommandHandler)


def query_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(ReadMeetingQuery, ReadMeetingQueryHandler)


async def main():
    mediator = bootstrap.bootstrap(
        di_container=di.Container(),
        queries_mapper=query_mapper,
        commands_mapper=command_mapper,
    )
    await mediator.send(JoinMeetingCommand(user_id="1", meeting_id="1"))
    await mediator.send(JoinMeetingCommand(user_id="2", meeting_id="1"))
    await mediator.send(JoinMeetingCommand(user_id="3", meeting_id="1"))
    await mediator.send(JoinMeetingCommand(user_id="4", meeting_id="1"))
    users_in_room = await mediator.send(ReadMeetingQuery(meeting_id="1"))
    print("There are {} users in the room".format(len(users_in_room.users)))
    assert len(users_in_room.users) == 4


if __name__ == "__main__":
    asyncio.run(main())
```

## Advanced Example with Events and Validation

```python
import asyncio
import logging
from datetime import datetime
from typing import Optional, List, Protocol
from uuid import uuid4

import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.events import Event, EventMap
from pydantic import BaseModel, Field, validator

# Domain Models
class User(BaseModel):
    id: str
    username: str
    email: str
    is_online: bool = False

class ChatRoom(BaseModel):
    id: str
    name: str
    participants: List[str] = []
    created_at: datetime
    is_active: bool = True

# Commands
class CreateChatRoomCommand(cqrs.Request):
    name: str = Field(..., min_length=1, max_length=100)
    creator_id: str
    description: Optional[str] = None

class JoinChatRoomCommand(cqrs.Request):
    user_id: str
    room_id: str

class SendMessageCommand(cqrs.Request):
    user_id: str
    room_id: str
    content: str = Field(..., min_length=1, max_length=1000)
    message_type: str = "text"

    @validator('content')
    def validate_content(cls, v):
        if not v.strip():
            raise ValueError('Message content cannot be empty')
        return v.strip()

class LeaveChatRoomCommand(cqrs.Request):
    user_id: str
    room_id: str

# Queries
class GetChatRoomQuery(cqrs.Request):
    room_id: str

class GetUserChatRoomsQuery(cqrs.Request):
    user_id: str

class GetChatRoomMessagesQuery(cqrs.Request):
    room_id: str
    limit: int = 50
    offset: int = 0

# Responses
class CreateChatRoomResponse(cqrs.Response):
    room_id: str
    room_name: str
    creator_id: str

class JoinChatRoomResponse(cqrs.Response):
    user_id: str
    room_id: str
    joined_at: datetime

class SendMessageResponse(cqrs.Response):
    message_id: str
    user_id: str
    room_id: str
    timestamp: datetime

class ChatRoomResponse(cqrs.Response):
    id: str
    name: str
    participants: List[str]
    participant_count: int
    is_active: bool

class MessageResponse(cqrs.Response):
    id: str
    user_id: str
    content: str
    message_type: str
    timestamp: datetime
    room_id: str

# Events
class ChatRoomCreatedEvent(Event):
    room_id: str
    creator_id: str
    room_name: str
    created_at: datetime

class UserJoinedRoomEvent(Event):
    user_id: str
    room_id: str
    joined_at: datetime

class UserLeftRoomEvent(Event):
    user_id: str
    room_id: str
    left_at: datetime

class MessageSentEvent(Event):
    message_id: str
    user_id: str
    room_id: str
    content: str
    message_type: str
    timestamp: datetime

# In-memory storage (in real app, use database)
CHAT_ROOMS: dict[str, ChatRoom] = {}
MESSAGES: dict[str, List[MessageResponse]] = defaultdict(list)
USER_ROOMS: dict[str, List[str]] = defaultdict(list)

# Protocols for Dependencies
class WebSocketManagerProtocol(Protocol):
    async def add_connection(self, user_id: str, websocket) -> None: ...
    async def remove_connection(self, user_id: str, websocket) -> None: ...
    async def add_to_room(self, user_id: str, room_id: str, websocket) -> None: ...
    async def broadcast_to_user(self, user_id: str, message: dict) -> None: ...
    async def broadcast_to_room(self, room_id: str, message: dict) -> None: ...
    async def broadcast_to_all(self, message: dict) -> None: ...

# Command Handlers
class CreateChatRoomHandler(cqrs.RequestHandler[CreateChatRoomCommand, CreateChatRoomResponse]):
    def __init__(self, websocket_manager: WebSocketManagerProtocol):
        self._websocket_manager = websocket_manager
        self._events: List[Event] = []

    @property
    def events(self) -> List[Event]:
        return self._events

    async def handle(self, request: CreateChatRoomCommand) -> CreateChatRoomResponse:
        room_id = str(uuid4())
        
        # Create chat room
        room = ChatRoom(
            id=room_id,
            name=request.name,
            participants=[request.creator_id],
            created_at=datetime.utcnow()
        )
        CHAT_ROOMS[room_id] = room
        USER_ROOMS[request.creator_id].append(room_id)
        
        # Emit domain event
        self._events.append(ChatRoomCreatedEvent(
            room_id=room_id,
            creator_id=request.creator_id,
            room_name=request.name,
            created_at=room.created_at
        ))
        
        # Notify via WebSocket
        await self._websocket_manager.broadcast_to_user(
            request.creator_id,
            {"type": "room_created", "room_id": room_id, "room_name": request.name}
        )
        
        return CreateChatRoomResponse(
            room_id=room_id,
            room_name=request.name,
            creator_id=request.creator_id
        )

class JoinChatRoomHandler(cqrs.RequestHandler[JoinChatRoomCommand, JoinChatRoomResponse]):
    def __init__(self, websocket_manager: WebSocketManagerProtocol):
        self._websocket_manager = websocket_manager
        self._events: List[Event] = []

    @property
    def events(self) -> List[Event]:
        return self._events

    async def handle(self, request: JoinChatRoomCommand) -> JoinChatRoomResponse:
        if request.room_id not in CHAT_ROOMS:
            raise ValueError(f"Chat room {request.room_id} not found")
        
        room = CHAT_ROOMS[request.room_id]
        if not room.is_active:
            raise ValueError(f"Chat room {request.room_id} is not active")
        
        if request.user_id not in room.participants:
            room.participants.append(request.user_id)
            USER_ROOMS[request.user_id].append(request.room_id)
            
            # Emit domain event
            self._events.append(UserJoinedRoomEvent(
                user_id=request.user_id,
                room_id=request.room_id,
                joined_at=datetime.utcnow()
            ))
            
            # Notify all participants
            await self._websocket_manager.broadcast_to_room(
                request.room_id,
                {"type": "user_joined", "user_id": request.user_id, "room_id": request.room_id}
            )
            
            return JoinChatRoomResponse(
                user_id=request.user_id,
                room_id=request.room_id,
                joined_at=datetime.utcnow()
            )

class SendMessageHandler(cqrs.RequestHandler[SendMessageCommand, SendMessageResponse]):
    def __init__(self, websocket_manager: WebSocketManagerProtocol):
        self._websocket_manager = websocket_manager
        self._events: List[Event] = []

    @property
    def events(self) -> List[Event]:
        return self._events

    async def handle(self, request: SendMessageCommand) -> SendMessageResponse:
        if request.room_id not in CHAT_ROOMS:
            raise ValueError(f"Chat room {request.room_id} not found")
        
        room = CHAT_ROOMS[request.room_id]
        if request.user_id not in room.participants:
            raise ValueError(f"User {request.user_id} is not in room {request.room_id}")
        
        message_id = str(uuid4())
        message = MessageResponse(
            id=message_id,
            user_id=request.user_id,
            content=request.content,
            message_type=request.message_type,
            timestamp=datetime.utcnow(),
            room_id=request.room_id
        )
        
        MESSAGES[request.room_id].append(message)
        
        # Emit domain event
        self._events.append(MessageSentEvent(
            message_id=message_id,
            user_id=request.user_id,
            room_id=request.room_id,
            content=request.content,
            message_type=request.message_type,
            timestamp=message.timestamp
        ))
        
        # Broadcast to room participants
        await self._websocket_manager.broadcast_to_room(
            request.room_id,
            {
                "type": "message",
                "message_id": message_id,
                "user_id": request.user_id,
                "content": request.content,
                "message_type": request.message_type,
                "timestamp": message.timestamp.isoformat()
            }
        )
        
        return SendMessageResponse(
            message_id=message_id,
            user_id=request.user_id,
            room_id=request.room_id,
            timestamp=message.timestamp
        )

# Query Handlers
class GetChatRoomHandler(cqrs.RequestHandler[GetChatRoomQuery, ChatRoomResponse]):
    @property
    def events(self) -> List[Event]:
        return []

    async def handle(self, request: GetChatRoomQuery) -> ChatRoomResponse:
        if request.room_id not in CHAT_ROOMS:
            raise ValueError(f"Chat room {request.room_id} not found")
        
        room = CHAT_ROOMS[request.room_id]
        return ChatRoomResponse(
            id=room.id,
            name=room.name,
            participants=room.participants,
            participant_count=len(room.participants),
            is_active=room.is_active
        )

class GetUserChatRoomsHandler(cqrs.RequestHandler[GetUserChatRoomsQuery, List[ChatRoomResponse]]):
    @property
    def events(self) -> List[Event]:
        return []

    async def handle(self, request: GetUserChatRoomsQuery) -> List[ChatRoomResponse]:
        user_room_ids = USER_ROOMS.get(request.user_id, [])
        rooms = []
        
        for room_id in user_room_ids:
            if room_id in CHAT_ROOMS:
                room = CHAT_ROOMS[room_id]
                rooms.append(ChatRoomResponse(
                    id=room.id,
                    name=room.name,
                    participants=room.participants,
                    participant_count=len(room.participants),
                    is_active=room.is_active
                ))
        
        return rooms

class GetChatRoomMessagesHandler(cqrs.RequestHandler[GetChatRoomMessagesQuery, List[MessageResponse]]):
    @property
    def events(self) -> List[Event]:
        return []

    async def handle(self, request: GetChatRoomMessagesQuery) -> List[MessageResponse]:
        if request.room_id not in MESSAGES:
            return []
        
        messages = MESSAGES[request.room_id]
        # Return messages in reverse chronological order (newest first)
        start = len(messages) - request.offset - request.limit
        end = len(messages) - request.offset
        
        return messages[max(0, start):max(0, end)][::-1]

# Event Handlers
class ChatRoomCreatedEventHandler(cqrs.EventHandler[ChatRoomCreatedEvent]):
    def __init__(self, websocket_manager: WebSocketManagerProtocol):
        self._websocket_manager = websocket_manager

    async def handle(self, event: ChatRoomCreatedEvent) -> None:
        # Notify all online users about new room
        await self._websocket_manager.broadcast_to_all({
            "type": "room_created",
            "room_id": event.room_id,
            "room_name": event.room_name,
            "creator_id": event.creator_id,
            "created_at": event.created_at.isoformat()
        })
        print(f"Event: Room '{event.room_name}' created by {event.creator_id}")

class UserJoinedRoomEventHandler(cqrs.EventHandler[UserJoinedRoomEvent]):
    def __init__(self, websocket_manager: WebSocketManagerProtocol):
        self._websocket_manager = websocket_manager

    async def handle(self, event: UserJoinedRoomEvent) -> None:
        # Update room participant count
        await self._websocket_manager.broadcast_to_room(
            event.room_id,
            {
                "type": "user_joined",
                "user_id": event.user_id,
                "room_id": event.room_id,
                "joined_at": event.joined_at.isoformat()
            }
        )
        print(f"Event: User {event.user_id} joined room {event.room_id}")

class UserLeftRoomEventHandler(cqrs.EventHandler[UserLeftRoomEvent]):
    def __init__(self, websocket_manager: WebSocketManagerProtocol):
        self._websocket_manager = websocket_manager

    async def handle(self, event: UserLeftRoomEvent) -> None:
        # Notify remaining participants
        await self._websocket_manager.broadcast_to_room(
            event.room_id,
            {
                "type": "user_left",
                "user_id": event.user_id,
                "room_id": event.room_id,
                "left_at": event.left_at.isoformat()
            }
        )
        print(f"Event: User {event.user_id} left room {event.room_id}")

class MessageSentEventHandler(cqrs.EventHandler[MessageSentEvent]):
    def __init__(self, websocket_manager: WebSocketManagerProtocol):
        self._websocket_manager = websocket_manager

    async def handle(self, event: MessageSentEvent) -> None:
        # Real-time message broadcasting
        await self._websocket_manager.broadcast_to_room(
            event.room_id,
            {
                "type": "message_sent",
                "message_id": event.message_id,
                "user_id": event.user_id,
                "room_id": event.room_id,
                "content": event.content,
                "message_type": event.message_type,
                "timestamp": event.timestamp.isoformat()
            }
        )
        print(f"Event: Message {event.message_id} sent by {event.user_id} in room {event.room_id}")

# WebSocket Manager (simplified)
class WebSocketManager(WebSocketManagerProtocol):
    def __init__(self):
        self._connections: dict[str, set] = defaultdict(set)
        self._room_connections: dict[str, set] = defaultdict(set)

    async def add_connection(self, user_id: str, websocket):
        self._connections[user_id].add(websocket)

    async def remove_connection(self, user_id: str, websocket):
        self._connections[user_id].discard(websocket)

    async def add_to_room(self, user_id: str, room_id: str, websocket):
        self._room_connections[room_id].add(websocket)

    async def broadcast_to_user(self, user_id: str, message: dict):
        for websocket in self._connections[user_id]:
            try:
                await websocket.send_json(message)
            except:
                # Handle disconnected websockets
                pass

    async def broadcast_to_room(self, room_id: str, message: dict):
        for websocket in self._room_connections[room_id]:
            try:
                await websocket.send_json(message)
            except:
                # Handle disconnected websockets
                pass

    async def broadcast_to_all(self, message: dict):
        for user_connections in self._connections.values():
            for websocket in user_connections:
                try:
                    await websocket.send_json(message)
                except:
                    # Handle disconnected websockets
                    pass

# Mappers
def command_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(CreateChatRoomCommand, CreateChatRoomHandler)
    mapper.bind(JoinChatRoomCommand, JoinChatRoomHandler)
    mapper.bind(SendMessageCommand, SendMessageHandler)
    # LeaveChatRoomCommand would need its own handler implementation

def query_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(GetChatRoomQuery, GetChatRoomHandler)
    mapper.bind(GetUserChatRoomsQuery, GetUserChatRoomsHandler)
    mapper.bind(GetChatRoomMessagesQuery, GetChatRoomMessagesHandler)

def event_mapper(mapper: cqrs.EventMap) -> None:
    mapper.bind(ChatRoomCreatedEvent, ChatRoomCreatedEventHandler)
    mapper.bind(UserJoinedRoomEvent, UserJoinedRoomEventHandler)
    mapper.bind(UserLeftRoomEvent, UserLeftRoomEventHandler)
    mapper.bind(MessageSentEvent, MessageSentEventHandler)

# Bootstrap with DI
def setup_di() -> di.Container:
    container = di.Container()
    websocket_manager = WebSocketManager()
    
    container.bind(
        di.bind_by_type(
            di.Dependent(lambda: websocket_manager, scope="singleton"),
            WebSocketManager
        )
    )
    
    return container

async def main():
    mediator = bootstrap.bootstrap(
        di_container=setup_di(),
        queries_mapper=query_mapper,
        commands_mapper=command_mapper,
        domain_events_mapper=event_mapper,
    )
    
    # Create a chat room
    room_result = await mediator.send(CreateChatRoomCommand(
        name="General Chat",
        creator_id="user1",
        description="Main discussion room"
    ))
    print(f"Created room: {room_result.room_name} (ID: {room_result.room_id})")
    
    # Join users to the room
    join_result1 = await mediator.send(JoinChatRoomCommand(user_id="user2", room_id=room_result.room_id))
    join_result2 = await mediator.send(JoinChatRoomCommand(user_id="user3", room_id=room_result.room_id))
    print(f"Users joined: {join_result1.user_id}, {join_result2.user_id}")
    
    # Send messages
    message_result1 = await mediator.send(SendMessageCommand(
        user_id="user1",
        room_id=room_result.room_id,
        content="Hello everyone!"
    ))
    
    message_result2 = await mediator.send(SendMessageCommand(
        user_id="user2",
        room_id=room_result.room_id,
        content="Hi there!"
    ))
    print(f"Messages sent: {message_result1.message_id}, {message_result2.message_id}")
    
    # Query room info
    room_info = await mediator.send(GetChatRoomQuery(room_id=room_result.room_id))
    print(f"Room: {room_info.name}, Participants: {room_info.participant_count}")
    
    # Get messages
    messages = await mediator.send(GetChatRoomMessagesQuery(room_id=room_result.room_id, limit=10))
    print(f"Found {len(messages)} messages")
    
    # Get user's rooms
    user_rooms = await mediator.send(GetUserChatRoomsQuery(user_id="user1"))
    print(f"User1 is in {len(user_rooms)} rooms")

if __name__ == "__main__":
    asyncio.run(main())
```

## Key Concepts Demonstrated

### 1. **Domain Events and Event Handlers**

- `ChatRoomCreatedEvent`, `UserJoinedRoomEvent`, `MessageSentEvent`
- Events are emitted by command handlers and processed by event handlers
- Event handlers handle side effects like notifications, logging, and real-time updates
- Enable loose coupling between different parts of the system

### 2. **Validation and Error Handling**

- Pydantic validators for input validation
- Custom business logic validation in handlers
- Proper error propagation with meaningful messages

### 3. **Dependency Injection**

- WebSocket manager injected into handlers
- Clean separation of concerns
- Easy testing with mock dependencies

### 4. **WebSocket Integration**

- Real-time communication with clients
- Room-based broadcasting
- User-specific notifications

### 5. **Complex Query Patterns**

- Pagination support for messages
- User-specific room queries
- Aggregated data responses

### 6. **Event-Driven Architecture**

- Command handlers emit events after successful operations
- Event handlers process events asynchronously
- Multiple event handlers can process the same event
- Real-time notifications and side effects

This example shows how `python-cqrs` can be used to build complex, real-time applications with clean architecture,
proper separation of concerns, event-driven design, and excellent testability.
