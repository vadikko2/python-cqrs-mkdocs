# Pydantic Request/Response

**Default implementation** - Uses Pydantic v2 for validation and serialization.

## Best For

- Web APIs (especially with FastAPI)
- When you need runtime validation
- Complex data transformations
- JSON Schema generation

## Features

- Automatic validation
- Type coercion
- Excellent developer experience
- JSON Schema support

## Usage

```python
import cqrs
import pydantic

class CreateUserCommand(cqrs.PydanticRequest):
    """Pydantic-based command with validation."""
    username: str
    email: str = pydantic.Field(pattern=r'^[\w\.-]+@[\w\.-]+\.\w+$')
    age: int = pydantic.Field(gt=0, le=120)

class UserResponse(cqrs.PydanticResponse):
    """Pydantic-based response."""
    user_id: str
    username: str
    email: str
    age: int

class CreateUserHandler(cqrs.RequestHandler[CreateUserCommand, UserResponse]):
    @property
    def events(self) -> list[cqrs.IEvent]:
        return []
    
    async def handle(self, request: CreateUserCommand) -> UserResponse:
        # Validation happens automatically
        user_id = f"user_{request.username}"
        return UserResponse(
            user_id=user_id,
            username=request.username,
            email=request.email,
            age=request.age
        )
```

## Aliases

For convenience, `PydanticRequest` and `PydanticResponse` are aliased as `Request` and `Response`:

```python
import cqrs

# These are equivalent:
class MyCommand(cqrs.Request):  # Same as cqrs.PydanticRequest
    pass

class MyResponse(cqrs.Response):  # Same as cqrs.PydanticResponse
    pass
```

## Validation

Pydantic provides automatic validation based on type hints and field validators:

```python
import cqrs
import pydantic

class CreateProductCommand(cqrs.PydanticRequest):
    name: str = pydantic.Field(min_length=1, max_length=100)
    price: float = pydantic.Field(gt=0)
    category: str = pydantic.Field(pattern=r'^[A-Z][a-z]+$')

# This will raise ValidationError
try:
    command = CreateProductCommand(
        name="",  # Too short
        price=-10,  # Negative
        category="invalid"  # Doesn't match pattern
    )
except pydantic.ValidationError as e:
    print(e)
```

## Serialization

Pydantic provides built-in serialization methods:

```python
command = CreateUserCommand(
    username="john",
    email="john@example.com",
    age=30
)

# Convert to dictionary
data = command.to_dict()
# {"username": "john", "email": "john@example.com", "age": 30}

# Restore from dictionary
restored = CreateUserCommand.from_dict(**data)
```

## See Also

- [Request Handlers](../request_handler.md) - Learn about handler implementation
- [Mixed Usage](mixed_usage.md) - Combining Pydantic with other types
