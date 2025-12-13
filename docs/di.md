# Dependency Injection

## Table of Contents

- [Overview](#overview)
- [Supported Libraries](#supported-libraries)
- [Key Concepts](#key-concepts)
- [Integration with Bootstrap](#integration-with-bootstrap)
- [Benefits](#benefits)
- [Best Practices](#best-practices)

Dependency Injection (DI) is a design pattern that allows injecting dependencies into application components, simplifying their management and improving code testability.

## Overview

The `python-cqrs` package supports multiple DI container libraries:

- **`di`** — Lightweight, modern dependency injection library (default)
- **`dependency-injector`** — Feature-rich DI library with configuration management and FastAPI integration

Both libraries allow you to bind implementations to interfaces and automatically resolve dependencies in your handlers.

## Supported Libraries

### `di` Library

The `di` library is the default DI container for `python-cqrs`. It provides:

- **Type-based resolution** — Automatic dependency resolution by type
- **Scoped dependencies** — Support for singleton, request, and scoped lifetimes
- **Simple API** — Easy to use and configure
- **Type safety** — Full type checking support

### `dependency-injector` Library

The `dependency-injector` library offers advanced features:

- **Configuration management** — Built-in support for YAML, dict, and Pydantic settings
- **Resource management** — Automatic initialization and cleanup of resources
- **Container wiring** — Direct injection into FastAPI endpoints
- **Nested containers** — Better organization for large applications


## Key Concepts

### Binding Implementations

Dependencies are bound by type, allowing the container to automatically resolve implementations:

```python
container.bind(
    di.bind_by_type(
        Dependent(ImplementationClass, scope="request"),
        InterfaceProtocol
    )
)
```

### Dependency Scopes

The `di` library supports different scopes:

- **`"singleton"`** — One instance per container (shared across all requests)
- **`"request"`** — One instance per request (new instance for each handler)
- **`"scoped"`** — One instance per scope (custom scope management)

### Automatic Resolution

Handlers receive dependencies automatically through constructor injection:

```python
class MyHandler(RequestHandler[MyCommand, None]):
    def __init__(self, service: ServiceProtocol) -> None:
        self._service = service
```

The container automatically resolves `ServiceProtocol` and injects it into the handler.

## Integration with Bootstrap

DI containers are integrated with the bootstrap process:

```python
mediator = bootstrap.bootstrap(
    di_container=container,
    commands_mapper=commands_mapper,
    queries_mapper=queries_mapper,
    domain_events_mapper=domain_events_mapper,
)
```

The container is used to resolve all handlers and their dependencies automatically.

## Benefits

Using dependency injection with `python-cqrs` provides:

1. **Simplified dependency management** — Container handles creation and lifecycle
2. **Improved testability** — Easy to mock dependencies for unit testing
3. **Flexibility** — Swap implementations without changing core code
4. **Better separation of concerns** — Dependencies explicitly declared
5. **Configuration management** — Centralized dependency configuration

## Best Practices

1. **Use interfaces** — Always bind implementations to interfaces, not concrete classes
2. **Choose appropriate scopes** — Use singleton for stateless services, request for stateful ones
3. **Keep constructors simple** — Avoid complex logic in constructors
4. **Use factory functions** — For complex object creation, use factory functions
5. **Test with mocks** — Always test handlers with mocked dependencies
