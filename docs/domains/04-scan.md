# Scan Domain API

> Vision AI 기반 폐기물 분류 서비스

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Scan API + Scan Worker |
| **파이프라인** | 4-Stage Celery Pipeline |
| **Vision** | GPT-4 Vision API |
| **분류** | Rule-Based + LLM Hybrid |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Scan Domain                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐     ┌─────────────┐     ┌─────────────────────────────┐  │
│   │  Client  │────▶│  Scan API   │────▶│        RabbitMQ             │  │
│   │ (Image)  │     │  (FastAPI)  │     │  ┌─────────────────────┐    │  │
│   └────▲─────┘     └─────────────┘     │  │ scan.jobs Exchange  │    │  │
│        │                               │  └──────────┬──────────┘    │  │
│        │                               └─────────────┼───────────────┘  │
│        │                                             │                   │
│        │                                             ▼                   │
│        │           ┌─────────────────────────────────────────────────┐  │
│        │           │           Scan Worker (Celery)                   │  │
│        │           │                                                  │  │
│        │           │   ┌──────────┐                                   │  │
│        │           │   │ Stage 1  │ ──── Vision Analysis              │  │
│        │           │   │ (Vision) │      GPT-4 Vision API             │  │
│        │           │   └────┬─────┘                                   │  │
│        │           │        │                                         │  │
│        │           │        ▼                                         │  │
│        │           │   ┌──────────┐                                   │  │
│        │           │   │ Stage 2  │ ──── Rule-Based Classification    │  │
│        │           │   │  (Rule)  │      분리배출 규칙 엔진              │  │
│        │           │   └────┬─────┘                                   │  │
│        │           │        │                                         │  │
│        │           │        ▼                                         │  │
│        │           │   ┌──────────┐                                   │  │
│        │           │   │ Stage 3  │ ──── Answer Generation            │  │
│        │           │   │ (Answer) │      LLM 응답 생성                  │  │
│        │           │   └────┬─────┘                                   │  │
│        │           │        │                                         │  │
│        │           │        ▼                                         │  │
│        │           │   ┌──────────┐                                   │  │
│        │           │   │ Stage 4  │ ──── Reward/Logging               │  │
│        │           │   │ (Reward) │      포인트 적립, 히스토리           │  │
│        │           │   └──────────┘                                   │  │
│        │           │                                                  │  │
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
| `POST` | `/scan/analyze` | 이미지 분석 요청 |
| `GET` | `/scan/results/{job_id}` | 분석 결과 조회 |
| `GET` | `/scan/history` | 스캔 이력 조회 |
| `GET` | `/scan/categories` | 분류 카테고리 목록 |

---

## 4-Stage Celery Pipeline

### Stage 1: Vision Analysis

```python
@celery_app.task(bind=True)
def vision_analysis_task(self, image_url: str) -> dict:
    """GPT-4 Vision으로 이미지 분석"""
    response = openai.chat.completions.create(
        model="gpt-4-vision-preview",
        messages=[
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": VISION_PROMPT},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ],
    )
    return {
        "detected_items": parse_vision_response(response),
        "confidence": response.confidence,
    }
```

### Stage 2: Rule-Based Classification

```python
@celery_app.task(bind=True)
def rule_classification_task(self, vision_result: dict) -> dict:
    """분리배출 규칙 엔진으로 분류"""
    items = vision_result["detected_items"]
    classifications = []

    for item in items:
        # 규칙 기반 분류
        category = rule_engine.classify(item)
        disposal_method = rule_engine.get_disposal_method(category)

        classifications.append({
            "item": item,
            "category": category,
            "disposal_method": disposal_method,
            "recyclable": category.is_recyclable,
        })

    return {"classifications": classifications}
```

### Stage 3: Answer Generation

```python
@celery_app.task(bind=True)
def answer_generation_task(self, classification_result: dict) -> dict:
    """LLM으로 사용자 친화적 응답 생성"""
    prompt = build_answer_prompt(classification_result)

    response = llm.generate(
        prompt=prompt,
        system=ANSWER_SYSTEM_PROMPT,
    )

    return {
        "answer": response.content,
        "classifications": classification_result["classifications"],
    }
```

### Stage 4: Reward & Logging

```python
@celery_app.task(bind=True)
def reward_logging_task(self, answer_result: dict, user_id: str) -> dict:
    """포인트 적립 및 히스토리 기록"""
    # 포인트 적립
    points = calculate_points(answer_result["classifications"])
    await reward_service.add_points(user_id, points)

    # 히스토리 저장
    await scan_history_repo.save(
        user_id=user_id,
        result=answer_result,
        points_earned=points,
    )

    return {
        "success": True,
        "points_earned": points,
    }
```

---

## Waste Categories

| Category | Code | Disposal Method |
|----------|------|-----------------|
| 일반쓰레기 | GENERAL | 종량제 봉투 |
| 플라스틱 | PLASTIC | 분리수거함 (투명/유색) |
| 종이류 | PAPER | 분리수거함 (종이) |
| 캔류 | CAN | 분리수거함 (캔) |
| 유리병 | GLASS | 분리수거함 (유리) |
| 비닐류 | VINYL | 분리수거함 (비닐) |
| 스티로폼 | STYROFOAM | 분리수거함 (스티로폼) |
| 음식물쓰레기 | FOOD_WASTE | 음식물 전용 봉투 |
| 대형폐기물 | BULK | 대형폐기물 신고 |
| 유해폐기물 | HAZARDOUS | 전용 수거함 |

---

## Vision Prompt Engineering

```python
VISION_PROMPT = """
이미지에서 폐기물을 식별하고 다음 정보를 제공하세요:

1. 식별된 물품 목록
2. 각 물품의 재질 (플라스틱, 종이, 금속 등)
3. 오염 여부 (음식물 잔여물, 이물질 등)
4. 분리 필요 여부 (라벨, 뚜껑 등)

JSON 형식으로 응답:
{
  "items": [
    {
      "name": "물품명",
      "material": "재질",
      "contaminated": true/false,
      "requires_separation": ["분리 필요 부품"],
      "confidence": 0.95
    }
  ]
}
"""
```

---

## Error Handling

```python
# Stage별 재시도 정책
RETRY_POLICIES = {
    "vision_analysis": {"max_retries": 3, "countdown": 5},
    "rule_classification": {"max_retries": 2, "countdown": 2},
    "answer_generation": {"max_retries": 3, "countdown": 5},
    "reward_logging": {"max_retries": 5, "countdown": 10},
}
```

---

## Infrastructure

- **Kubernetes**: Deployment + HPA
- **Celery**: 4-Stage Pipeline
- **RabbitMQ**: scan.jobs Exchange
- **Redis**: Task result cache
- **S3**: 이미지 저장
