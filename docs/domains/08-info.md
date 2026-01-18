# Info Domain API

> CQRS + Cache Aside 패턴 기반 환경 뉴스 피드 서비스

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Info API + Info Worker + Frontend |
| **패턴** | CQRS + Cache Aside + Write-Through |
| **데이터 소스** | Naver News API, NewsData.io |
| **특징** | 실시간 환경/에너지/AI 뉴스 피드 |

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│                           Info Domain - CQRS + Cache Aside                            │
├──────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ╔═══════════════════════════════════════════════════════════════════════════════╗   │
│  ║                        WRITE PATH (info_worker Pod)                            ║   │
│  ╠═══════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                ║   │
│  ║  ┌─────────────┐    ┌─────────────────────────────────────────────────────┐   ║   │
│  ║  │Beat Sidecar │    │              Celery Worker (gevent -c 100)          │   ║   │
│  ║  │             │    │                                                     │   ║   │
│  ║  │ • 5min Naver│───▶│  CollectNewsCommand                                 │   ║   │
│  ║  │ • 30min News│    │    │                                                │   ║   │
│  ║  │   Data.io   │    │    ▼                                                │   ║   │
│  ║  │ • 03:00     │    │  ┌─────────────┐   ┌─────────────┐                  │   ║   │
│  ║  │   cleanup   │    │  │ Naver API   │   │NewsData.io  │  API Calls       │   ║   │
│  ║  └─────────────┘    │  │ (3x, 1.10s) │   │(3x, 0.69s)  │  (1.79s)         │   ║   │
│  ║                     │  └──────┬──────┘   └──────┬──────┘                  │   ║   │
│  ║  emptyDir:          │         └────────┬────────┘                         │   ║   │
│  ║  /tmp/celerybeat    │                  ▼                                  │   ║   │
│  ║                     │         ┌─────────────────┐                         │   ║   │
│  ║                     │         │  OG Extraction  │  httpx.Client           │   ║   │
│  ║                     │         │  95/110 = 86.4% │  (14.53s) ⚠️ bottleneck │   ║   │
│  ║                     │         └────────┬────────┘                         │   ║   │
│  ║                     │                  ▼                                  │   ║   │
│  ║                     │  ┌─────────────────────────────────────────────┐    │   ║   │
│  ║                     │  │  PostgreSQL UPSERT (0.20s)                  │    │   ║   │
│  ║                     │  │  psycopg2 + ThreadedConnectionPool          │    │   ║   │
│  ║                     │  └────────────────────┬────────────────────────┘    │   ║   │
│  ║                     │                       ▼                             │   ║   │
│  ║                     │  ┌─────────────────────────────────────────────┐    │   ║   │
│  ║                     │  │  Redis Write-Through (0.04s)                │    │   ║   │
│  ║                     │  │  TTL: lists 3600s / articles 86400s         │    │   ║   │
│  ║                     │  └─────────────────────────────────────────────┘    │   ║   │
│  ║                     └─────────────────────────────────────────────────────┘   ║   │
│  ║                                                                                ║   │
│  ║  Total: 110 articles fetched → 110 cached → 16.95s/task                       ║   │
│  ╚═══════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                       │
│  ╔═══════════════════════════════════════════════════════════════════════════════╗   │
│  ║                        READ PATH (info API - Cache Aside)                      ║   │
│  ╠═══════════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                                ║   │
│  ║  ┌──────────┐     ┌─────────────┐     ┌─────────────┐                         ║   │
│  ║  │  Client  │────▶│  Info API   │────▶│    Redis    │──── HIT ────▶ Response  ║   │
│  ║  │ (React)  │     │  (FastAPI)  │     │  (Primary)  │     source: "redis"     ║   │
│  ║  └──────────┘     │             │     └──────┬──────┘                         ║   │
│  ║                   │  asyncpg    │            │ MISS                           ║   │
│  ║                   │  redis.aio  │            ▼                                ║   │
│  ║                   └─────────────┘     ┌─────────────┐                         ║   │
│  ║                                       │ PostgreSQL  │──── Fallback ──▶ Resp   ║   │
│  ║                                       │ (Emergency) │     source: "postgres"  ║   │
│  ║                                       └─────────────┘                         ║   │
│  ║                                                                                ║   │
│  ║  Zero-downtime: Redis 장애 시에도 PostgreSQL Fallback으로 서비스 유지           ║   │
│  ╚═══════════════════════════════════════════════════════════════════════════════╝   │
│                                                                                       │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Metrics (Production)

| Metric | Value | Description |
|--------|-------|-------------|
| **Articles/Task** | 110 | 한 번의 수집 태스크당 기사 수 |
| **OG Success Rate** | 86.4% | OpenGraph 이미지 추출 성공률 |
| **Task Duration** | 16.95s | 전체 태스크 소요 시간 |
| **gevent Pool** | 100 | 동시성 워커 수 |
| **OG Bottleneck** | 14.53s | 이미지 추출 소요 시간 (85%) |

### Task Duration Breakdown

```
Total: 16.95s
├── Naver API calls (3x): 1.10s (6.5%)
├── NewsData API calls (3x): 0.69s (4.1%)
├── OG image extraction (95/110): 14.53s (85.7%) ⚠️ bottleneck
├── PostgreSQL UPSERT: 0.20s (1.2%)
└── Redis warming: 0.04s (0.2%)
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/v1/info/news` | 뉴스 목록 조회 |
| `GET` | `/api/v1/info/news?category=energy` | 카테고리별 필터링 |
| `GET` | `/api/v1/info/news/categories` | 카테고리 목록 |

---

## Tech Stack Decisions

### Worker (Sync - gevent compatible)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Database** | psycopg2 | gevent greenlet 변환 안정성 |
| **Cache** | redis-py (sync) | 단순 연산, 비동기 불필요 |
| **HTTP Client** | httpx.Client | OG 추출용 connection pooling |
| **Concurrency** | gevent -c 100 | 고동시성 I/O bound 작업 |

### API (Async - FastAPI native)

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Database** | asyncpg | FastAPI async 모델 일치 |
| **Cache** | redis.asyncio | 비동기 네이티브 연산 |
| **Metadata** | source field | "redis" / "postgres" 응답 추적 |

---

## CQRS Pattern Detail

### Write Path (Command Side)

```python
# Beat Sidecar 스케줄 설정
CELERY_BEAT_SCHEDULE = {
    "fetch-naver-news": {
        "task": "info_worker.tasks.collect_news",
        "schedule": crontab(minute="*/5"),  # 5분마다
        "args": ("naver",),
    },
    "fetch-newsdata-news": {
        "task": "info_worker.tasks.collect_news",
        "schedule": crontab(minute="*/30"),  # 30분마다
        "args": ("newsdata",),
    },
    "cleanup-old-articles": {
        "task": "info_worker.tasks.cleanup_articles",
        "schedule": crontab(hour="3", minute="0"),  # 매일 03:00
        "args": (30,),  # 30일 이상 된 기사 삭제
    },
}
```

### Read Path (Query Side - Cache Aside)

```python
class InfoService:
    async def get_articles(
        self,
        category: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> tuple[list[Article], str]:
        """뉴스 목록 조회 (Cache Aside + Fallback)"""

        cache_key = f"info:articles:{category}:{page}:{limit}"

        # 1. Redis 조회 (Primary)
        cached = await self.redis.get(cache_key)
        if cached:
            return json.loads(cached), "redis"

        # 2. PostgreSQL Fallback (Emergency)
        articles = await self.article_repo.get_articles(
            category=category,
            offset=(page - 1) * limit,
            limit=limit,
        )

        # 3. 캐시 워밍 (다음 요청을 위해)
        await self.redis.setex(
            cache_key,
            3600,  # TTL 1시간
            json.dumps([a.dict() for a in articles]),
        )

        return articles, "postgres"
```

---

## RabbitMQ Queue Configuration

```yaml
# Topology CR로 큐 생성 (Worker는 소비만)
Queue: info.collect_news
  Type: classic
  TTL: 10min
  DLX: dlx → dlq.info.collect_news
```

**핵심 원칙**: 인프라 레벨에서 큐 정책 관리, 코드 재배포 없이 정책 변경 가능

---

## Cache Strategy

### Write-Through (Worker → Redis)

```python
# 수집 후 즉시 Redis에 캐시
async def warm_cache(articles: list[Article]):
    pipe = redis.pipeline()

    # 목록 캐시
    pipe.setex("info:articles:all", 3600, json.dumps(articles))

    # 개별 기사 캐시
    for article in articles:
        pipe.setex(f"info:article:{article.id}", 86400, article.json())

    await pipe.execute()
```

### Cache TTL Policy

| Key Pattern | TTL | Description |
|-------------|-----|-------------|
| `info:articles:*` | 3600s (1h) | 목록 캐시 |
| `info:article:{id}` | 86400s (24h) | 개별 기사 |

---

## Worker Architecture (Beat Sidecar Pattern)

```
┌───────────────────────────────────────────────────────────────┐
│                    Info Worker Pod                             │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│   ┌─────────────────────────┐   ┌─────────────────────────┐   │
│   │     Celery Worker       │   │     Beat Sidecar        │   │
│   │     (Main Container)    │   │     (Scheduler)         │   │
│   │                         │   │                         │   │
│   │   -P gevent             │   │   celery beat           │   │
│   │   -c 100                │   │   --schedule=/tmp/...   │   │
│   │                         │   │                         │   │
│   │   • collect_news        │◀──│   • 5min (naver)        │   │
│   │   • cleanup_articles    │   │   • 30min (newsdata)    │   │
│   │   • extract_og_image    │   │   • 03:00 (cleanup)     │   │
│   └─────────────────────────┘   └─────────────────────────┘   │
│              │                              │                  │
│              └──────────────────────────────┘                  │
│                         │                                      │
│                         ▼                                      │
│              ┌─────────────────────┐                          │
│              │    emptyDir         │                          │
│              │ /tmp/celerybeat-    │                          │
│              │      schedule       │                          │
│              └─────────────────────┘                          │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

**Beat Sidecar 선택 이유**: gevent와 embedded `-B` 플래그 비호환성 해결

---

## News Categories

| Category | Keywords | Description |
|----------|----------|-------------|
| `environment` | 환경, 분리배출, 재활용, 쓰레기, 폐기물, 기후변화 | 환경 일반 |
| `energy` | 에너지, 신재생, 태양광, 풍력, 전기차, 탄소중립 | 에너지 |
| `ai` | AI, 인공지능, 머신러닝, GPT, LLM, 자동화 | AI 기술 |

---

## Frontend Integration

```typescript
// React Query useInfiniteQuery + IntersectionObserver
const useNewsInfiniteQuery = (category?: string) => {
  return useInfiniteQuery({
    queryKey: ['news', category],
    queryFn: ({ pageParam = 1 }) =>
      infoApi.getArticles({ category, page: pageParam }),
    getNextPageParam: (lastPage, pages) =>
      lastPage.hasMore ? pages.length + 1 : undefined,
    staleTime: 5 * 60 * 1000, // 5분
  });
};
```

---

## Infrastructure

- **Kubernetes**: Worker Deployment + Beat Sidecar
- **PostgreSQL**: Articles 저장 (psycopg2 / asyncpg)
- **Redis Sentinel**: Cache (Write-Through + Cache Aside)
- **RabbitMQ**: Task queue (Topology CR 관리)
- **Naver API**: 한국 뉴스 소스
- **NewsData.io**: 글로벌 뉴스 소스

---

## References

- [Info 서비스 CQRS + Cache Aside 패턴](https://rooftopsnow.tistory.com/208)
