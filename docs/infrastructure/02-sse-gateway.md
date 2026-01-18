# SSE Gateway Infrastructure

> Redis Pub/Sub 기반 Server-Sent Events 스트리밍

---

## Overview

| 항목 | 내용 |
|------|------|
| **언어** | Python (FastAPI) |
| **프로토콜** | SSE (Server-Sent Events) |
| **메시징** | Redis Pub/Sub + Streams |
| **특징** | Token v2 Recoverable Streaming |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        SSE Gateway                                       │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐                              ┌─────────────────────────┐  │
│   │  Client  │◀───── SSE Connection ───────│     SSE Gateway         │  │
│   │ (Browser)│                              │     (FastAPI)           │  │
│   └────┬─────┘                              └───────────┬─────────────┘  │
│        │                                                │                │
│        │                                                │                │
│        │  ┌─────────────────────────────────────────────┘                │
│        │  │                                                              │
│        │  │  Subscribe                                                   │
│        │  │                                                              │
│        │  ▼                                                              │
│        │  ┌─────────────────────────────────────────────────────────┐   │
│        │  │                    Redis                                 │   │
│        │  │                                                          │   │
│        │  │  ┌─────────────┐          ┌─────────────────────────┐   │   │
│        │  │  │  Pub/Sub    │          │     Streams             │   │   │
│        │  │  │  (Realtime) │          │  (Persistence/Recovery) │   │   │
│        │  │  └──────┬──────┘          └───────────┬─────────────┘   │   │
│        │  │         │                             │                 │   │
│        │  └─────────┼─────────────────────────────┼─────────────────┘   │
│        │            │                             │                      │
│        │            └─────────────┬───────────────┘                      │
│        │                          │                                      │
│        │                          ▼                                      │
│        │           ┌─────────────────────────────┐                      │
│        │           │       Chat Worker           │                      │
│        │           │     (LangGraph Pipeline)    │                      │
│        │           └─────────────────────────────┘                      │
│        │                                                                 │
│        │  Reconnect with last_id                                        │
│        └────────────────────────▶  XRANGE catch-up                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Token v2 Recoverable Streaming

### Problem: Connection Loss

```
Client              SSE Gateway           Worker
  │                      │                  │
  │  SSE Connect         │                  │
  ├─────────────────────▶│                  │
  │                      │                  │
  │  token: "Hello"      │                  │
  │◀─────────────────────┤◀─────────────────┤
  │                      │                  │
  │  token: "World"      │                  │
  │◀─────────────────────┤◀─────────────────┤
  │                      │                  │
  │   [Connection Lost]  │                  │
  │         X            │                  │
  │                      │                  │
  │                      │  token: "!"      │
  │                      │◀─────────────────┤
  │                      │                  │
  │  ??? Lost tokens ??? │                  │
```

### Solution: Redis Streams + XRANGE

```
Client              SSE Gateway           Redis Streams
  │                      │                      │
  │  SSE Connect         │                      │
  ├─────────────────────▶│                      │
  │                      │  XREAD BLOCK         │
  │                      ├─────────────────────▶│
  │                      │                      │
  │  id:1001 "Hello"     │◀─────────────────────┤
  │◀─────────────────────┤                      │
  │                      │                      │
  │  id:1002 "World"     │◀─────────────────────┤
  │◀─────────────────────┤                      │
  │                      │                      │
  │   [Connection Lost]  │                      │
  │         X            │                      │
  │                      │  id:1003 "!"         │
  │                      │  (stored in stream)  │
  │                      │                      │
  │  Reconnect           │                      │
  │  (last_id=1002)      │                      │
  ├─────────────────────▶│                      │
  │                      │  XRANGE 1002 +       │
  │                      ├─────────────────────▶│
  │                      │                      │
  │  id:1003 "!"         │  (catch-up)          │
  │◀─────────────────────┤◀─────────────────────┤
  │                      │                      │
  │  Continue streaming  │                      │
  │◀─────────────────────┤                      │
```

---

## Key Implementation

### 1. SSE Endpoint

```python
@app.get("/sse/{job_id}")
async def sse_endpoint(
    job_id: str,
    last_event_id: str | None = Header(None, alias="Last-Event-ID"),
):
    """SSE 스트리밍 엔드포인트"""

    async def event_generator():
        # 1. 연결 복구 시 catch-up
        if last_event_id:
            missed_events = await redis.xrange(
                f"stream:{job_id}",
                min=last_event_id,
                max="+",
            )
            for event_id, data in missed_events:
                yield format_sse(event_id, data)

        # 2. 실시간 스트리밍
        pubsub = redis.pubsub()
        await pubsub.subscribe(f"channel:{job_id}")

        async for message in pubsub.listen():
            if message["type"] == "message":
                data = json.loads(message["data"])
                yield format_sse(data["id"], data)

                # 완료 체크
                if data.get("event") == "complete":
                    break

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

### 2. Worker Publishing

```python
class TokenStreamer:
    """Chat Worker에서 토큰 스트리밍"""

    async def stream_token(self, job_id: str, token: str):
        """토큰 발행 (Pub/Sub + Streams 동시)"""
        event_id = await self._generate_event_id()

        event = {
            "id": event_id,
            "event": "token",
            "data": {"token": token},
        }

        # 1. Redis Streams에 저장 (복구용)
        await self.redis.xadd(
            f"stream:{job_id}",
            {"data": json.dumps(event)},
            id=event_id,
            maxlen=1000,  # 최대 1000개 유지
        )

        # 2. Pub/Sub으로 실시간 전송
        await self.redis.publish(
            f"channel:{job_id}",
            json.dumps(event),
        )

    async def stream_complete(self, job_id: str, response: str):
        """완료 이벤트 발행"""
        event_id = await self._generate_event_id()

        event = {
            "id": event_id,
            "event": "complete",
            "data": {"response": response},
        }

        await self.redis.xadd(f"stream:{job_id}", {"data": json.dumps(event)})
        await self.redis.publish(f"channel:{job_id}", json.dumps(event))

        # Stream TTL 설정 (1시간 후 삭제)
        await self.redis.expire(f"stream:{job_id}", 3600)
```

### 3. SSE Message Format

```
id: 1705234567890-0
event: token
data: {"token": "안녕"}

id: 1705234567891-0
event: token
data: {"token": "하세요"}

id: 1705234567892-0
event: complete
data: {"response": "안녕하세요! 무엇을 도와드릴까요?"}
```

---

## Event Types

| Event | Description | Data |
|-------|-------------|------|
| `token` | LLM 토큰 스트리밍 | `{"token": "..."}` |
| `thinking` | 처리 중 상태 | `{"step": "..."}` |
| `context` | 검색 컨텍스트 | `{"sources": [...]}` |
| `complete` | 응답 완료 | `{"response": "..."}` |
| `error` | 에러 발생 | `{"error": "..."}` |

---

## Persistence Offloading

```
┌─────────────────────────────────────────────────────────────┐
│                  Persistence Strategy                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Real-time Layer (Hot)                                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Redis Pub/Sub                                       │   │
│   │  - 실시간 토큰 전송                                    │   │
│   │  - 연결된 클라이언트에만 전달                           │   │
│   │  - No persistence                                    │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Recovery Layer (Warm)                                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  Redis Streams                                       │   │
│   │  - 최근 이벤트 저장 (maxlen: 1000)                    │   │
│   │  - XRANGE로 catch-up 지원                           │   │
│   │  - TTL: 1시간                                        │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
│   Archive Layer (Cold)                                       │
│   ┌─────────────────────────────────────────────────────┐   │
│   │  PostgreSQL                                          │   │
│   │  - 완료된 대화 저장                                    │   │
│   │  - 전체 응답 텍스트                                    │   │
│   │  - 영구 저장                                          │   │
│   └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Client Integration

```typescript
// Frontend SSE Client
class SSEClient {
  private eventSource: EventSource | null = null;
  private lastEventId: string | null = null;

  connect(jobId: string, onToken: (token: string) => void) {
    const url = new URL(`/sse/${jobId}`, API_BASE);

    // 재연결 시 Last-Event-ID 포함
    if (this.lastEventId) {
      this.eventSource = new EventSource(url, {
        headers: { 'Last-Event-ID': this.lastEventId }
      });
    } else {
      this.eventSource = new EventSource(url);
    }

    this.eventSource.addEventListener('token', (e) => {
      this.lastEventId = e.lastEventId;
      const data = JSON.parse(e.data);
      onToken(data.token);
    });

    this.eventSource.addEventListener('complete', (e) => {
      this.lastEventId = e.lastEventId;
      this.eventSource?.close();
    });

    this.eventSource.onerror = () => {
      // 자동 재연결 (브라우저 기본 동작)
      // Last-Event-ID로 놓친 토큰 catch-up
    };
  }
}
```

---

## Infrastructure

- **Kubernetes**: Deployment + HPA
- **Redis Sentinel**: Pub/Sub + Streams
- **Nginx**: SSE buffering 비활성화
- **Load Balancer**: Sticky session (optional)

---

## References

- [SSE Gateway 구현](https://rooftopsnow.tistory.com/23)
- [Token v2 Recoverable Streaming](https://rooftopsnow.tistory.com/113)
