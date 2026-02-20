# Saga Flow Diagrams

<div class="grid cards" markdown>

-   :material-home: **Back to Saga Overview**

    Return to the Saga Pattern overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

Visual representations of saga execution, compensation, and recovery flows.

## Execution Flow

### Successful Saga Execution

When the storage supports **`create_run()`**, the saga runs inside one session and **commits only at checkpoints** (after create + RUNNING, after each step, at COMPLETED). Otherwise, each storage call may commit immediately (legacy behaviour).

```mermaid
sequenceDiagram
    participant Client
    participant Transaction as SagaTransaction
    participant Run as SagaStorageRun
    participant Steps as Steps

    Client->>Transaction: Execute saga(context, saga_id)
    Transaction->>Run: create_saga() + update_status(RUNNING)
    Note over Transaction,Run: checkpoint: commit()
    
    loop For each step
        Transaction->>Steps: act(context)
        Steps-->>Transaction: Success
        Transaction->>Run: log_step(COMPLETED) + update_context()
        Note over Transaction,Run: checkpoint: commit()
    end
    
    Transaction->>Run: update_status(COMPLETED)
    Note over Transaction,Run: checkpoint: commit()
    Transaction-->>Client: Success
```

### Failed Saga with Compensation

When using a **run** (checkpoint path), a **commit** occurs after each completed step and after each compensated step; then once at the end when status is set to FAILED.

```mermaid
sequenceDiagram
    participant Client
    participant Transaction as SagaTransaction
    participant Run as SagaStorageRun
    participant Step1 as Step 1
    participant Step2 as Step 2
    participant Step3 as Step 3

    Client->>Transaction: Execute saga(context, saga_id)
    Transaction->>Run: create_saga() + update_status(RUNNING)
    Note over Transaction,Run: checkpoint: commit()
    
    Transaction->>Step1: act(context)
    Step1-->>Transaction: Success
    Transaction->>Run: log_step(Step1.act, COMPLETED)
    Note over Transaction,Run: checkpoint: commit()
    
    Transaction->>Step2: act(context)
    Step2-->>Transaction: Success
    Transaction->>Run: log_step(Step2.act, COMPLETED)
    Note over Transaction,Run: checkpoint: commit()
    
    Transaction->>Step3: act(context)
    Step3-->>Transaction: Exception
    Transaction->>Run: log_step(Step3.act, FAILED) + update_status(COMPENSATING)
    Note over Transaction,Run: checkpoint: commit()
    
    Note over Transaction,Step2: Compensation in reverse order
    
    Transaction->>Step2: compensate(context)
    Step2-->>Transaction: Done
    Transaction->>Run: log_step(Step2.compensate, COMPLETED)
    Note over Transaction,Run: checkpoint: commit()
    
    Transaction->>Step1: compensate(context)
    Step1-->>Transaction: Done
    Transaction->>Run: log_step(Step1.compensate, COMPLETED)
    Note over Transaction,Run: checkpoint: commit()
    
    Transaction->>Run: update_status(FAILED)
    Note over Transaction,Run: checkpoint: commit()
    Transaction-->>Client: Exception raised
```

## State Transitions

### Saga Status Flow

```mermaid
stateDiagram-v2
    [*] --> PENDING: Create saga
    PENDING --> RUNNING: Start execution
    RUNNING --> COMPLETED: All steps succeed ✓
    RUNNING --> COMPENSATING: Step fails ✗
    COMPENSATING --> FAILED: Compensation done
    COMPLETED --> [*]
    FAILED --> [*]
    
    note right of COMPENSATING
        Point of No Return:
        Forward execution disabled
    end note
```

## Recovery Flow

### Recovery Process

```mermaid
sequenceDiagram
    participant Recovery as Recovery Process
    participant Storage as SagaStorage
    participant Transaction as SagaTransaction
    participant Steps as Remaining Steps

    Note over Recovery: Saga was interrupted
    Recovery->>Storage: load_saga_state(saga_id)
    Storage-->>Recovery: Status + Context + History
    
    Recovery->>Transaction: recover_saga(saga, saga_id)
    
    alt Status: RUNNING
        Note over Transaction: Resume forward execution
        Transaction->>Steps: Continue from last completed step
    else Status: COMPENSATING
        Note over Transaction: Resume compensation
        Transaction->>Steps: Continue compensation in reverse
    end
    
    Transaction->>Storage: Update status (COMPLETED/FAILED)
```

## Storage Structure

### Tables

**saga_executions:**

- `id` (UUID) - Primary key
- `status` (Enum) - PENDING, RUNNING, COMPENSATING, COMPLETED, FAILED
- `context` (JSON) - Serialized context data
- `created_at`, `updated_at` (DateTime)

**saga_logs:**

- `id` (BigInteger) - Primary key
- `saga_id` (UUID) - Foreign key
- `step_name` (String)
- `action` (String) - "act" or "compensate"
- `status` (Enum) - STARTED, COMPLETED, FAILED
- `details` (Text) - Error message if failed
- `created_at` (DateTime)
