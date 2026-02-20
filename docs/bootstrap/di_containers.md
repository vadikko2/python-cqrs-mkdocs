# Di Containers

<div class="grid cards" markdown>

-   :material-home: **Back to Bootstrap Overview**

    Return to the Bootstrap overview page with all configuration options.

    [:octicons-arrow-left-24: Back to Overview](index.md)

-   :material-puzzle: **Dependency Injection**

    Container setup, scopes, and resolving handlers and dependencies.

    [:octicons-arrow-right-24: Read More](../di.md)

</div>

---

## Overview

The bootstrap functions support multiple DI container implementations.

| Container | Library | Default | Best For |
|-----------|---------|---------|----------|
| **di.Container** | `di` | ✅ Yes | Most applications |
| **CQRSContainer** | `dependency-injector` | ❌ No | Large, complex applications |

!!! tip "Container Choice"
    Use `di.Container` for most applications. Use `dependency-injector` only if you need advanced features like configuration management or nested containers.

### di.Container

The `di` library is the default and recommended DI container:

```python
import abc
import di
from di import dependent

class ServiceProtocol(abc.ABC):
    @abc.abstractmethod
    async def do_work(self) -> None:
        pass

class ServiceImpl(ServiceProtocol):
    async def do_work(self) -> None:
        print("Working...")

# Setup DI container
container = di.Container()
container.bind(
    di.bind_by_type(
        dependent.Dependent(ServiceImpl, scope="request"),
        ServiceProtocol,
    )
)

mediator = bootstrap.bootstrap(
    di_container=container,
    commands_mapper=commands_mapper,
)
```

### CQRSContainer (dependency-injector)

The `CQRSContainer` adapter allows using `dependency-injector` library:

```python
from dependency_injector import containers, providers
from cqrs.container import DependencyInjectorCQRSContainer

class ApplicationContainer(containers.DeclarativeContainer):
    # Define your services
    service = providers.Factory(ServiceImpl)

# Create CQRS container adapter
cqrs_container = DependencyInjectorCQRSContainer(ApplicationContainer())

mediator = bootstrap.bootstrap(
    di_container=cqrs_container,
    commands_mapper=commands_mapper,
)
```
