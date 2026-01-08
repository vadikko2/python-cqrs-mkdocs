# Reference

<div class="grid cards" markdown>

-   :material-home: **Back to Stream Handling Overview**

    Return to the Stream Handling overview page with all topics.

    [:octicons-arrow-left-24: Back to Overview](index.md)

</div>

---


### Incremental Processing

Streaming handlers process items one at a time, yielding results as they become available. This allows clients to receive progress updates in real-time.

### Event Emission

After each yield, events are collected and can be emitted. Events are processed after each yield, allowing for parallel processing of side effects.

### Parallel Event Processing

Events can be processed concurrently with configurable concurrency limits. This improves performance when multiple event handlers need to process events independently.

### SSE Integration

Streaming handlers work seamlessly with Server-Sent Events (SSE) in FastAPI, enabling real-time progress updates in web applications.


Streaming handlers are ideal for:

- **Batch processing** — Processing large batches of items with progress updates
- **File uploads** — Processing uploaded files one by one
- **Data import** — Importing data with real-time progress
- **Long-running operations** — Operations that take time and benefit from progress updates
- **Real-time updates** — Applications that need to show progress to users


1. **Clear events after processing** — Implement `clear_events()` to prevent event accumulation
2. **Use appropriate concurrency limits** — Set `max_concurrent_event_handlers` based on your resource constraints
3. **Handle errors gracefully** — Wrap streaming logic in try-except blocks
4. **Yield meaningful results** — Include progress information in response objects
5. **Use SSE for web applications** — Stream results via SSE for better user experience


| Feature | Regular Handler | Streaming Handler |
|---------|----------------|-------------------|
| Response | Single response | Multiple responses (yielded) |
| Processing | All at once | Incremental |
| Progress Updates | Not available | Real-time |
| Event Processing | After completion | After each yield |
| Use Case | Simple operations | Batch/long-running operations |
