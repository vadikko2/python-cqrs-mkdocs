# TypedDict Request/Response

**Type hints only** - Uses `TypedDict` for static type checking with zero runtime overhead.

## Best For

- Type hints for dictionaries
- Static type checking (mypy)
- When you need zero runtime overhead
- Integration with existing dict-based code

!!! warning "No Runtime Validation"
    TypedDict is only for static type checking. It doesn't provide runtime validation or instance creation. You'll need to implement `to_dict()` and `from_dict()` manually. TypedDict cannot directly implement `IRequest`/`IResponse`, so a wrapper class is required.

## Usage

Since `TypedDict` cannot directly implement `IRequest`/`IResponse`, we use a wrapper class:

```python
import cqrs
from typing import TypedDict, Self

# Define TypedDict for type hints
class TypedDictRequestDict(TypedDict):
    """Type definition for request dictionary."""
    user_id: str
    action: str

class TypedDictRequest(cqrs.IRequest):
    """Request using TypedDict for type hints."""
    
    def __init__(self, user_id: str, action: str):
        self.user_id = user_id
        self.action = action
    
    def to_dict(self) -> TypedDictRequestDict:
        """Convert to dictionary."""
        return {
            "user_id": self.user_id,
            "action": self.action
        }
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return cls(
            user_id=kwargs["user_id"],
            action=kwargs["action"]
        )

class TypedDictResponseDict(TypedDict):
    """Type definition for response dictionary."""
    result: str
    status: str

class TypedDictResponse(cqrs.IResponse):
    """Response using TypedDict for type hints."""
    
    def __init__(self, result: str, status: str):
        self.result = result
        self.status = status
    
    def to_dict(self) -> TypedDictResponseDict:
        """Convert to dictionary."""
        return {
            "result": self.result,
            "status": self.status
        }
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create from dictionary."""
        return cls(
            result=kwargs["result"],
            status=kwargs["status"]
        )
```

## Optional Fields

You can use `NotRequired` for optional fields:

```python
from typing import TypedDict, NotRequired

class OptionalFieldsDict(TypedDict):
    user_id: str
    action: str
    metadata: NotRequired[dict]

class OptionalFieldsRequest(cqrs.IRequest):
    def __init__(self, user_id: str, action: str, metadata: dict | None = None):
        self.user_id = user_id
        self.action = action
        self.metadata = metadata or {}
    
    def to_dict(self) -> OptionalFieldsDict:
        result: OptionalFieldsDict = {
            "user_id": self.user_id,
            "action": self.action
        }
        if self.metadata:
            result["metadata"] = self.metadata
        return result
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return cls(
            user_id=kwargs["user_id"],
            action=kwargs["action"],
            metadata=kwargs.get("metadata")
        )
```

## Total vs Non-Total

You can control whether all fields are required:

```python
# Total=True (default) - all fields required
class TotalDict(TypedDict, total=True):
    user_id: str
    action: str

# Total=False - all fields optional
class NonTotalDict(TypedDict, total=False):
    user_id: str
    action: str
```

## When to Use

Consider using TypedDict when:

- You need static type checking only
- Runtime overhead must be zero
- You're working with existing dict-based code
- You want type hints without runtime validation

## See Also

- [Standard Classes](standard_classes.md) - Similar approach with more flexibility
- [Request Handlers](../request_handler/index.md) - Learn about handler implementation
