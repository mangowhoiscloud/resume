# Event Router Infrastructure

> Redis Streams 기반 이벤트 라우팅 서비스

---

## Overview

| 항목 | 내용 |
|------|------|
| **언어** | Python (asyncio) |
| **메시징** | Redis Streams |
| **패턴** | Consumer Group, State KV |
| **특징** | At-least-once delivery |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Event Router                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                    Event Producers                               │   │
│   │                                                                  │   │
│   │   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐    │   │
│   │   │   Auth   │   │   Chat   │   │   Scan   │   │   Info   │    │   │
│   │   │  Events  │   │  Events  │   │  Events  │   │  Events  │    │   │
│   │   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘    │   │
│   │        │              │              │              │          │   │
│   └────────┼──────────────┼──────────────┼──────────────┼──────────┘   │
│            │              │              │              │               │
│            └──────────────┴──────────────┴──────────────┘               │
│                                    │                                     │
│                                    ▼                                     │
│            ┌─────────────────────────────────────────────┐              │
│            │              Redis Streams                   │              │
│            │                                              │              │
│            │   ┌────────────────────────────────────┐    │              │
│            │   │  events:{domain}                   │    │              │
│            │   │  - auth:login                      │    │              │
│            │   │  - chat:message                    │    │              │
│            │   │  - scan:complete                   │    │              │
│            │   └────────────────────────────────────┘    │              │
│            │                                              │              │
│            └───────────────────┬─────────────────────────┘              │
│                                │                                         │
│                                ▼                                         │
│            ┌─────────────────────────────────────────────┐              │
│            │            Event Router                      │              │
│            │                                              │              │
│            │   ┌────────────────────────────────────┐    │              │
│            │   │     Consumer Group                  │    │              │
│            │   │     (event-router-group)           │    │              │
│            │   └────────────────────────────────────┘    │              │
│            │                                              │              │
│            │   ┌────────────────────────────────────┐    │              │
│            │   │     Event Handlers                  │    │              │
│            │   │     - AuthEventHandler              │    │              │
│            │   │     - ChatEventHandler              │    │              │
│            │   │     - ScanEventHandler              │    │              │
│            │   └────────────────────────────────────┘    │              │
│            │                                              │              │
│            │   ┌────────────────────────────────────┐    │              │
│            │   │     State KV Store                  │    │              │
│            │   │     (Redis Hash)                    │    │              │
│            │   └────────────────────────────────────┘    │              │
│            │                                              │              │
│            └─────────────────────────────────────────────┘              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Event Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                        Event Flow                                 │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   1. Producer                                                     │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  XADD events:auth * type login user_id 123              │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│   2. Consumer Group Read                                          │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  XREADGROUP GROUP event-router-group consumer-1         │    │
│   │  COUNT 10 BLOCK 5000 STREAMS events:* >                 │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│   3. Process & State Update                                       │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  handler.process(event)                                  │    │
│   │  HSET state:user:123 last_login 2024-01-15T10:00:00     │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│   4. Acknowledge                                                  │
│   ┌─────────────────────────────────────────────────────────┐    │
│   │  XACK events:auth event-router-group 1705312800000-0    │    │
│   └─────────────────────────────────────────────────────────┘    │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Key Implementation

### 1. Event Router Core

```python
class EventRouter:
    """Redis Streams 기반 이벤트 라우터"""

    def __init__(
        self,
        redis: Redis,
        group_name: str = "event-router-group",
        consumer_name: str | None = None,
    ):
        self.redis = redis
        self.group_name = group_name
        self.consumer_name = consumer_name or f"consumer-{uuid.uuid4().hex[:8]}"
        self.handlers: dict[str, EventHandler] = {}

    def register_handler(self, event_type: str, handler: EventHandler):
        """이벤트 핸들러 등록"""
        self.handlers[event_type] = handler

    async def start(self, streams: list[str]):
        """이벤트 소비 시작"""
        # Consumer Group 생성 (없으면)
        for stream in streams:
            try:
                await self.redis.xgroup_create(
                    stream,
                    self.group_name,
                    id="0",
                    mkstream=True,
                )
            except ResponseError as e:
                if "BUSYGROUP" not in str(e):
                    raise

        # 이벤트 소비 루프
        while True:
            try:
                events = await self.redis.xreadgroup(
                    groupname=self.group_name,
                    consumername=self.consumer_name,
                    streams={s: ">" for s in streams},
                    count=10,
                    block=5000,
                )

                for stream, messages in events:
                    for msg_id, data in messages:
                        await self._process_event(stream, msg_id, data)

            except Exception as e:
                logger.error(f"Event processing error: {e}")
                await asyncio.sleep(1)

    async def _process_event(
        self,
        stream: str,
        msg_id: str,
        data: dict,
    ):
        """이벤트 처리"""
        event_type = data.get("type")
        handler = self.handlers.get(event_type)

        if handler:
            try:
                await handler.handle(Event(
                    id=msg_id,
                    stream=stream,
                    type=event_type,
                    data=data,
                ))

                # ACK
                await self.redis.xack(stream, self.group_name, msg_id)

            except Exception as e:
                logger.error(f"Handler error: {e}", extra={
                    "stream": stream,
                    "msg_id": msg_id,
                    "event_type": event_type,
                })
                # ACK하지 않음 → 재처리 대상
        else:
            logger.warning(f"No handler for event type: {event_type}")
            await self.redis.xack(stream, self.group_name, msg_id)
```

### 2. Event Handlers

```python
class AuthEventHandler(EventHandler):
    """인증 이벤트 핸들러"""

    async def handle(self, event: Event):
        if event.type == "login":
            await self._handle_login(event)
        elif event.type == "logout":
            await self._handle_logout(event)

    async def _handle_login(self, event: Event):
        user_id = event.data["user_id"]

        # State KV 업데이트
        await self.redis.hset(
            f"state:user:{user_id}",
            mapping={
                "last_login": datetime.utcnow().isoformat(),
                "login_count": await self._increment_login_count(user_id),
            },
        )

        # 연속 로그인 체크
        streak = await self._check_login_streak(user_id)
        if streak >= 7:
            await self._publish_streak_event(user_id, streak)

    async def _handle_logout(self, event: Event):
        user_id = event.data["user_id"]

        await self.redis.hset(
            f"state:user:{user_id}",
            "last_logout",
            datetime.utcnow().isoformat(),
        )


class ChatEventHandler(EventHandler):
    """채팅 이벤트 핸들러"""

    async def handle(self, event: Event):
        if event.type == "message_complete":
            await self._update_stats(event)
        elif event.type == "feedback":
            await self._process_feedback(event)

    async def _update_stats(self, event: Event):
        user_id = event.data["user_id"]
        job_id = event.data["job_id"]

        # 사용 통계 업데이트
        await self.redis.hincrby(f"stats:user:{user_id}", "message_count", 1)
        await self.redis.hincrby(f"stats:daily:{date.today()}", "total_messages", 1)
```

### 3. State KV Store

```python
class StateKVStore:
    """Redis Hash 기반 상태 저장소"""

    def __init__(self, redis: Redis, prefix: str = "state"):
        self.redis = redis
        self.prefix = prefix

    async def get(self, entity_type: str, entity_id: str) -> dict | None:
        """상태 조회"""
        key = f"{self.prefix}:{entity_type}:{entity_id}"
        data = await self.redis.hgetall(key)
        return data if data else None

    async def set(
        self,
        entity_type: str,
        entity_id: str,
        data: dict,
        ttl: int | None = None,
    ):
        """상태 저장"""
        key = f"{self.prefix}:{entity_type}:{entity_id}"
        await self.redis.hset(key, mapping=data)
        if ttl:
            await self.redis.expire(key, ttl)

    async def increment(
        self,
        entity_type: str,
        entity_id: str,
        field: str,
        amount: int = 1,
    ) -> int:
        """카운터 증가"""
        key = f"{self.prefix}:{entity_type}:{entity_id}"
        return await self.redis.hincrby(key, field, amount)
```

---

## Event Types

| Domain | Event Type | Description |
|--------|------------|-------------|
| `auth` | `login` | 사용자 로그인 |
| `auth` | `logout` | 사용자 로그아웃 |
| `chat` | `message_sent` | 메시지 전송 |
| `chat` | `message_complete` | 응답 완료 |
| `chat` | `feedback` | 피드백 제출 |
| `scan` | `scan_start` | 스캔 시작 |
| `scan` | `scan_complete` | 스캔 완료 |
| `info` | `article_fetched` | 뉴스 수집 |

---

## Consumer Group Management

```python
# Pending 메시지 재처리 (crash recovery)
async def claim_pending_messages(
    redis: Redis,
    stream: str,
    group: str,
    consumer: str,
    min_idle_time: int = 60000,  # 1분
):
    """장시간 처리되지 않은 메시지 claim"""
    pending = await redis.xpending_range(
        stream,
        group,
        min="-",
        max="+",
        count=100,
    )

    for entry in pending:
        if entry["time_since_delivered"] > min_idle_time:
            await redis.xclaim(
                stream,
                group,
                consumer,
                min_idle_time,
                [entry["message_id"]],
            )
            logger.info(f"Claimed pending message: {entry['message_id']}")
```

---

## Monitoring

```yaml
# Prometheus Metrics
event_router_events_processed_total{stream, event_type}
event_router_events_failed_total{stream, event_type}
event_router_processing_duration_seconds{stream, event_type}
event_router_pending_messages{stream, group}
event_router_consumer_lag{stream, group, consumer}
```

---

## Infrastructure

- **Kubernetes**: Deployment (stateless)
- **Redis Sentinel**: Streams + Hash (State KV)
- **Prometheus**: Consumer lag monitoring
- **Grafana**: Event flow visualization

---

## Scaling

```
┌─────────────────────────────────────────────────────────────┐
│                  Horizontal Scaling                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Consumer Group: event-router-group                         │
│                                                              │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐       │
│   │ consumer-1  │   │ consumer-2  │   │ consumer-3  │       │
│   │   (Pod A)   │   │   (Pod B)   │   │   (Pod C)   │       │
│   └──────┬──────┘   └──────┬──────┘   └──────┬──────┘       │
│          │                 │                 │               │
│          └─────────────────┼─────────────────┘               │
│                            │                                 │
│                            ▼                                 │
│          ┌─────────────────────────────────┐                │
│          │        Redis Streams            │                │
│          │  (partitioned by consumer)      │                │
│          └─────────────────────────────────┘                │
│                                                              │
│   - Consumer Group이 자동으로 메시지 분배                      │
│   - 각 메시지는 하나의 consumer만 처리                        │
│   - Pod 증가 시 자동 로드밸런싱                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## References

- [Redis Streams Consumer Groups](https://redis.io/docs/data-types/streams/)
- [Event-Driven Architecture Patterns](https://rooftopsnow.tistory.com/category/이코에코(Eco²)/Applied)
