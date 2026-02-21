# Dataclasses Request/Response

**Lightweight implementation** - Uses Python's standard library `dataclasses`.

## Best For

- When you want to avoid Pydantic dependency
- Internal system communication
- Performance-critical paths
- Simple data structures

## Features

- No external dependencies (beyond standard library)
- Fast and lightweight
- Simple and straightforward
- No runtime validation (by default)

## Usage

```python
import dataclasses
import cqrs

@dataclasses.dataclass
class CreateProductCommand(cqrs.DCRequest):
    """Dataclass-based command."""
    name: str
    price: float
    category: str

@dataclasses.dataclass
class ProductResponse(cqrs.DCResponse):
    """Dataclass-based response."""
    product_id: str
    name: str
    price: float
    category: str

class CreateProductHandler(
    cqrs.RequestHandler[CreateProductCommand, ProductResponse]
):
    @property
    def events(self) -> list[cqrs.IEvent]:
        return []
    
    async def handle(
        self, request: CreateProductCommand
    ) -> ProductResponse:
        product_id = f"product_{request.name}"
        return ProductResponse(
            product_id=product_id,
            name=request.name,
            price=request.price,
            category=request.category
        )
```

## Frozen Dataclasses

You can use frozen dataclasses for immutability:

```python
@dataclasses.dataclass(frozen=True)
class ImmutableRequest(cqrs.DCRequest):
    user_id: str
    action: str

# This will raise FrozenInstanceError
request = ImmutableRequest(user_id="123", action="test")
# request.user_id = "456  # ❌ Error: cannot assign to field
```

## Default Values

Dataclasses support default values and factory functions:

```python
@dataclasses.dataclass
class CreateOrderCommand(cqrs.DCRequest):
    user_id: str
    product_id: str
    quantity: int = 1
    tags: list[str] = dataclasses.field(default_factory=list)
```

## Serialization

```python
command = CreateProductCommand(
    name="Laptop",
    price=999.99,
    category="Electronics"
)

# Convert to dictionary
data = command.to_dict()
# {"name": "Laptop", "price": 999.99, "category": "Electronics"}

# Restore from dictionary
restored = CreateProductCommand.from_dict(**data)
```

## See Also

- [Request Handlers](../request_handler/index.md) - Learn about handler implementation
- [Mixed Usage](mixed_usage.md) - Combining Dataclasses with other types
