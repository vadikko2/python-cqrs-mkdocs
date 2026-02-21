# Msgspec Request/Response

**High-performance** - Uses `msgspec` for blazing-fast serialization (up to 10x faster than Pydantic).

## Best For

- High-performance microservices
- When speed is critical (up to 10x faster than Pydantic)
- JSON and MsgPack serialization
- WebSocket applications

!!! info "Installation"
    ```bash
    pip install msgspec
    ```

!!! tip "Performance"
    Msgspec is written in Rust and provides significantly better performance than Pydantic for serialization/deserialization.

## Usage

```python
import cqrs
import msgspec
from typing import Self

class MsgspecRequest(cqrs.IRequest, msgspec.Struct):
    """Request using msgspec.Struct."""
    user_id: str
    action: str
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return msgspec.to_builtins(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return msgspec.from_builtins(cls, kwargs)

class MsgspecResponse(cqrs.IResponse, msgspec.Struct):
    """Response using msgspec.Struct."""
    result: str
    status: str
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return msgspec.to_builtins(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return msgspec.from_builtins(cls, kwargs)

class MsgspecHandler(cqrs.RequestHandler[MsgspecRequest, MsgspecResponse]):
    @property
    def events(self) -> list[cqrs.IEvent]:
        return []
    
    async def handle(self, request: MsgspecRequest) -> MsgspecResponse:
        return MsgspecResponse(
            result=f"Processed {request.action}",
            status="success"
        )
```

## Validation

Msgspec provides runtime validation:

```python
import msgspec

class ValidatedRequest(cqrs.IRequest, msgspec.Struct):
    email: str = msgspec.field()
    age: int = msgspec.field(ge=0, le=120)
    
    def to_dict(self) -> dict:
        return msgspec.to_builtins(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return msgspec.from_builtins(cls, kwargs)
```

## Frozen Structs

You can create immutable structs:

```python
class ImmutableRequest(cqrs.IRequest, msgspec.Struct, frozen=True):
    user_id: str
    action: str
    
    def to_dict(self) -> dict:
        return msgspec.to_builtins(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return msgspec.from_builtins(cls, kwargs)
```

## Performance Comparison

Msgspec is significantly faster than Pydantic for serialization:

| Operation | Pydantic | Msgspec | Speedup |
|-----------|----------|---------|---------|
| Serialization | 1x | ~5-10x | 5-10x faster |
| Deserialization | 1x | ~5-10x | 5-10x faster |

## See Also

- [Pydantic](pydantic.md) - Alternative with more features
- [Request Handlers](../request_handler/index.md) - Learn about handler implementation
