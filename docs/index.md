# Introducing

## Overview 🔍

Python CQRS pattern implementation with Transaction Outbox supporting.

This is a package for implementing the CQRS (Command Query Responsibility Segregation) pattern in Python applications.
It provides a set of abstractions and utilities to help separate read and write use cases, ensuring better scalability,
performance, and maintainability of the application.


## Features

This package is a fork of the [Diator](https://akhundmurad.github.io/diator/) project with several enhancements:

1. Support for Pydantic [v2.*](https://docs.pydantic.dev/2.8/)
2. `Kafka` support using [aiokafka](https://github.com/aio-libs/aiokafka)
3. Added `EventMediator` for handling `Notification` and `ECST` events coming from the bus
4. Redesigned the event and request mapping mechanism to handlers
5. Added `bootstrap` for easy setup
6. Added support for [Transaction Outbox](https://microservices.io/patterns/data/transactional-outbox.html), ensuring
   that `Notification` and `ECST` events are sent to the broker
7. FastAPI supporting
8. FastStream supporting

## Installation
