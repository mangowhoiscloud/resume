# Chat Domain API

> LangGraph 기반 Multi-Agent 채팅 파이프라인

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Chat API + Chat Worker |
| **파이프라인** | LangGraph StateGraph (17 Nodes) |
| **라우팅** | Send API Dynamic Fanout |
| **Intent** | 9-Class Classification |
| **메시지큐** | RabbitMQ + TaskIQ |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Chat Domain                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐     ┌─────────────┐     ┌─────────────────────────────┐  │
│   │  Client  │────▶│  Chat API   │────▶│        RabbitMQ             │  │
│   │  (SSE)   │     │  (FastAPI)  │     │  ┌─────────────────────┐    │  │
│   └────▲─────┘     └─────────────┘     │  │ chat.jobs Exchange  │    │  │
│        │                               │  └──────────┬──────────┘    │  │
│        │                               └─────────────┼───────────────┘  │
│        │                                             │                   │
│        │                                             ▼                   │
│        │           ┌─────────────────────────────────────────────────┐  │
│        │           │              Chat Worker (LangGraph)             │  │
│        │           │                                                  │  │
│        │           │   ┌──────────┐   ┌──────────┐   ┌──────────┐    │  │
│        │           │   │ intent   │──▶│ dynamic  │──▶│ parallel │    │  │
│        │           │   │  _node   │   │ _router  │   │  nodes   │    │  │
│        │           │   └──────────┘   └──────────┘   └────┬─────┘    │  │
│        │           │                                      │          │  │
│        │           │   ┌──────────────────────────────────┘          │  │
│        │           │   │                                             │  │
│        │           │   ▼                                             │  │
│        │           │   ┌──────────┐   ┌──────────┐   ┌──────────┐    │  │
│        │           │   │ merge    │──▶│ response │──▶│ feedback │    │  │
│        │           │   │  _node   │   │  _node   │   │  _node   │    │  │
│        │           │   └──────────┘   └──────────┘   └────┬─────┘    │  │
│        │           │                                      │          │  │
│        │           │                                      ▼          │  │
│        │           │                               ┌──────────┐      │  │
│        │           │                               │summarize │      │  │
│        │           │                               │  _node   │      │  │
│        │           │                               └──────────┘      │  │
│        │           └─────────────────────────────────────────────────┘  │
│        │                                                                 │
│        │           ┌─────────────────────────────────────────────────┐  │
│        └───────────│            SSE Gateway (Redis Pub/Sub)          │  │
│                    └─────────────────────────────────────────────────┘  │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/chat/messages` | 메시지 전송 (Job 생성) |
| `GET` | `/chat/messages/{job_id}/stream` | SSE 스트리밍 |
| `GET` | `/chat/conversations` | 대화 목록 |
| `GET` | `/chat/conversations/{id}` | 대화 상세 |
| `DELETE` | `/chat/conversations/{id}` | 대화 삭제 |

---

## LangGraph Pipeline (17 Nodes)

### Node Structure

```
START
  │
  ▼
┌─────────────┐
│ intent_node │ ──── 9-Class Intent Classification
└──────┬──────┘
       │
       ▼
┌──────────────┐
│dynamic_router│ ──── Send API Multi-Intent Fanout
└──────┬───────┘
       │
       ├─────────────────────────────────────────────────┐
       │                                                 │
       ▼                                                 ▼
┌─────────────────────────────────────────┐    ┌─────────────────┐
│           Parallel Subagents            │    │  Enrichment     │
│  ┌─────────┐ ┌──────────┐ ┌─────────┐   │    │  ┌─────────┐    │
│  │waste_rag│ │character │ │location │   │    │  │ weather │    │
│  └─────────┘ └──────────┘ └─────────┘   │    │  └─────────┘    │
│  ┌──────────┐ ┌─────────────────┐       │    └─────────────────┘
│  │bulk_waste│ │recyclable_price │       │
│  └──────────┘ └─────────────────────────┘
│  ┌────────────────┐ ┌───────────┐
│  │collection_point│ │web_search │
│  └────────────────┘ └───────────┘
│  ┌────────────────┐ ┌─────────┐
│  │image_generation│ │ general │
│  └────────────────┘ └─────────┘
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────┐
│ merge_node  │ ──── Multi-Intent 결과 병합
└──────┬──────┘
       │
       ▼
┌──────────────┐
│ response_node│ ──── In-Context Learning 응답 생성
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ feedback_node│ ──── RAG Quality Scoring (4-Dimension)
└──────┬───────┘
       │
       ▼
┌───────────────┐
│ summarize_node│ ──── 동적 컨텍스트 압축
└───────┬───────┘
        │
        ▼
       END
```

### 9-Class Intent Classification

| Intent | Node | Description |
|--------|------|-------------|
| `waste` | waste_rag | 분리배출 방법 (RAG) |
| `character` | character | 캐릭터 대화 |
| `location` | location | 위치 기반 서비스 |
| `bulk_waste` | bulk_waste | 대형폐기물 처리 |
| `recyclable_price` | recyclable_price | 재활용품 시세 |
| `collection_point` | collection_point | 수거함 위치 |
| `web_search` | web_search | 웹 검색 |
| `image_generation` | image_generation | 이미지 생성 |
| `general` | general | 일반 대화 |

---

## Key Implementation Patterns

### 1. Send API Dynamic Fanout

```python
def dynamic_router(state: ChatState) -> list[Send]:
    sends = []
    activated_nodes = set()

    # 1. Primary Intent
    primary_node = INTENT_TO_NODE[state["intent"]]
    sends.append(Send(primary_node, state))
    activated_nodes.add(primary_node)

    # 2. Multi-Intent Fanout
    for intent in state.get("additional_intents", []):
        node = INTENT_TO_NODE.get(intent)
        if node not in activated_nodes:
            sends.append(Send(node, state))
            activated_nodes.add(node)

    # 3. Enrichment (waste → weather)
    if state["intent"] in ENRICHMENT_RULES:
        for enrichment_node in ENRICHMENT_RULES[state["intent"]]:
            if enrichment_node not in activated_nodes:
                sends.append(Send(enrichment_node, state))

    return sends  # 병렬 실행!
```

### 2. 3-Tier Memory Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    3-Tier Memory                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   L1: Redis (Sentinel)           ~1ms                        │
│   ├─ 최근 메시지 캐시                                          │
│   ├─ 세션 상태                                                │
│   └─ TTL: 24시간                                             │
│                                                              │
│   L2: PostgreSQL                 ~5ms                        │
│   ├─ 전체 대화 이력                                           │
│   ├─ 사용자 프로필                                            │
│   └─ 영구 저장                                               │
│                                                              │
│   L3: ChatState (In-Memory)      ~100μs                      │
│   ├─ 현재 턴 컨텍스트                                         │
│   ├─ LangGraph State                                        │
│   └─ 요청 스코프                                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Dynamic Context Compression (OpenCode-style)

```python
# 5-Tier Summary Structure
COMPRESSION_CONFIG = {
    "trigger_tokens": 272_000,      # GPT-5.2 context limit
    "prune_protect": 40_000,        # 보호 토큰
    "summary_tiers": [
        ("immediate", 5),            # 최근 5턴: 전체 보존
        ("recent", 20),              # 6-25턴: 상세 요약
        ("session", 100),            # 26-125턴: 간략 요약
        ("archive", 500),            # 126-625턴: 키포인트만
        ("forgotten", float("inf")), # 626+: 메타데이터만
    ],
}
```

### 4. Token v2 Recoverable Streaming

```
Client              SSE Gateway           Redis Streams
  │                      │                      │
  │  1. SSE Connect      │                      │
  ├─────────────────────▶│                      │
  │                      │  2. XREAD BLOCK      │
  │                      ├─────────────────────▶│
  │                      │                      │
  │                      │  3. New Token        │
  │                      │◀─────────────────────┤
  │  4. SSE: token       │                      │
  │◀─────────────────────┤                      │
  │                      │                      │
  │  [Connection Lost]   │                      │
  │         X            │                      │
  │                      │                      │
  │  5. Reconnect        │                      │
  │     (last_id=12345)  │                      │
  ├─────────────────────▶│                      │
  │                      │  6. XRANGE catch-up  │
  │                      ├─────────────────────▶│
  │                      │                      │
  │  7. Missed tokens    │                      │
  │◀─────────────────────┤                      │
  │                      │                      │
```

### 5. NodeExecutor Policy System

```python
class ExecutionPolicy(Enum):
    FAIL_OPEN = "fail_open"      # 실패해도 계속 진행
    FAIL_CLOSE = "fail_close"    # 실패 시 전체 중단
    FALLBACK = "fallback"        # 실패 시 대체 노드 실행

NODE_POLICIES = {
    "waste_rag": ExecutionPolicy.FALLBACK,      # RAG 실패 → web_search
    "web_search": ExecutionPolicy.FAIL_OPEN,    # 검색 실패해도 진행
    "character": ExecutionPolicy.FAIL_CLOSE,    # 캐릭터 필수
    "weather": ExecutionPolicy.FAIL_OPEN,       # enrichment 선택적
}
```

### 6. Feedback Node (RAG Quality Scoring)

```python
# 4-Dimension RAG Evaluation
EVALUATION_DIMENSIONS = {
    "faithfulness": "응답이 컨텍스트에 충실한가?",
    "groundedness": "응답이 근거에 기반하는가?",
    "context_relevance": "검색된 컨텍스트가 질문과 관련있는가?",
    "answer_relevance": "응답이 질문에 적절히 답하는가?",
}

# LLM-as-a-Judge 평가
async def evaluate_response(state: ChatState) -> dict:
    scores = await llm_judge.evaluate(
        question=state["query"],
        context=state["retrieved_context"],
        answer=state["response"],
    )
    return {"quality_scores": scores}
```

### 7. Fallback Chain

```
┌───────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  RAG      │────▶│ Web Search  │────▶│ General LLM │────▶│ Clarify │
│  (Fail)   │     │   (Fail)    │     │   (Fail)    │     │  (End)  │
└───────────┘     └─────────────┘     └─────────────┘     └─────────┘
```

---

## gRPC Subagent Integration

| Subagent | Protocol | Description |
|----------|----------|-------------|
| Character | gRPC | 캐릭터 페르소나 조회 |
| Location | gRPC | 위치 기반 서비스 |
| Weather | HTTP | 기상청 API |
| Web Search | HTTP | Tavily Search API |

---

## Checkpointing

```python
# CachedPostgresSaver 패턴
checkpointer = CachedPostgresSaver(
    redis_client=redis_sentinel,
    postgres_pool=async_pg_pool,
    cache_ttl=3600,  # 1시간
)

# LangGraph with checkpointer
graph = StateGraph(ChatState)
compiled = graph.compile(checkpointer=checkpointer)
```

---

## Infrastructure

- **Kubernetes**: Deployment + HPA (CPU/Memory based)
- **RabbitMQ**: chat.jobs Exchange (Direct)
- **Redis**: Sentinel 3-node (cache, streams, pub/sub)
- **PostgreSQL**: Conversation history, checkpoints
