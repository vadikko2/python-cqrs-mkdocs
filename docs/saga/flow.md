# Saga Flow Diagrams

Visual representations of saga execution, compensation, and recovery flows.

## Execution Flow

### Successful Saga Execution

```mermaid
sequenceDiagram
    participant Client
    participant Transaction as SagaTransaction
    participant Storage as SagaStorage
    participant Steps as Steps

    Client->>Transaction: Execute saga(context, saga_id)
    Transaction->>Storage: create_saga() + update_status(RUNNING)
    
    loop For each step
        Transaction->>Steps: act(context)
        Steps-->>Transaction: Success
        Transaction->>Storage: log_step(COMPLETED) + update_context()
    end
    
    Transaction->>Storage: update_status(COMPLETED)
    Transaction-->>Client: Success
```

### Failed Saga with Compensation

```mermaid
sequenceDiagram
    participant Client
    participant Transaction as SagaTransaction
    participant Storage as SagaStorage
    participant Step1 as Step 1
    participant Step2 as Step 2
    participant Step3 as Step 3

    Client->>Transaction: Execute saga(context, saga_id)
    Transaction->>Storage: create_saga() + update_status(RUNNING)
    
    Transaction->>Step1: act(context)
    Step1-->>Transaction: Success
    Transaction->>Storage: log_step(Step1.act, COMPLETED)
    
    Transaction->>Step2: act(context)
    Step2-->>Transaction: Success
    Transaction->>Storage: log_step(Step2.act, COMPLETED)
    
    Transaction->>Step3: act(context)
    Step3-->>Transaction: Exception
    Transaction->>Storage: log_step(Step3.act, FAILED) + update_status(COMPENSATING)
    
    Note over Transaction,Step2: Compensation in reverse order
    
    Transaction->>Step2: compensate(context)
    Step2-->>Transaction: Done
    Transaction->>Storage: log_step(Step2.compensate, COMPLETED)
    
    Transaction->>Step1: compensate(context)
    Step1-->>Transaction: Done
    Transaction->>Storage: log_step(Step1.compensate, COMPLETED)
    
    Transaction->>Storage: update_status(FAILED)
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
