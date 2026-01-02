# Saga Recovery & Eventual Consistency

Recovery ensures eventual consistency by resuming interrupted sagas from persistent storage, guaranteeing all sagas eventually reach a terminal state (COMPLETED or FAILED).

## Overview

Sagas can be interrupted due to server crashes, network timeouts, or system overload. Recovery solves this by:

1. Persisting saga state after each step
2. Periodically scanning for incomplete sagas
3. Resuming execution from the last completed step
4. Completing compensation if saga was in compensating state

## Eventual Consistency

The saga pattern ensures eventual consistency through:

- **Persistent State** — Saved after each step
- **Recovery Mechanism** — Interrupted sagas can be resumed
- **Compensation Guarantee** — Failed sagas are always compensated
- **Terminal States** — All sagas eventually reach COMPLETED or FAILED

## Recovery Process

```python
from cqrs.saga.recovery import recover_saga

# Recover interrupted saga
await recover_saga(
    saga=saga,
    saga_id=saga_id,
    context_builder=OrderContext,  # or lambda d: OrderContext(**d)
)
```

Recovery steps:
1. Load saga status and context from storage
2. Reconstruct context object from persisted data
3. Resume execution from last completed step or complete compensation

## Recovery Scenarios

### Interrupted Forward Execution

**Status:** `RUNNING`  
**Recovery:** Skips completed steps, resumes from last completed step

```python
status, _ = await storage.load_saga_state(saga_id)  # RUNNING
await recover_saga(saga, saga_id, OrderContext)
# Skips completed steps, continues execution
```

### Interrupted Compensation

**Status:** `COMPENSATING`  
**Recovery:** Completes compensation in reverse order

```python
status, _ = await storage.load_saga_state(saga_id)  # COMPENSATING
try:
    await recover_saga(saga, saga_id, OrderContext)
except RuntimeError:
    pass  # Expected - compensation completed
```

### Already Completed

**Status:** `COMPLETED`  
**Recovery:** No action needed

## Strict Backward Recovery

Once a saga enters `COMPENSATING` or `FAILED` status, forward execution is **permanently disabled**. Only compensation can proceed.

This prevents "zombie states" where compensation actions conflict with new execution attempts.

## Implementing Recovery

### Background Recovery Job

```python
import asyncio
from cqrs.saga.recovery import recover_saga

async def recovery_job():
    while True:
        incomplete_sagas = await find_incomplete_sagas()
        for saga_id in incomplete_sagas:
            try:
                await recover_saga(saga, saga_id, OrderContext)
            except RuntimeError:
                pass  # Compensation completed
            except Exception as e:
                logger.error(f"Recovery failed: {e}")
        await asyncio.sleep(60)  # Scan every minute
```

### Using with Scheduler

```python
# APScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(recovery_job, 'interval', minutes=5)
scheduler.start()
```

## Best Practices

1. **Run recovery periodically** — Background job to scan for incomplete sagas
2. **Handle failures** — Log errors and send alerts
3. **Monitor metrics** — Track recovery rate, duration, and failures
4. **Use persistent storage** — Memory storage loses data on restart
