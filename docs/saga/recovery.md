# Saga Recovery & Eventual Consistency

<div class="grid cards" markdown>

-   :material-home: **Back to Saga Overview**

    Return to the Saga Pattern overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

Recovery ensures eventual consistency by resuming interrupted sagas from persistent storage, guaranteeing all sagas eventually reach a terminal state (COMPLETED or FAILED). Recovery **attempts** are tracked per saga so you can limit retries and exclude persistently failing sagas.

## Overview

Sagas can be interrupted due to server crashes, network timeouts, or system overload. Recovery solves this by:

1. Persisting saga state after each step
2. Periodically scanning for incomplete sagas (via `get_sagas_for_recovery`)
3. Resuming execution from the last completed step
4. Completing compensation if saga was in compensating state
5. Tracking **recovery attempts** — on recovery failure, the storage increments `recovery_attempts` automatically so sagas can be retried or excluded when the limit is reached

## Eventual Consistency

The saga pattern ensures eventual consistency through:

- **Persistent State** — Saved after each step
- **Recovery Mechanism** — Interrupted sagas can be resumed
- **Recovery Attempts** — Each saga has a `recovery_attempts` counter; it is incremented automatically when recovery fails, so you can limit retries and exclude sagas that exceed `max_recovery_attempts`
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

### Concurrency Safety (Row Locking)

In a distributed environment with multiple replicas, multiple recovery workers might attempt to recover the same incomplete saga simultaneously.

To prevent race conditions, `recover_saga` uses **Row Locking**:

1.  It calls `storage.load_saga_state(saga_id, read_for_update=True)`.
2.  For SQL databases, this executes `SELECT ... FOR UPDATE`.
3.  This acquires a database-level lock on the saga row.
4.  If another worker tries to recover the same saga, it will block until the first worker completes or releases the lock.

This ensures that **only one worker** can actively recover and execute a specific saga at any given time.

## Recovery Scenarios

### Interrupted Forward Execution

**Status:** `RUNNING`  
**Recovery:** Skips completed steps, resumes from last completed step

```python
status, _, _ = await storage.load_saga_state(saga_id)  # RUNNING
await recover_saga(saga, saga_id, OrderContext)
# Skips completed steps, continues execution
```

### Interrupted Compensation

**Status:** `COMPENSATING`  
**Recovery:** Completes compensation in reverse order

```python
status, _, _ = await storage.load_saga_state(saga_id)  # COMPENSATING
try:
    await recover_saga(saga, saga_id, OrderContext)
except RuntimeError:
    pass  # Expected - compensation completed
```

### Already Completed

**Status:** `COMPLETED`  
**Recovery:** No action needed

## Recovery Attempts

Each saga in storage has a **recovery_attempts** counter. It is used to:

- **Limit retries** — Sagas that fail recovery repeatedly can be excluded from future recovery runs
- **Avoid infinite loops** — Persistently failing sagas (e.g. due to bad data) stop being picked after `max_recovery_attempts`

**Automatic increment:** When `recover_saga()` fails (exception during resume), the storage's `increment_recovery_attempts(saga_id, new_status=SagaStatus.FAILED)` is called automatically. Callers do **not** need to call `increment_recovery_attempts` themselves.

**Explicit set:** Use `storage.set_recovery_attempts(saga_id, attempts)` to set the counter to a specific value: e.g. `0` after successfully recovering one of the steps, or the maximum value so the saga is excluded from further recovery without changing its status.

**Getting sagas for recovery:** Use `storage.get_sagas_for_recovery()` instead of a custom query:

```python
# All saga types (default)
ids = await storage.get_sagas_for_recovery(
    limit=50,
    max_recovery_attempts=5,   # Only sagas with recovery_attempts < 5
    stale_after_seconds=120,   # Only sagas not updated in last 2 minutes (avoids picking active sagas)
)

# Only sagas of a specific type (e.g. one recovery job per saga name)
ids = await storage.get_sagas_for_recovery(
    limit=50,
    max_recovery_attempts=5,
    saga_name="OrderSaga",
)
```

| Parameter | Description |
|-----------|-------------|
| `limit` | Maximum number of saga IDs to return |
| `max_recovery_attempts` | Only include sagas with `recovery_attempts` strictly less than this value (default: 5) |
| `stale_after_seconds` | If set, only include sagas whose `updated_at` is older than (now − this value). Use to avoid picking sagas currently being executed. `None` = no filter |
| `saga_name` | If set, only include sagas with this name (e.g. handler/type name). `None` (default) = return all saga types |

Returns saga IDs in status RUNNING or COMPENSATING, ordered by `updated_at` ascending (oldest first).

## Strict Backward Recovery

Once a saga enters `COMPENSATING` or `FAILED` status, forward execution is **permanently disabled**. Only compensation can proceed.

This prevents "zombie states" where compensation actions conflict with new execution attempts.

## Implementing Recovery

### Background Recovery Job

Use `storage.get_sagas_for_recovery()` to get saga IDs that need recovery. On recovery failure, `recover_saga()` calls `increment_recovery_attempts` internally — no extra code needed. You can pass `saga_name` to run separate recovery jobs per saga type.

```python
import asyncio
from cqrs.saga.recovery import recover_saga

async def recovery_job(storage, saga, context_builder, container, saga_name=None):
    while True:
        ids = await storage.get_sagas_for_recovery(
            limit=50,
            max_recovery_attempts=5,
            stale_after_seconds=120,  # Avoid sagas currently being executed
            saga_name=saga_name,     # None = all types; or e.g. "OrderSaga" for one type
        )
        for saga_id in ids:
            try:
                await recover_saga(
                    saga=saga,
                    saga_id=saga_id,
                    context_builder=context_builder,
                    container=container,
                    storage=storage,
                )
            except RuntimeError:
                pass  # Expected when compensation completed (forward execution not allowed)
            except Exception as e:
                logger.error(f"Recovery failed for {saga_id}: {e}")
                # recovery_attempts already incremented by recover_saga
        await asyncio.sleep(60)  # Scan every minute
```

### Using with Scheduler

```python
# APScheduler
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()
scheduler.add_job(
    lambda: recovery_job(storage, OrderSaga(), OrderContext, container),
    'interval',
    minutes=5,
)
scheduler.start()
```

## Best Practices

1. **Run recovery periodically** — Background job using `get_sagas_for_recovery()` to scan for incomplete sagas
2. **Use `max_recovery_attempts`** — Exclude sagas that fail recovery too many times (e.g. 5) to avoid infinite retries
3. **Use `stale_after_seconds`** — Avoid picking sagas that are currently being executed by another worker
4. **Use `saga_name` for per-type recovery** — When running separate recovery jobs per saga type, pass `saga_name` so each job only processes its own sagas
5. **Handle failures** — Log errors and send alerts; `increment_recovery_attempts` is called automatically by `recover_saga`
6. **Monitor metrics** — Track recovery rate, duration, failures, and sagas exceeding max attempts
7. **Use persistent storage** — Memory storage loses data on restart
