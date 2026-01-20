# Request and Response Types

## Overview

The `python-cqrs` library provides flexible support for different types of request and response implementations. All request types must implement the `IRequest` interface, and all response types must implement the `IResponse` interface. This allows you to choose the best implementation for your specific use case.

!!! tip "Interface Requirements"
    Both `IRequest` and `IResponse` interfaces require:
    
    - `to_dict()` method: Convert instance to dictionary
    - `from_dict()` classmethod: Create instance from dictionary

## Navigation

<div class="grid cards" markdown>

-   :material-check-circle: **Pydantic**

    Default implementation with validation and serialization features.

    [:octicons-arrow-right-24: Read More](pydantic.md)

-   :material-package-variant: **Dataclasses**

    Lightweight implementation using Python's standard library.

    [:octicons-arrow-right-24: Read More](dataclasses.md)

-   :material-code-tags: **Standard Classes**

    Full control with custom Python classes.

    [:octicons-arrow-right-24: Read More](standard_classes.md)

-   :material-lock: **NamedTuple**

    Immutable data structures with memory efficiency.

    [:octicons-arrow-right-24: Read More](namedtuple.md)

-   :material-tune: **Attrs**

    Advanced features beyond standard dataclasses.

    [:octicons-arrow-right-24: Read More](attrs.md)

-   :material-speedometer: **Msgspec**

    High-performance serialization for microservices.

    [:octicons-arrow-right-24: Read More](msgspec.md)

-   :material-code-braces: **TypedDict**

    Type hints with zero runtime overhead.

    [:octicons-arrow-right-24: Read More](typeddict.md)

-   :material-link-variant: **Mixed Usage**

    Combining different types for requests and responses.

    [:octicons-arrow-right-24: Read More](mixed_usage.md)

-   :material-lightbulb-on: **Best Practices**

    Recommendations for choosing and using types.

    [:octicons-arrow-right-24: Read More](best_practices.md)

</div>

## Comparison Table

| Type | Validation | Performance | Dependencies | Best For |
|------|------------|------------|--------------|----------|
| **PydanticRequest/Response** | ✅ Runtime | Medium | pydantic | Web APIs, validation needed |
| **DCRequest/DCResponse** | ❌ | Fast | None (stdlib) | Internal systems, lightweight |
| **Standard Classes** | Custom | Fast | None | Full control, custom logic |
| **NamedTuple** | ❌ | Very Fast | None (stdlib) | Immutable, memory-efficient |
| **Attrs** | ✅ (with validators) | Fast | attrs | More features than dataclasses |
| **Msgspec** | ✅ Runtime | Very Fast | msgspec | High-performance microservices |
| **TypedDict** | ❌ (static only) | Fastest | None (stdlib) | Type hints, zero overhead |

## Quick Decision Guide

### Need Validation?
- **Pydantic** — Best for web APIs with comprehensive validation
- **Msgspec** — High-performance alternative with validation
- **Attrs** — Custom validators with more flexibility

### Need Performance?
- **Msgspec** — Fastest serialization (Rust-based)
- **Dataclasses** — Fast, no dependencies
- **NamedTuple** — Very fast, immutable

### Need Lightweight?
- **Dataclasses** — Standard library, no dependencies
- **NamedTuple** — Minimal overhead
- **TypedDict** — Zero runtime overhead

### Need Flexibility?
- **Standard Classes** — Full control over implementation
- **Attrs** — Advanced features and customization
- **Pydantic** — Rich ecosystem and integrations

## Interface Contract

All request and response types must implement the following interface:

```python
from abc import ABC, abstractmethod
from typing import Self

class IRequest(ABC):
    @abstractmethod
    def to_dict(self) -> dict:
        """Convert instance to dictionary."""
        raise NotImplementedError
    
    @classmethod
    @abstractmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create instance from dictionary."""
        raise NotImplementedError

class IResponse(ABC):
    @abstractmethod
    def to_dict(self) -> dict:
        """Convert instance to dictionary."""
        raise NotImplementedError
    
    @classmethod
    @abstractmethod
    def from_dict(cls, **kwargs) -> Self:
        """Create instance from dictionary."""
        raise NotImplementedError
```

## Built-in Types

The library provides two built-in implementations that you can use directly:

1. **PydanticRequest/PydanticResponse** (aliased as `Request`/`Response`)
   - Default implementation
   - Runtime validation
   - Type coercion
   - JSON Schema support

2. **DCRequest/DCResponse**
   - Lightweight dataclass-based
   - No external dependencies
   - Fast and simple

!!! note "Prerequisites"
    Understanding of [Request Handlers](../request_handler.md) is recommended. Request and response types are used in handler definitions.

!!! tip "Related Topics"
    - [Request Handlers](../request_handler.md) — Learn how to use types in handlers
    - [Bootstrap](../bootstrap/index.md) — Setup and configuration
    - [Dependency Injection](../di.md) — DI container usage
