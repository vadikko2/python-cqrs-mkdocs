# Middlewares

<div class="grid cards" markdown>

-   :material-home: **Back to Bootstrap Overview**

    Return to the Bootstrap overview page with all configuration options.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---

## Overview

Middlewares allow you to intercept and modify request processing. The `python-cqrs` package includes a built-in `LoggingMiddleware` and allows you to create custom middlewares.

### LoggingMiddleware

The `LoggingMiddleware` is automatically added to all mediators. It logs request and response details.

```python
# LoggingMiddleware is added automatically
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    # LoggingMiddleware is added automatically
)
```

### Custom Middleware

Create custom middlewares by implementing the `Middleware` protocol:

```python
from cqrs.middlewares import base
import time

class TimingMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        start_time = time.time()
        result = await handle(request)
        elapsed = time.time() - start_time
        print(f"Request {type(request).__name__} took {elapsed:.2f}s")
        return result

class ValidationMiddleware(base.Middleware):
    async def __call__(self, request: cqrs.Request, handle):
        # Validate request
        if hasattr(request, 'validate'):
            request.validate()
        result = await handle(request)
        return result

mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    middlewares=[TimingMiddleware(), ValidationMiddleware()],
)
```

### Middleware Order

Middlewares are executed in the order they are added, with the last middleware wrapping the handler first:

| Order | Middleware | Execution |
|-------|------------|-----------|
| 1 | `TimingMiddleware` | Executes first (outermost) |
| 2 | `ValidationMiddleware` | Executes second |
| 3 | Handler | Executes last (innermost) |

```python
# Execution order: TimingMiddleware -> ValidationMiddleware -> Handler
mediator = bootstrap.bootstrap(
    di_container=di.Container(),
    commands_mapper=commands_mapper,
    middlewares=[
        TimingMiddleware(),      # Executes first (outermost)
        ValidationMiddleware(),  # Executes second
    ],
)
```

!!! note "Middleware Execution"
    Middlewares wrap handlers in reverse order. The first middleware in the list is the outermost wrapper, executing before all others.
