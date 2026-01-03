# Mermaid Diagram Generation

The `python-cqrs` package includes built-in support for generating Mermaid diagrams from various components. This feature is perfect for documentation, visualization, and understanding component structure and execution flow.

## Overview

Mermaid diagram generation is available for:

1. **Chain of Responsibility** - Generate Sequence and Class diagrams for handler chains
2. **Saga Pattern** - Generate Sequence and Class diagrams for saga execution flows

## Available Generators

### Chain of Responsibility

The `CoRMermaid` class generates diagrams for Chain of Responsibility handler chains:

- **Sequence Diagram** - Shows the execution flow through the chain, successful handling, and pass-through scenarios
- **Class Diagram** - Shows the type structure, relationships between handlers, request types, response types, and chain links

[**Learn more about Chain of Responsibility Mermaid →**](chain_of_responsibility.md)

### Saga Pattern

The `SagaMermaid` class generates diagrams for Saga instances:

- **Sequence Diagram** - Shows the execution flow, success/failure scenarios, and compensation logic
- **Class Diagram** - Shows the type structure, relationships between Saga, steps, contexts, responses, and events

[**Learn more about Saga Mermaid →**](saga.md)

## Usage in Documentation

Generated diagrams can be:

- **Copied and pasted** into [Mermaid Live Editor](https://mermaid.live/) for visualization
- **Embedded directly** in Markdown files (GitHub/GitLab support Mermaid)
- **Used in documentation tools** (Confluence, Notion, etc.)
- **Included in README files** for better understanding

## See Also

- [Chain of Responsibility Mermaid Diagrams](chain_of_responsibility.md) - Detailed guide for CoR diagrams
- [Saga Mermaid Diagrams](saga.md) - Detailed guide for Saga diagrams
- [Chain of Responsibility Overview](../chain_of_responsibility/index.md) - Learn about the Chain of Responsibility pattern
- [Saga Pattern Overview](../saga/index.md) - Learn about the Saga pattern
