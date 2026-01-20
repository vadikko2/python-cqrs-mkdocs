# Standard Python Classes

**Full control** - Implement `IRequest`/`IResponse` directly with standard Python classes.

## Best For

- Full control over serialization
- Custom validation logic
- Integration with existing codebases
- Minimal dependencies

## Usage

```python
import cqrs
from typing import Self

class CustomRequest(cqrs.IRequest):
    """Custom request using standard Python class."""
    
    def __init__(self, user_id: str, action: str):
        self.user_id = user_id
        self.action = action
    
    def to_dict(self) -> dict:
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

class CustomResponse(cqrs.IResponse):
    """Custom response using standard Python class."""
    
    def __init__(self, result: str, status: str):
        self.result = result
        self.status = status
    
    def to_dict(self) -> dict:
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

class CustomHandler(cqrs.RequestHandler[CustomRequest, CustomResponse]):
    @property
    def events(self) -> list[cqrs.IEvent]:
        return []
    
    async def handle(self, request: CustomRequest) -> CustomResponse:
        return CustomResponse(
            result=f"Processed {request.action} for {request.user_id}",
            status="success"
        )
```

## Custom Validation

You can add custom validation logic in `from_dict`:

```python
class ValidatedRequest(cqrs.IRequest):
    def __init__(self, user_id: str, age: int):
        if age < 0 or age > 150:
            raise ValueError("Age must be between 0 and 150")
        self.user_id = user_id
        self.age = age
    
    def to_dict(self) -> dict:
        return {
            "user_id": self.user_id,
            "age": self.age
        }
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return cls(**kwargs)
```

## Complex Serialization

You can implement complex serialization logic:

```python
import json
from datetime import datetime
from typing import Self

class TimestampedRequest(cqrs.IRequest):
    def __init__(self, data: str, timestamp: datetime | None = None):
        self.data = data
        self.timestamp = timestamp or datetime.now()
    
    def to_dict(self) -> dict:
        return {
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        timestamp = kwargs.get("timestamp")
        if isinstance(timestamp, str):
            timestamp = datetime.fromisoformat(timestamp)
        return cls(
            data=kwargs["data"],
            timestamp=timestamp
        )
```

## See Also

- [Request Handlers](../request_handler.md) - Learn about handler implementation
- [Best Practices](best_practices.md) - Recommendations for custom implementations
