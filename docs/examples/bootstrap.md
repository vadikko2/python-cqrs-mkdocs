## **Bootstrap**

```python hl_lines="4 7"
import cqrs

def command_mapper(mapper: cqrs.RequestMap) -> None: # (2)
    mapper.bind(JoinMeetingCommand, JoinMeetingCommandHandler)

def query_mapper(mapper: cqrs.RequestMap) -> None: # (3)
    mapper.bind(ReadMeetingQuery, ReadMeetingQueryHandler)
```
