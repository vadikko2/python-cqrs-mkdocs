# Attrs Request/Response

**Advanced features** - Uses the `attrs` library for more features than standard dataclasses.

## Best For

- More features than standard dataclasses
- Functional-style codebases
- When you need more control than dataclasses
- Complex validation scenarios

!!! info "Installation"
    ```bash
    pip install attrs
    ```

## Usage

```python
import cqrs
import attrs
from typing import Self

@attrs.define
class AttrsRequest(cqrs.IRequest):
    """Request using attrs."""
    user_id: str = attrs.field(validator=attrs.validators.instance_of(str))
    action: str = attrs.field(validator=attrs.validators.instance_of(str))
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return attrs.asdict(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return cls(**kwargs)

@attrs.define(frozen=True)
class AttrsResponse(cqrs.IResponse):
    """Immutable response using attrs."""
    result: str = attrs.field()
    status: str = attrs.field()
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return attrs.asdict(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return cls(**kwargs)

class AttrsHandler(cqrs.RequestHandler[AttrsRequest, AttrsResponse]):
    @property
    def events(self) -> list[cqrs.IEvent]:
        return []
    
    async def handle(self, request: AttrsRequest) -> AttrsResponse:
        return AttrsResponse(
            result=f"Processed {request.action}",
            status="success"
        )
```

## Validation

Attrs provides powerful validation capabilities:

```python
import attrs
from typing import Self

@attrs.define
class ValidatedRequest(cqrs.IRequest):
    email: str = attrs.field(
        validator=attrs.validators.matches_re(r'^[\w\.-]+@[\w\.-]+\.\w+$')
    )
    age: int = attrs.field(
        validator=attrs.validators.and_(
            attrs.validators.ge(0),
            attrs.validators.le(120)
        )
    )
    
    def to_dict(self) -> dict:
        return attrs.asdict(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return cls(**kwargs)
```

## Custom Converters

You can use converters for automatic type conversion:

```python
@attrs.define
class ConvertedRequest(cqrs.IRequest):
    count: int = attrs.field(converter=int)
    tags: list[str] = attrs.field(
        converter=lambda x: x.split(",") if isinstance(x, str) else x
    )
    
    def to_dict(self) -> dict:
        return attrs.asdict(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return cls(**kwargs)
```

## Factory Functions

Attrs supports factory functions for default values:

```python
@attrs.define
class RequestWithDefaults(cqrs.IRequest):
    user_id: str
    metadata: dict = attrs.field(factory=dict)
    tags: list[str] = attrs.field(factory=list)
    
    def to_dict(self) -> dict:
        return attrs.asdict(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return cls(**kwargs)
```

## Immutable Classes

Use `frozen=True` for immutability:

```python
@attrs.define(frozen=True)
class ImmutableRequest(cqrs.IRequest):
    user_id: str
    action: str
    
    def to_dict(self) -> dict:
        return attrs.asdict(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return cls(**kwargs)
```

## See Also

- [Dataclasses](dataclasses.md) - Standard library alternative
- [Request Handlers](../request_handler.md) - Learn about handler implementation
