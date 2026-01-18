# Info Domain API

> CQRS 패턴 기반 환경 뉴스 피드 서비스

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Info API + Info Worker + Frontend |
| **패턴** | CQRS (Command Query Responsibility Segregation) |
| **데이터 소스** | Naver News API, NewsData.io |
| **특징** | 실시간 환경/에너지/AI 뉴스 피드 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Info Domain (CQRS)                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                     Command Side (Write)                         │   │
│   │                                                                  │   │
│   │   ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │   │
│   │   │ Info Worker │────▶│  RabbitMQ   │────▶│   PostgreSQL    │   │   │
│   │   │ (Celery)    │     │   Queue     │     │   (Articles)    │   │   │
│   │   └──────┬──────┘     └─────────────┘     └─────────────────┘   │   │
│   │          │                                                       │   │
│   │          │  Fetch & Process                                      │   │
│   │          │                                                       │   │
│   │   ┌──────▼──────┐     ┌─────────────┐                           │   │
│   │   │ Beat Sidecar│     │ News APIs   │                           │   │
│   │   │ (Scheduler) │     │ Naver/News  │                           │   │
│   │   └─────────────┘     └─────────────┘                           │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
│   ┌─────────────────────────────────────────────────────────────────┐   │
│   │                      Query Side (Read)                           │   │
│   │                                                                  │   │
│   │   ┌──────────┐     ┌─────────────┐     ┌─────────────────┐      │   │
│   │   │ Frontend │────▶│  Info API   │────▶│     Redis       │      │   │
│   │   │  (React) │     │  (FastAPI)  │     │    (Cache)      │      │   │
│   │   └──────────┘     └──────┬──────┘     └────────┬────────┘      │   │
│   │                           │                     │                │   │
│   │                           │  Cache-Aside        │                │   │
│   │                           │  Fallback           │                │   │
│   │                           ▼                     ▼                │   │
│   │                    ┌─────────────────────────────────┐           │   │
│   │                    │         PostgreSQL              │           │   │
│   │                    │         (Articles)              │           │   │
│   │                    └─────────────────────────────────┘           │   │
│   │                                                                  │   │
│   └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## CQRS Pattern Detail

```
                    ┌─────────────────────────────────────┐
                    │           Info Domain               │
                    └─────────────────────────────────────┘
                                    │
                 ┌──────────────────┴──────────────────┐
                 │                                     │
                 ▼                                     ▼
    ┌────────────────────────┐          ┌────────────────────────┐
    │    Command Side        │          │     Query Side         │
    │    (Info Worker)       │          │     (Info API)         │
    └────────────────────────┘          └────────────────────────┘
                 │                                     │
                 │                                     │
    ┌────────────▼────────────┐        ┌──────────────▼──────────┐
    │ - 뉴스 수집 (Naver API)   │        │ - 뉴스 목록 조회         │
    │ - 뉴스 처리 (NewsData)    │        │ - 카테고리 필터링        │
    │ - 중복 제거              │        │ - 검색                  │
    │ - 카테고리 분류           │        │ - Cache-Aside 패턴      │
    └────────────┬────────────┘        └──────────────┬──────────┘
                 │                                     │
                 │                                     │
                 │         ┌─────────────┐             │
                 └────────▶│ PostgreSQL  │◀────────────┘
                           │  (Write)    │   (Read)
                           └─────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/info/articles` | 뉴스 목록 조회 |
| `GET` | `/info/articles/{id}` | 뉴스 상세 조회 |
| `GET` | `/info/articles/search` | 뉴스 검색 |
| `GET` | `/info/categories` | 카테고리 목록 |
| `GET` | `/info/trending` | 인기 뉴스 |

---

## Key Implementation Patterns

### 1. Info Worker (Command Side)

```python
# Beat Sidecar 스케줄 설정
CELERY_BEAT_SCHEDULE = {
    "fetch-naver-news": {
        "task": "info_worker.tasks.fetch_naver_news",
        "schedule": crontab(minute="*/30"),  # 30분마다
        "args": (["환경", "재활용", "에너지", "AI"],),
    },
    "fetch-newsdata-news": {
        "task": "info_worker.tasks.fetch_newsdata",
        "schedule": crontab(minute="*/60"),  # 1시간마다
        "args": (["environment", "recycling", "energy"],),
    },
    "cleanup-old-articles": {
        "task": "info_worker.tasks.cleanup_articles",
        "schedule": crontab(hour="3", minute="0"),  # 매일 03:00
        "args": (30,),  # 30일 이상 된 기사 삭제
    },
}
```

### 2. News Fetch Task

```python
@celery_app.task(bind=True, max_retries=3)
def fetch_naver_news(self, keywords: list[str]):
    """Naver News API에서 뉴스 수집"""
    articles = []

    for keyword in keywords:
        response = naver_client.search_news(
            query=keyword,
            display=100,
            sort="date",
        )

        for item in response["items"]:
            article = Article(
                title=clean_html(item["title"]),
                description=clean_html(item["description"]),
                link=item["originallink"],
                pub_date=parse_date(item["pubDate"]),
                source="naver",
                category=categorize(keyword),
            )

            # 중복 체크 (URL 기반)
            if not article_repo.exists_by_link(article.link):
                articles.append(article)

    # 배치 저장
    article_repo.bulk_save(articles)

    # 캐시 무효화
    redis_client.delete("info:articles:*")

    return {"saved": len(articles)}
```

### 3. Info API (Query Side) - Cache-Aside Pattern

```python
class InfoService:
    async def get_articles(
        self,
        category: str | None = None,
        page: int = 1,
        limit: int = 20,
    ) -> list[Article]:
        """뉴스 목록 조회 (Cache-Aside)"""

        # 1. 캐시 조회
        cache_key = f"info:articles:{category}:{page}:{limit}"
        cached = await self.redis.get(cache_key)

        if cached:
            return json.loads(cached)

        # 2. 캐시 미스 → DB 조회
        articles = await self.article_repo.get_articles(
            category=category,
            offset=(page - 1) * limit,
            limit=limit,
        )

        # 3. 캐시 저장 (TTL 5분)
        await self.redis.setex(
            cache_key,
            300,
            json.dumps([a.dict() for a in articles]),
        )

        return articles
```

### 4. News Categories

| Category | Keywords | Description |
|----------|----------|-------------|
| `environment` | 환경, 기후변화, 탄소중립 | 환경 일반 |
| `recycling` | 재활용, 분리배출, 폐기물 | 재활용 관련 |
| `energy` | 에너지, 신재생, 태양광 | 에너지 정책 |
| `ai` | AI, 인공지능, 환경AI | AI 기술 |
| `policy` | 환경부, 정책, 규제 | 정책/규제 |

---

## Frontend Integration

```typescript
// React 컴포넌트에서 뉴스 피드 사용
const NewsFeed: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['news', category, page],
    queryFn: () => infoApi.getArticles({ category, page }),
    staleTime: 5 * 60 * 1000, // 5분
  });

  return (
    <div className="news-feed">
      {data?.articles.map(article => (
        <NewsCard
          key={article.id}
          title={article.title}
          description={article.description}
          category={article.category}
          pubDate={article.pubDate}
          onClick={() => window.open(article.link, '_blank')}
        />
      ))}
    </div>
  );
};
```

---

## Database Schema

```sql
-- 뉴스 기사 테이블
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    link VARCHAR(1000) NOT NULL UNIQUE,
    source VARCHAR(50) NOT NULL,
    category VARCHAR(50),
    pub_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),

    -- 인덱스
    INDEX idx_articles_category (category),
    INDEX idx_articles_pub_date (pub_date DESC),
    INDEX idx_articles_source (source)
);

-- 전문 검색 인덱스
CREATE INDEX idx_articles_search
ON articles USING GIN (to_tsvector('korean', title || ' ' || description));
```

---

## Worker Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Info Worker Pod                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌─────────────────────┐   ┌─────────────────────┐         │
│   │   Celery Worker     │   │   Beat Sidecar      │         │
│   │   (Main Container)  │   │   (Scheduler)       │         │
│   │                     │   │                     │         │
│   │   - fetch_naver     │   │   - crontab         │         │
│   │   - fetch_newsdata  │   │   - schedule tasks  │         │
│   │   - cleanup         │   │                     │         │
│   │   - categorize      │   │                     │         │
│   └─────────────────────┘   └─────────────────────┘         │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Infrastructure

- **Kubernetes**: Worker Deployment + Beat Sidecar
- **PostgreSQL**: Articles 저장
- **Redis**: Query 캐시 (Cache-Aside)
- **RabbitMQ**: Task queue
- **Naver API**: 한국 뉴스 소스
- **NewsData.io**: 글로벌 뉴스 소스
