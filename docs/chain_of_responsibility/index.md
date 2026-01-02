# Chain of Responsibility

## Table of Contents

- [Overview](#overview)
- [Pattern Description](#pattern-description)
- [Basic Example](#basic-example)
- [Examples](examples.md)
- [Advanced Topics](advanced.md)

The Chain of Responsibility pattern allows multiple handlers to process a request in sequence until one successfully handles it. This pattern is particularly useful when you have multiple processing strategies or need to implement fallback mechanisms.

## Overview

`CORRequestHandler` implements the Chain of Responsibility pattern, allowing multiple handlers to process a request sequentially. Each handler decides whether to process the request or pass it to the next handler in the chain. The chain stops when a handler successfully processes the request or when all handlers have been exhausted.

### Key Benefits

- **Flexible processing** — Multiple strategies can be tried in order
- **Fallback mechanisms** — Default handlers can handle unsupported cases
- **Separation of concerns** — Each handler focuses on a specific case
- **Easy to extend** — Add new handlers without modifying existing ones

!!! note "Prerequisites"
    Understanding of [Request Handlers](../request_handler.md) and [Bootstrap](../bootstrap/index.md) is recommended.

!!! tip "When to Use"
    Use Chain of Responsibility when you have multiple processing strategies or need fallback mechanisms. For standard request handling, use regular [Request Handlers](../request_handler.md).

## Quick Navigation

- **[Examples](examples.md)** — Registering handlers and complete examples
- **[Advanced Topics](advanced.md)** — Manual chain building, handler methods, and integration

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
