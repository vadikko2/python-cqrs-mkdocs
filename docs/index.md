# Introducing

## Overview 🔍

Python CQRS pattern implementation with Transaction Outbox support.

This package facilitates the implementation of the **CQRS** (Command Query Responsibility Segregation) pattern in Python
applications. It offers a set of abstractions and utilities to separate read and write use cases, enhancing scalability,
performance, and maintainability.

## Main Features 🔨

This package is a fork of the [Diator](https://akhundmurad.github.io/diator/) project with several enhancements:

1. Support for **Pydantic** [v2.*](https://docs.pydantic.dev/2.8/)
2. **Kafka** support using [aiokafka](https://github.com/aio-libs/aiokafka)
3. Added **EventMediator** for handling **Notification** and **ECST** events from the bus
4. Redesigned event and request mapping mechanism to handlers
5. Added **bootstrap** for easy setup
6. Support for [Transaction Outbox](https://microservices.io/patterns/data/transactional-outbox.html), ensuring that *
   *Notification** and **ECST** events are sent to the broker
7. Support for [FastAPI](https://fastapi.tiangolo.com/)
8. Support for [FastStream](https://faststream.airt.ai/)

## Installation

To install the package, run the following command:

```bash
pip install python-cqrs
```

Also you can download the package from the [GitHub repository](https://github.com/vadikko2/python-cqrs).

```bash
pip install git+https://github.com/vadikko2/python-cqrs
```
