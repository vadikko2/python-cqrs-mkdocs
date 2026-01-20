# NamedTuple Request/Response

**Immutable and memory-efficient** - Uses Python's `NamedTuple` for lightweight data structures.

## Best For

- Immutable data structures
- Memory efficiency
- Simple, fixed configurations
- When immutability is required

!!! warning "Limitations"
    NamedTuple is immutable and has limited flexibility. Consider using dataclasses with `frozen=True` for similar benefits with more features. NamedTuple cannot directly inherit from `IRequest`/`IResponse`, so a wrapper class is needed.

## Usage

Since `NamedTuple` cannot directly inherit from `IRequest`/`IResponse`, we use a wrapper class:

```python
import cqrs
from typing import NamedTuple, Self

# Define the NamedTuple structure
_NamedTupleRequestBase = NamedTuple(
    "NamedTupleRequestBase",
    [("user_id", str), ("action", str)]
)

class NamedTupleRequest(cqrs.IRequest):
    """Request using NamedTuple as internal storage."""
    
    def __init__(self, user_id: str, action: str):
        self._data = _NamedTupleRequestBase(user_id=user_id, action=action)
    
    @property
    def user_id(self) -> str:
        return self._data.user_id
    
    @property
    def action(self) -> str:
        return self._data.action
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "user_id": self._data.user_id,
            "action": self._data.action
        }
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return cls(
            user_id=kwargs["user_id"],
            action=kwargs["action"]
        )

# Define the NamedTuple structure for response
_NamedTupleResponseBase = NamedTuple(
    "NamedTupleResponseBase",
    [("result", str), ("status", str)]
)

class NamedTupleResponse(cqrs.IResponse):
    """Response using NamedTuple as internal storage."""
    
    def __init__(self, result: str, status: str):
        self._data = _NamedTupleResponseBase(result=result, status=status)
    
    @property
    def result(self) -> str:
        return self._data.result
    
    @property
    def status(self) -> str:
        return self._data.status
    
    def to_dict(self) -> dict:
        """Convert to dictionary."""
        return {
            "result": self._data.result,
            "status": self._data.status
        }
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return cls(
            result=kwargs["result"],
            status=kwargs["status"]
        )
```

## Alternative: Using Class-Based NamedTuple

You can also use the class-based syntax:

```python
from typing import NamedTuple, Self

class NamedTupleRequestData(NamedTuple):
    user_id: str
    action: str

class NamedTupleRequest(cqrs.IRequest):
    def __init__(self, user_id: str, action: str):
        self._data = NamedTupleRequestData(user_id=user_id, action=action)
    
    @property
    def user_id(self) -> str:
        return self._data.user_id
    
    @property
    def action(self) -> str:
        return self._data.action
    
    def to_dict(self) -> dict:
        return self._data._asdict()
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return cls(**kwargs)
```

## When to Use

Consider using NamedTuple when:

- You need immutability guarantees
- Memory usage is critical
- You have simple, fixed data structures
- You want tuple-like behavior with named fields

## See Also

- [Dataclasses](dataclasses.md) - Similar features with more flexibility
- [Request Handlers](../request_handler.md) - Learn about handler implementation
