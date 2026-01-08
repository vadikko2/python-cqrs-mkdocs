# Saga Fallback Pattern

The Fallback pattern allows you to define alternative steps that execute automatically when primary steps fail. This provides resilience and graceful degradation for distributed transactions.

## Overview

The `Fallback` wrapper enables saga steps to have backup execution paths. When a primary step fails, the fallback step executes automatically with the context restored to its state before the primary step attempted execution.

### Key Concepts

| Concept | Description |
|---------|-------------|
| **Primary Step** | The main step handler that executes first |
| **Fallback Step** | Alternative step handler that executes if primary fails |
| **Context Snapshot** | Deep copy of context state before primary step execution |
| **Context Restore** | Restoring context to snapshot state before fallback execution |
| **Circuit Breaker** | Optional protection mechanism to prevent cascading failures |

!!! tip "When to Use"
    Use Fallback pattern when:
    - You have alternative execution paths for critical operations
    - You want graceful degradation instead of immediate failure
    - You need to protect against transient failures
    - You want to reduce load on failing services with Circuit Breaker

## Basic Example

```python
import dataclasses
from cqrs.saga.fallback import Fallback
from cqrs.saga.saga import Saga
from cqrs.saga.step import SagaStepHandler, SagaStepResult
from cqrs.saga.models import SagaContext
from cqrs.response import Response

@dataclasses.dataclass
class OrderContext(SagaContext):
    order_id: str
    reservation_id: str | None = None

class ReserveInventoryResponse(Response):
    reservation_id: str

class PrimaryStep(SagaStepHandler[OrderContext, ReserveInventoryResponse]):
    async def act(self, context: OrderContext) -> SagaStepResult[OrderContext, ReserveInventoryResponse]:
        # Primary step that may fail
        reservation_id = await self._inventory_service.reserve_items(context.order_id)
        context.reservation_id = reservation_id
        return self._generate_step_result(
            ReserveInventoryResponse(reservation_id=reservation_id)
        )

class FallbackStep(SagaStepHandler[OrderContext, ReserveInventoryResponse]):
    async def act(self, context: OrderContext) -> SagaStepResult[OrderContext, ReserveInventoryResponse]:
        # Alternative step that executes when primary fails
        # Context is restored to state before primary execution
        reservation_id = f"fallback_reservation_{context.order_id}"
        context.reservation_id = reservation_id
        return self._generate_step_result(
            ReserveInventoryResponse(reservation_id=reservation_id)
        )

# Define saga with fallback
class OrderSaga(Saga[OrderContext]):
    steps = [
        Fallback(
            step=PrimaryStep,
            fallback=FallbackStep,
        ),
    ]
```

## Best Practices

1. **Use Fallback for Resilience**: Define fallback steps for critical operations that have alternative execution paths
2. **Context Isolation**: Remember that fallback receives a restored context (no side effects from failed primary)
3. **Circuit Breaker for Transient Failures**: Use Circuit Breaker when failures are likely transient and you want to reduce load on failing services
4. **Exclude Business Exceptions**: Use `exclude` parameter to prevent business logic errors from opening the circuit
5. **Idempotent Fallback Steps**: Ensure fallback steps are idempotent (safe to retry during recovery)
6. **Proper Compensation**: Define `compensate()` methods for both primary and fallback steps
7. **Failure Exception Filtering**: Use `failure_exceptions` to control which exceptions trigger fallback

<div class="grid cards" markdown>

-   :material-cogs: **Mechanics & Internals**

    Learn about execution flow, context snapshots, and compensation logic.

    [:octicons-arrow-right-24: Read More](mechanics.md)

-   :material-flash: **Circuit Breaker**

    Understand how circuit breaker integration prevents cascading failures.

    [:octicons-arrow-right-24: Read More](circuit_breaker.md)

-   :material-code-json: **Examples**

    See complete working examples of the Fallback pattern in action.

    [:octicons-arrow-right-24: Read More](examples.md)

</div>
