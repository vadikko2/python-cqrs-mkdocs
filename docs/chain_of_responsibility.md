# Chain of Responsibility

## Table of Contents

- [Overview](#overview)
- [Pattern Description](#pattern-description)
- [Basic Example](#basic-example)
- [Registering Chain Handlers](#registering-chain-handlers)
- [Complete Example](#complete-example)
- [Manual Chain Building](#manual-chain-building)
- [Handler Methods](#handler-methods)
- [Use Cases](#use-cases)
- [Best Practices](#best-practices)
- [Differences from Regular Handlers](#differences-from-regular-handlers)
- [Synchronous COR Handlers](#synchronous-cor-handlers)
- [Integration with Other Patterns](#integration-with-other-patterns)
- [Summary](#summary)

The Chain of Responsibility pattern allows multiple handlers to process a request in sequence until one successfully handles it. This pattern is particularly useful when you have multiple processing strategies or need to implement fallback mechanisms.

## Overview

`CORRequestHandler` implements the Chain of Responsibility pattern, allowing multiple handlers to process a request sequentially. Each handler decides whether to process the request or pass it to the next handler in the chain. The chain stops when a handler successfully processes the request or when all handlers have been exhausted.

### Key Benefits

- **Flexible processing** — Multiple strategies can be tried in order
- **Fallback mechanisms** — Default handlers can handle unsupported cases
- **Separation of concerns** — Each handler focuses on a specific case
- **Easy to extend** — Add new handlers without modifying existing ones

## Pattern Description

The Chain of Responsibility pattern consists of:

1. **Handler Interface** — `CORRequestHandler` defines the interface for handlers in the chain
2. **Concrete Handlers** — Multiple handlers that can process requests
3. **Chain Building** — Handlers are linked together in a specific order
4. **Request Passing** — Each handler can either process the request or pass it to the next handler

### How It Works

```
Request → Handler 1 → Handler 2 → Handler 3 → Default Handler
           ↓           ↓           ↓              ↓
        Process?    Process?    Process?      Always Process
           ↓           ↓           ↓              ↓
        Yes/No       Yes/No       Yes/No         Yes
           ↓           ↓           ↓              ↓
        Return      Return      Return         Return
```

Each handler in the chain:
1. Receives the request
2. Decides if it can handle it
3. If yes: processes and returns result
4. If no: passes to next handler using `await self.next(request)`

## Basic Example

Here's a simple example demonstrating the Chain of Responsibility pattern:

```python
import typing
import cqrs
from cqrs.requests.cor_request_handler import CORRequestHandler

class ProcessPaymentCommand(cqrs.Request):
    amount: float
    payment_method: str
    user_id: str

class PaymentResult(cqrs.Response):
    success: bool
    transaction_id: str | None = None
    message: str = ""

class PaymentProcessedEvent(cqrs.Event):
    transaction_id: str
    amount: float
    user_id: str

# First handler in chain
class CreditCardHandler(CORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    def __init__(self):
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        if request.payment_method == "credit_card":
            transaction_id = f"cc_{request.user_id}_{int(request.amount * 100)}"
            
            self._events.append(
                PaymentProcessedEvent(
                    transaction_id=transaction_id,
                    amount=request.amount,
                    user_id=request.user_id,
                )
            )
            
            return PaymentResult(
                success=True,
                transaction_id=transaction_id,
                message="Payment processed via credit card",
            )
        
        # Pass to next handler if can't handle
        return await self.next(request)

# Second handler in chain
class PayPalHandler(CORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    def __init__(self):
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        if request.payment_method == "paypal":
            transaction_id = f"pp_{request.user_id}_{int(request.amount * 100)}"
            
            self._events.append(
                PaymentProcessedEvent(
                    transaction_id=transaction_id,
                    amount=request.amount,
                    user_id=request.user_id,
                )
            )
            
            return PaymentResult(
                success=True,
                transaction_id=transaction_id,
                message="Payment processed via PayPal",
            )
        
        # Pass to next handler if can't handle
        return await self.next(request)

# Default handler (end of chain)
class DefaultPaymentHandler(CORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    @property
    def events(self) -> list[cqrs.Event]:
        return []

    async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        # Default handler always handles the request
        return PaymentResult(
            success=False,
            message=f"Unsupported payment method: {request.payment_method}",
        )
```

## Registering Chain Handlers

To register a chain of handlers, bind the request type to a list of handler classes:

```python
import cqrs
from cqrs.requests import bootstrap

def payment_mapper(mapper: cqrs.RequestMap) -> None:
    """Register the chain of payment handlers."""
    mapper.bind(
        ProcessPaymentCommand,
        [
            CreditCardHandler,      # First in chain
            PayPalHandler,          # Second in chain
            DefaultPaymentHandler,  # Last in chain (fallback)
        ],
    )

# Bootstrap mediator
mediator = bootstrap.bootstrap(
    di_container=container,
    commands_mapper=payment_mapper,
)

# Use the mediator
result = await mediator.send(
    ProcessPaymentCommand(
        amount=100.0,
        payment_method="credit_card",
        user_id="user1",
    )
)
```

The framework automatically:
1. Resolves all handlers from the DI container
2. Builds the chain using `build_chain()`
3. Links handlers in the order specified
4. Uses the first handler as the entry point

## Complete Example

Here's a complete example demonstrating payment processing with multiple handlers:

```python
import asyncio
import typing
import di
import cqrs
from cqrs.requests import bootstrap
from cqrs.requests.cor_request_handler import CORRequestHandler

# Domain models
class ProcessPaymentCommand(cqrs.Request):
    amount: float
    payment_method: str
    user_id: str

class PaymentResult(cqrs.Response):
    success: bool
    transaction_id: str | None = None
    message: str = ""

class PaymentProcessedEvent(cqrs.Event):
    transaction_id: str
    amount: float
    user_id: str

# Chain handlers
class CreditCardHandler(CORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    def __init__(self):
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        if request.payment_method == "credit_card":
            transaction_id = f"cc_{request.user_id}_{int(request.amount * 100)}"
            
            self._events.append(
                PaymentProcessedEvent(
                    transaction_id=transaction_id,
                    amount=request.amount,
                    user_id=request.user_id,
                )
            )
            
            return PaymentResult(
                success=True,
                transaction_id=transaction_id,
                message="Payment processed via credit card",
            )
        
        return await self.next(request)

class PayPalHandler(CORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    def __init__(self):
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        if request.payment_method == "paypal":
            transaction_id = f"pp_{request.user_id}_{int(request.amount * 100)}"
            
            self._events.append(
                PaymentProcessedEvent(
                    transaction_id=transaction_id,
                    amount=request.amount,
                    user_id=request.user_id,
                )
            )
            
            return PaymentResult(
                success=True,
                transaction_id=transaction_id,
                message="Payment processed via PayPal",
            )
        
        return await self.next(request)

class BankTransferHandler(CORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    def __init__(self):
        self._events: list[cqrs.Event] = []

    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        if request.payment_method == "bank_transfer":
            transaction_id = f"bt_{request.user_id}_{int(request.amount * 100)}"
            
            self._events.append(
                PaymentProcessedEvent(
                    transaction_id=transaction_id,
                    amount=request.amount,
                    user_id=request.user_id,
                )
            )
            
            return PaymentResult(
                success=True,
                transaction_id=transaction_id,
                message="Payment processed via bank transfer",
            )
        
        return await self.next(request)

class DefaultPaymentHandler(CORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    @property
    def events(self) -> list[cqrs.Event]:
        return []

    async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        return PaymentResult(
            success=False,
            message=f"Unsupported payment method: {request.payment_method}",
        )

# Mapper
def payment_mapper(mapper: cqrs.RequestMap) -> None:
    mapper.bind(
        ProcessPaymentCommand,
        [
            CreditCardHandler,
            PayPalHandler,
            BankTransferHandler,
            DefaultPaymentHandler,
        ],
    )

# Usage
async def main():
    mediator = bootstrap.bootstrap(
        di_container=di.Container(),
        commands_mapper=payment_mapper,
    )
    
    # Test different payment methods
    result1 = await mediator.send(
        ProcessPaymentCommand(
            amount=100.0,
            payment_method="credit_card",
            user_id="user1",
        )
    )
    print(f"Credit card: {result1.message}")
    
    result2 = await mediator.send(
        ProcessPaymentCommand(
            amount=50.0,
            payment_method="paypal",
            user_id="user2",
        )
    )
    print(f"PayPal: {result2.message}")
    
    result3 = await mediator.send(
        ProcessPaymentCommand(
            amount=75.0,
            payment_method="crypto",  # Unsupported
            user_id="user3",
        )
    )
    print(f"Unsupported: {result3.message}")

if __name__ == "__main__":
    asyncio.run(main())
```

## Manual Chain Building

You can also build chains manually using the `build_chain()` function:

```python
from cqrs.requests.cor_request_handler import build_chain

# Create handler instances
handler1 = CreditCardHandler()
handler2 = PayPalHandler()
handler3 = DefaultPaymentHandler()

# Build chain manually
chain = build_chain([handler1, handler2, handler3])

# Use the chain
result = await chain.handle(
    ProcessPaymentCommand(
        amount=100.0,
        payment_method="credit_card",
        user_id="user1",
    )
)
```

## Handler Methods

### `set_next(handler)`

Sets the next handler in the chain. Returns the next handler to allow chaining:

```python
handler1.set_next(handler2).set_next(handler3)
```

### `next(request)`

Passes the request to the next handler in the chain:

```python
async def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
    if can_handle(request):
        return process(request)
    
    # Pass to next handler
    return await self.next(request)
```

### `events` Property

Returns the list of events generated by the handler. Must be implemented:

```python
@property
def events(self) -> list[cqrs.Event]:
    return self._events.copy()
```

## Use Cases

Chain of Responsibility is ideal for:

- **Payment processing** — Try different payment methods in order
- **Authentication** — Try multiple authentication strategies
- **Validation** — Multiple validation rules with fallback
- **Error handling** — Try different recovery strategies
- **Feature flags** — Try different implementations based on availability
- **Rate limiting** — Multiple rate limiters with fallback

## Best Practices

1. **Order matters** — Place handlers in order of preference or priority
2. **Always have a default** — Include a default handler at the end of the chain
3. **Clear decision logic** — Make it obvious when a handler can process a request
4. **Return early** — Return immediately after processing, don't continue the chain
5. **Use `next()` correctly** — Only call `next()` when you can't handle the request
6. **Handle events** — Collect events from handlers that process requests

## Differences from Regular Handlers

| Feature | Regular Handler | COR Handler |
|---------|----------------|-------------|
| Processing | Single handler | Multiple handlers in sequence |
| Decision | Always processes | Decides whether to process |
| Fallback | Not available | Built-in via chain |
| Use Case | Simple operations | Multiple strategies |
| Registration | Single handler | List of handlers |

## Synchronous COR Handlers

For synchronous handlers, use `SyncCORRequestHandler`:

```python
from cqrs.requests.cor_request_handler import SyncCORRequestHandler

class SyncCreditCardHandler(SyncCORRequestHandler[ProcessPaymentCommand, PaymentResult]):
    @property
    def events(self) -> list[cqrs.Event]:
        return self._events

    def handle(self, request: ProcessPaymentCommand) -> PaymentResult | None:
        if request.payment_method == "credit_card":
            return PaymentResult(success=True, ...)
        
        # Pass to next handler (synchronous)
        return self.next(request)
```

## Integration with Other Patterns

Chain of Responsibility works well with:

- **Dependency Injection** — Handlers can be injected with dependencies
- **Event Handling** — Handlers can emit events when processing requests
- **Middleware** — Middleware can be applied to the entire chain
- **Regular Handlers** — COR handlers can be used alongside regular handlers

## Summary

The Chain of Responsibility pattern provides a flexible way to handle requests with multiple processing strategies. By linking handlers together, you can:

- Try multiple strategies in order
- Implement fallback mechanisms
- Separate concerns across handlers
- Easily extend functionality by adding new handlers

Use `CORRequestHandler` when you need flexible request processing with multiple strategies or fallback mechanisms.
