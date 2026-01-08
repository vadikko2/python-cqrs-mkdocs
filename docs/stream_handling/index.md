# Stream Handling

Stream handling allows you to process requests incrementally and yield results as they become available. This is particularly useful for processing large batches of items, file uploads, or any operation that benefits from real-time progress updates.

## Overview

<div class="grid cards" markdown>

-   :material-cog: **Configuration**

    Bootstrap setup and mediator usage for streaming requests.

    [:octicons-arrow-right-24: Read More](configuration.md)

-   :material-web: **FastAPI Integration**

    SSE integration examples for real-time progress updates.

    [:octicons-arrow-right-24: Read More](fastapi_integration.md)

-   :material-book-open-page-variant: **Reference**

    Key features, use cases, and best practices for stream handling.

    [:octicons-arrow-right-24: Read More](reference.md)

</div>

`StreamingRequestHandler` works with `StreamingRequestMediator` to process requests incrementally. The handler yields results as they become available, and events are processed after each yield. This enables:

- **Real-time progress updates** — Clients receive results as they're processed
- **Better user experience** — No need to wait for entire batch to complete
- **Parallel event processing** — Events can be processed concurrently while streaming
- **SSE integration** — Perfect for Server-Sent Events in web applications

!!! note "Prerequisites"
    Understanding of [Request Handlers](../request_handler.md) and [Bootstrap](../bootstrap/index.md) is recommended.

!!! tip "Use Cases"
    Streaming is ideal for large batch operations, file processing, or any scenario where you want to provide real-time feedback. See [FastAPI Integration](fastapi_integration.md) for SSE examples.

## Basic Example

Here's a simple example of a streaming handler:

```python
import typing
from datetime import datetime
import cqrs
from cqrs.requests.request_handler import StreamingRequestHandler
from cqrs.events.event import Event

class ProcessFilesCommand(cqrs.Request):
    file_ids: list[str]

class FileProcessedResult(cqrs.Response):
    file_id: str
    status: str
    processed_at: datetime

class ProcessFilesCommandHandler(
    StreamingRequestHandler[ProcessFilesCommand, FileProcessedResult]
):
    def __init__(self):
        self._events: list[Event] = []

    @property
    def events(self) -> list[Event]:
        return self._events.copy()

    def clear_events(self) -> None:
        self._events.clear()

    async def handle(
        self, request: ProcessFilesCommand
    ) -> typing.AsyncIterator[FileProcessedResult]:
        for file_id in request.file_ids:
            # Process file
            result = FileProcessedResult(
                file_id=file_id,
                status="completed",
                processed_at=datetime.now()
            )
            
            # Emit events
            self._events.append(
                FileProcessedEvent(file_id=file_id, ...)
            )
            
            # Yield result - events will be processed after this yield
            yield result
```
