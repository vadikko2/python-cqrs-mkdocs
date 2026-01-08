# Examples

<div class="grid cards" markdown>

-   :material-home: **Back to Chain of Responsibility Overview**

    Return to the Chain of Responsibility overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview


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
