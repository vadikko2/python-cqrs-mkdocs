# FastAPI Integration

## Table of Contents

- [Overview](#overview)
- [Setup](#setup)
- [Mediator Dependency Injection](#mediator-dependency-injection)
- [Command Handling (POST, PUT, DELETE)](#command-handling-post-put-delete)
- [Query Handling (GET)](#query-handling-get)
- [Event Handling with Background Tasks](#event-handling-with-background-tasks)
- [Server-Sent Events (SSE) with Streaming](#server-sent-events-sse-with-streaming)
- [Complete Example](#complete-example)
- [Best Practices](#best-practices)

## Overview

FastAPI integration with `python-cqrs` allows you to build RESTful APIs where FastAPI handles HTTP layer (routing, validation, serialization) while CQRS handles business logic through command/query handlers.

| Benefit | Description |
|---------|-------------|
| **Separation of Concerns** | HTTP layer vs business logic |
| **Type Safety** | Full Pydantic v2 support |
| **Testability** | Easy to test handlers independently |
| **Scalability** | Commands and queries can scale independently |

!!! note "Prerequisites"
    Understanding of [Bootstrap](bootstrap/index.md), [Request Handlers](request_handler.md), and [Stream Handling](stream_handling/index.md) is recommended.

!!! tip "Quick Start"
    This integration shows how to use mediators created via [Bootstrap](bootstrap/index.md) in FastAPI endpoints. See [Stream Handling](stream_handling/index.md) for SSE examples.

## Setup

First, install the required dependencies:

```bash
pip install fastapi uvicorn python-cqrs di
```

## Mediator Dependency Injection

The recommended way to inject mediators into FastAPI endpoints is using `Depends()` with factory functions. This ensures proper dependency management and allows for easy testing.

### Basic Mediator Factory

```python
import di
import fastapi
import cqrs
from cqrs.requests import bootstrap

def mediator_factory() -> cqrs.RequestMediator:
    """Factory function for RequestMediator dependency injection."""
    container = di.Container()
    
    # Your mappers (commands_mapper, queries_mapper, events_mapper)
    # should be defined elsewhere in your application
    
    return bootstrap.bootstrap(
        di_container=container,
        commands_mapper=commands_mapper,
        queries_mapper=queries_mapper,
        domain_events_mapper=events_mapper,
    )

# Use in endpoint
@app.post("/users")
async def create_user(
    command: CreateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
):
    return await mediator.send(command)
```

### Mediator Factory Comparison

| Factory Type | Performance | Use Case |
|--------------|-------------|----------|
| **Basic Factory** | Creates new mediator per request | Development, testing |
| **Singleton Factory** | Reuses mediator across requests | Production (recommended) |
| **Per-Request Factory** | Creates mediator per request with DI | Advanced scenarios |

!!! tip "Production Recommendation"
    Use singleton mediator factory for better performance. The mediator is thread-safe and can be safely reused.

### Singleton Mediator (Recommended for Production)

For better performance, you can create a singleton mediator that's reused across requests:

```python
import functools

@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.RequestMediator:
    """Singleton mediator factory - created once and reused."""
    container = di.Container()
    return bootstrap.bootstrap(
        di_container=container,
        commands_mapper=commands_mapper,
        queries_mapper=queries_mapper,
        domain_events_mapper=events_mapper,
    )
```

### Streaming Mediator Factory

For streaming endpoints, create a separate factory:

```python
@functools.lru_cache(maxsize=1)
def streaming_mediator_factory() -> cqrs.StreamingRequestMediator:
    """Factory for StreamingRequestMediator."""
    container = di.Container()
    return bootstrap.bootstrap_streaming(
        di_container=container,
        commands_mapper=commands_mapper,
        domain_events_mapper=events_mapper,
        max_concurrent_event_handlers=5,
        concurrent_event_handle_enable=True,
    )
```

### Event Emitter Factory

For background task processing:

```python
from cqrs.requests import bootstrap
from cqrs.events import EventEmitter

@functools.lru_cache(maxsize=1)
def event_emitter_factory() -> EventEmitter:
    """Factory for EventEmitter used in background tasks."""
    container = di.Container()
    return bootstrap.setup_event_emitter(
        container=container,
        domain_events_mapper=events_mapper,
    )
```

### Using Multiple Mediators

You can inject multiple mediators into a single endpoint:

```python
@app.post("/process")
async def process_request(
    command: ProcessCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
    streaming_mediator: cqrs.StreamingRequestMediator = fastapi.Depends(
        streaming_mediator_factory
    ),
):
    # Use appropriate mediator based on logic
    if command.use_streaming:
        async for result in streaming_mediator.stream(command):
            yield result
    else:
        return await mediator.send(command)
```

## Command Handling (POST, PUT, DELETE)

Commands modify state and typically don't return data (or return minimal data). Use POST for creation, PUT for updates, and DELETE for deletion.

### POST Request (Create Command)

```python
import fastapi
import cqrs

@app.post("/users", status_code=201)
async def create_user(
    command: CreateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserCreatedResponse:
    """Create a new user."""
    return await mediator.send(command)
```

### PUT Request (Update Command)

```python
@app.put("/users/{user_id}")
async def update_user(
    user_id: str,
    command: UpdateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserUpdatedResponse:
    """Update an existing user."""
    command.user_id = user_id  # Set from path parameter
    return await mediator.send(command)
```

### DELETE Request (Delete Command)

```python
@app.delete("/users/{user_id}", status_code=200)
async def delete_user(
    user_id: str,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserDeletedResponse:
    """Delete a user."""
    command = DeleteUserCommand(user_id=user_id)
    return await mediator.send(command)
```

### Command with Path and Body Parameters

```python
@app.put("/users/{user_id}/profile")
async def update_user_profile(
    user_id: str,
    profile_data: ProfileUpdateRequest,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> ProfileResponse:
    """Update user profile with path and body parameters."""
    command = UpdateProfileCommand(
        user_id=user_id,
        **profile_data.model_dump()
    )
    return await mediator.send(command)
```

### Command with Query Parameters

```python
@app.post("/users/{user_id}/notify")
async def notify_user(
    user_id: str,
    notification_type: str = fastapi.Query(...),
    priority: str = fastapi.Query("normal"),
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> NotificationResponse:
    """Send notification to user with query parameters."""
    command = NotifyUserCommand(
        user_id=user_id,
        notification_type=notification_type,
        priority=priority
    )
    return await mediator.send(command)
```

## Query Handling (GET)

Queries read data without modifying state. Use GET requests for queries.

### Basic GET Request

```python
@app.get("/users/{user_id}")
async def get_user(
    user_id: str,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserResponse:
    """Get user by ID."""
    query = GetUserQuery(user_id=user_id)
    return await mediator.send(query)
```

### GET with Query Parameters

```python
@app.get("/users")
async def list_users(
    page: int = fastapi.Query(1, ge=1),
    page_size: int = fastapi.Query(10, ge=1, le=100),
    search: str | None = fastapi.Query(None),
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> ListUsersResponse:
    """List users with pagination and search."""
    query = ListUsersQuery(
        page=page,
        page_size=page_size,
        search=search
    )
    return await mediator.send(query)
```

### GET with Multiple Path Parameters

```python
@app.get("/users/{user_id}/orders/{order_id}")
async def get_user_order(
    user_id: str,
    order_id: str,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> OrderResponse:
    """Get specific order for a user."""
    query = GetUserOrderQuery(user_id=user_id, order_id=order_id)
    return await mediator.send(query)
```

### GET with Optional Parameters

```python
@app.get("/users/{user_id}/analytics")
async def get_user_analytics(
    user_id: str,
    start_date: str | None = fastapi.Query(None),
    end_date: str | None = fastapi.Query(None),
    include_details: bool = fastapi.Query(False),
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> AnalyticsResponse:
    """Get user analytics with optional date range."""
    query = GetUserAnalyticsQuery(
        user_id=user_id,
        start_date=start_date,
        end_date=end_date,
        include_details=include_details
    )
    return await mediator.send(query)
```

## Event Handling with Background Tasks

Sometimes you need to process events asynchronously using FastAPI's `BackgroundTasks`. This is useful when you want to:

- Process events after returning HTTP response
- Handle events from external systems
- Decouple event processing from request handling

### POST Endpoint with Background Task

```python
from fastapi import BackgroundTasks

@app.post("/events/process", status_code=202)
async def process_event(
    event: UserCreatedEvent,
    background_tasks: BackgroundTasks,
    emitter: EventEmitter = fastapi.Depends(event_emitter_factory),
) -> dict:
    """Process event asynchronously using background tasks."""
    background_tasks.add_task(emitter.emit, event)
    
    return {
        "status": "accepted",
        "event_id": event.event_id,
        "message": "Event will be processed in background"
    }
```

### PUT Endpoint with Background Task

```python
@app.put("/events/{event_id}/process", status_code=202)
async def process_event_by_id(
    event_id: str,
    event_data: dict,
    background_tasks: BackgroundTasks,
    emitter: EventEmitter = fastapi.Depends(event_emitter_factory),
) -> dict:
    """Process event by ID asynchronously."""
    # Create event from event_data
    event = UserCreatedEvent(
        user_id=event_data.get("user_id", event_id),
        email=event_data.get("email", "")
    )
    
    background_tasks.add_task(emitter.emit, event)
    
    return {
        "status": "accepted",
        "event_id": event_id,
        "message": "Event processing started"
    }
```

### Processing Multiple Events

```python
@app.post("/events/batch", status_code=202)
async def process_events_batch(
    events: list[UserCreatedEvent],
    background_tasks: BackgroundTasks,
    emitter: EventEmitter = fastapi.Depends(event_emitter_factory),
) -> dict:
    """Process multiple events in background."""
    for event in events:
        background_tasks.add_task(emitter.emit, event)
    
    return {
        "status": "accepted",
        "events_count": len(events),
        "message": f"{len(events)} events will be processed in background"
    }
```

### Event Processing with Error Handling

```python
async def emit_event_safe(emitter: EventEmitter, event: cqrs.Event):
    """Safely emit event with error handling."""
    try:
        await emitter.emit(event)
    except Exception as e:
        # Log error, send to error queue, etc.
        print(f"Error processing event {event.event_id}: {e}")

@app.post("/events", status_code=202)
async def process_event_safe(
    event: UserCreatedEvent,
    background_tasks: BackgroundTasks,
    emitter: EventEmitter = fastapi.Depends(event_emitter_factory),
) -> dict:
    """Process event with error handling."""
    background_tasks.add_task(emit_event_safe, emitter, event)
    
    return {
        "status": "accepted",
        "event_id": event.event_id
    }
```

## Server-Sent Events (SSE) with Streaming

Server-Sent Events (SSE) allow you to stream data to clients in real-time. This is perfect for:

- Long-running operations with progress updates
- Batch processing with real-time feedback
- File processing with incremental results

### Basic SSE Endpoint

```python
import json

@app.post("/process-files")
async def process_files_stream(
    command: ProcessFilesCommand,
    mediator: cqrs.StreamingRequestMediator = fastapi.Depends(
        streaming_mediator_factory
    ),
) -> fastapi.responses.StreamingResponse:
    """Process files and stream results via SSE."""
    
    async def generate_sse():
        """Generate SSE events from streaming mediator."""
        try:
            # Send initial event
            yield f"data: {json.dumps({'type': 'start', 'message': f'Processing {len(command.file_ids)} files...'})}\n\n"
            
            processed_count = 0
            
            # Stream results from mediator
            async for result in mediator.stream(command):
                if result is None:
                    continue
                
                processed_count += 1
                
                # Format result as SSE event
                sse_data = {
                    "type": "progress",
                    "data": {
                        "file_id": result.file_id,
                        "status": result.status,
                        "progress": {
                            "current": processed_count,
                            "total": len(command.file_ids),
                            "percentage": int(
                                (processed_count / len(command.file_ids)) * 100
                            ),
                        },
                    },
                }
                
                yield f"data: {json.dumps(sse_data)}\n\n"
            
            # Send completion event
            completion_data = {
                "type": "complete",
                "message": f"Successfully processed {processed_count} files",
                "total_processed": processed_count,
            }
            yield f"data: {json.dumps(completion_data)}\n\n"
            
        except Exception as e:
            error_data = {
                "type": "error",
                "message": str(e),
            }
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return fastapi.responses.StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable buffering in nginx
        },
    )
```

### SSE with Query Parameters

```python
@app.post("/process")
async def process_with_options(
    command: ProcessCommand,
    include_details: bool = fastapi.Query(False),
    mediator: cqrs.StreamingRequestMediator = fastapi.Depends(
        streaming_mediator_factory
    ),
) -> fastapi.responses.StreamingResponse:
    """Process with streaming and query parameters."""
    
    async def generate_sse():
        yield f"data: {json.dumps({'type': 'start'})}\n\n"
        
        async for result in mediator.stream(command):
            if result is None:
                continue
            
            sse_data = {
                "type": "progress",
                "data": result.model_dump(include=include_details),
            }
            yield f"data: {json.dumps(sse_data)}\n\n"
        
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    
    return fastapi.responses.StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
    )
```

### SSE with Path Parameters

```python
@app.post("/users/{user_id}/process")
async def process_user_files(
    user_id: str,
    command: ProcessFilesCommand,
    mediator: cqrs.StreamingRequestMediator = fastapi.Depends(
        streaming_mediator_factory
    ),
) -> fastapi.responses.StreamingResponse:
    """Process files for a specific user."""
    
    # Add user_id to command
    command.user_id = user_id
    
    async def generate_sse():
        yield f"data: {json.dumps({'type': 'start', 'user_id': user_id})}\n\n"
        
        async for result in mediator.stream(command):
            if result is None:
                continue
            yield f"data: {json.dumps(result.model_dump())}\n\n"
        
        yield f"data: {json.dumps({'type': 'complete'})}\n\n"
    
    return fastapi.responses.StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
    )
```

## Complete Example

Here's a complete FastAPI application demonstrating all integration patterns:

```python
import functools
import json
from fastapi import BackgroundTasks

import di
import fastapi
import cqrs
from cqrs.requests import bootstrap
from cqrs.events import EventEmitter
from cqrs.message_brokers import devnull

app = fastapi.FastAPI(title="CQRS FastAPI Integration Example")

# ============================================================================
# Mediator Factories
# ============================================================================

@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.RequestMediator:
    """Factory for RequestMediator - singleton pattern."""
    container = di.Container()
    return bootstrap.bootstrap(
        di_container=container,
        commands_mapper=commands_mapper,
        queries_mapper=queries_mapper,
        domain_events_mapper=events_mapper,
        message_broker=devnull.DevnullMessageBroker(),
    )

@functools.lru_cache(maxsize=1)
def streaming_mediator_factory() -> cqrs.StreamingRequestMediator:
    """Factory for StreamingRequestMediator - singleton pattern."""
    container = di.Container()
    return bootstrap.bootstrap_streaming(
        di_container=container,
        commands_mapper=commands_mapper,
        domain_events_mapper=events_mapper,
        max_concurrent_event_handlers=5,
        concurrent_event_handle_enable=True,
    )

@functools.lru_cache(maxsize=1)
def event_emitter_factory() -> EventEmitter:
    """Factory for EventEmitter - singleton pattern."""
    container = di.Container()
    return bootstrap.setup_event_emitter(
        container=container,
        domain_events_mapper=events_mapper,
    )

# ============================================================================
# Command Endpoints
# ============================================================================

@app.post("/users", status_code=201)
async def create_user(
    command: CreateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserCreatedResponse:
    """Create a new user."""
    return await mediator.send(command)

@app.put("/users/{user_id}")
async def update_user(
    user_id: str,
    command: UpdateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserUpdatedResponse:
    """Update an existing user."""
    command.user_id = user_id
    return await mediator.send(command)

@app.delete("/users/{user_id}", status_code=200)
async def delete_user(
    user_id: str,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserDeletedResponse:
    """Delete a user."""
    command = DeleteUserCommand(user_id=user_id)
    return await mediator.send(command)

# ============================================================================
# Query Endpoints
# ============================================================================

@app.get("/users/{user_id}")
async def get_user(
    user_id: str,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserResponse:
    """Get user by ID."""
    query = GetUserQuery(user_id=user_id)
    return await mediator.send(query)

@app.get("/users")
async def list_users(
    page: int = fastapi.Query(1, ge=1),
    page_size: int = fastapi.Query(10, ge=1, le=100),
    search: str | None = fastapi.Query(None),
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> ListUsersResponse:
    """List users with pagination."""
    query = ListUsersQuery(page=page, page_size=page_size, search=search)
    return await mediator.send(query)

# ============================================================================
# Event Processing Endpoints
# ============================================================================

@app.post("/events", status_code=202)
async def process_event(
    event: UserCreatedEvent,
    background_tasks: BackgroundTasks,
    emitter: EventEmitter = fastapi.Depends(event_emitter_factory),
) -> dict:
    """Process event asynchronously."""
    background_tasks.add_task(emitter.emit, event)
    return {
        "status": "accepted",
        "event_id": event.event_id,
        "message": "Event will be processed in background"
    }

@app.put("/events/{event_id}/process", status_code=202)
async def process_event_by_id(
    event_id: str,
    event_data: dict,
    background_tasks: BackgroundTasks,
    emitter: EventEmitter = fastapi.Depends(event_emitter_factory),
) -> dict:
    """Process event by ID asynchronously."""
    event = UserCreatedEvent(
        user_id=event_data.get("user_id", event_id),
        email=event_data.get("email", "")
    )
    background_tasks.add_task(emitter.emit, event)
    return {
        "status": "accepted",
        "event_id": event_id
    }

# ============================================================================
# Streaming Endpoints
# ============================================================================

@app.post("/process-files")
async def process_files_stream(
    command: ProcessFilesCommand,
    mediator: cqrs.StreamingRequestMediator = fastapi.Depends(
        streaming_mediator_factory
    ),
) -> fastapi.responses.StreamingResponse:
    """Process files and stream results via SSE."""
    
    async def generate_sse():
        yield f"data: {json.dumps({'type': 'start', 'message': f'Processing {len(command.file_ids)} files...'})}\n\n"
        
        processed_count = 0
        async for result in mediator.stream(command):
            if result is None:
                continue
            
            processed_count += 1
            sse_data = {
                "type": "progress",
                "data": result.model_dump(),
                "progress": {
                    "current": processed_count,
                    "total": len(command.file_ids),
                    "percentage": int((processed_count / len(command.file_ids)) * 100),
                },
            }
            yield f"data: {json.dumps(sse_data)}\n\n"
        
        yield f"data: {json.dumps({'type': 'complete', 'total_processed': processed_count})}\n\n"
    
    return fastapi.responses.StreamingResponse(
        generate_sse(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        },
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

## Best Practices

### 1. Use Singleton Factories

Use `@functools.lru_cache` to create singleton mediators for better performance:

```python
@functools.lru_cache(maxsize=1)
def mediator_factory() -> cqrs.RequestMediator:
    return bootstrap.bootstrap(...)
```

### 2. Separate Factories

Create separate factories for different mediator types:

```python
def mediator_factory() -> cqrs.RequestMediator:
    # For commands and queries
    pass

def streaming_mediator_factory() -> cqrs.StreamingRequestMediator:
    # For streaming requests
    pass

def event_emitter_factory() -> EventEmitter:
    # For background event processing
    pass
```

### 3. Error Handling

Handle errors appropriately in endpoints:

```python
from fastapi import HTTPException

@app.post("/users")
async def create_user(
    command: CreateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
) -> UserCreatedResponse:
    try:
        return await mediator.send(command)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
```

### 4. Response Models

Always define response models for type safety:

```python
@app.post("/users", response_model=UserCreatedResponse, status_code=201)
async def create_user(...) -> UserCreatedResponse:
    ...
```

### 5. Background Tasks

Use background tasks for long-running event processing:

```python
@app.post("/events")
async def process_event(
    event: UserCreatedEvent,
    background_tasks: BackgroundTasks,
    emitter: EventEmitter = fastapi.Depends(event_emitter_factory),
) -> dict:
    background_tasks.add_task(emitter.emit, event)
    return {"status": "accepted"}
```

### 6. SSE Headers

Always set proper headers for SSE:

```python
return fastapi.responses.StreamingResponse(
    generate_sse(),
    media_type="text/event-stream",
    headers={
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",  # For nginx
    },
)
```

### 7. Path Parameters

Extract path parameters and set them in commands/queries:

```python
@app.put("/users/{user_id}")
async def update_user(
    user_id: str,
    command: UpdateUserCommand,
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
):
    command.user_id = user_id  # Set from path
    return await mediator.send(command)
```

### 8. Query Parameters

Use FastAPI Query for validation and defaults:

```python
@app.get("/users")
async def list_users(
    page: int = fastapi.Query(1, ge=1),
    page_size: int = fastapi.Query(10, ge=1, le=100),
    mediator: cqrs.RequestMediator = fastapi.Depends(mediator_factory),
):
    query = ListUsersQuery(page=page, page_size=page_size)
    return await mediator.send(query)
```
