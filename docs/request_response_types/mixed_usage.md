# Mixed Usage

You can mix different types for requests and responses based on your needs. This flexibility allows you to choose the best type for each use case.

## Examples

### Pydantic Request with Dataclass Response

Use Pydantic for request validation, but lightweight dataclass for response:

```python
import dataclasses
import cqrs
import pydantic

# Pydantic request with validation
class CreateOrderCommand(cqrs.PydanticRequest):
    user_id: str
    product_id: str
    quantity: int = pydantic.Field(gt=0)

# Dataclass response - lightweight
@dataclasses.dataclass
class OrderResponse(cqrs.DCResponse):
    order_id: str
    total_price: float

class CreateOrderHandler(
    cqrs.RequestHandler[CreateOrderCommand, OrderResponse]
):
    @property
    def events(self) -> list[cqrs.IEvent]:
        return []
    
    async def handle(self, request: CreateOrderCommand) -> OrderResponse:
        # Request is validated by Pydantic
        total_price = 99.99 * request.quantity
        return OrderResponse(
            order_id=f"order_{request.user_id}",
            total_price=total_price
        )
```

### Dataclass Request with Pydantic Response

Use lightweight dataclass for request, but Pydantic for response validation:

```python
@dataclasses.dataclass
class GetUserQuery(cqrs.DCRequest):
    """Dataclass query - simple and lightweight."""
    user_id: str

class UserDetailsResponse(cqrs.PydanticResponse):
    """Pydantic response with validation."""
    user_id: str
    username: str
    email: str
    total_orders: int = 0

class GetUserQueryHandler(
    cqrs.RequestHandler[GetUserQuery, UserDetailsResponse]
):
    @property
    def events(self) -> list[cqrs.IEvent]:
        return []
    
    async def handle(self, request: GetUserQuery) -> UserDetailsResponse:
        # Response is validated by Pydantic
        return UserDetailsResponse(
            user_id=request.user_id,
            username="john",
            email="john@example.com",
            total_orders=5
        )
```

### Msgspec Request with Dataclass Response

High-performance request with lightweight response:

```python
import msgspec

class ProcessDataRequest(cqrs.IRequest, msgspec.Struct):
    data: str
    options: dict
    
    def to_dict(self) -> dict:
        return msgspec.to_builtins(self)
    
    @classmethod
    def from_dict(cls, **kwargs) -> Self:
        return msgspec.from_builtins(cls, kwargs)

@dataclasses.dataclass
class ProcessDataResponse(cqrs.DCResponse):
    result: str
    processed_at: str
```

## Best Practices for Mixed Usage

1. **Validate Input, Optimize Output**
   - Use Pydantic/Msgspec for requests (external input)
   - Use Dataclasses for responses (internal data)

2. **Performance-Critical Paths**
   - Use Msgspec for high-throughput requests
   - Use Dataclasses for simple responses

3. **Consistency Within Domains**
   - Keep the same type for related requests/responses
   - Document your choices in team guidelines

4. **Migration Strategy**
   - Start with one type, migrate gradually
   - All types implement the same interface

## See Also

- [Best Practices](best_practices.md) - Recommendations for choosing types
- [Request Handlers](../request_handler.md) - Learn about handler implementation
