# Images Domain API

> S3 + CloudFront 기반 이미지 관리 서비스

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Images API |
| **스토리지** | AWS S3 |
| **CDN** | CloudFront |
| **업로드** | Presigned URL |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Images Domain                                  │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐     ┌─────────────┐                                      │
│   │  Client  │────▶│ Images API  │                                      │
│   └────┬─────┘     └──────┬──────┘                                      │
│        │                  │                                              │
│        │                  │  1. Generate Presigned URL                   │
│        │                  │                                              │
│        │                  ▼                                              │
│        │           ┌─────────────┐                                      │
│        │           │   AWS S3    │                                      │
│        │           │   Bucket    │                                      │
│        │           └──────┬──────┘                                      │
│        │                  │                                              │
│        │  2. Direct Upload│                                              │
│        │     (Presigned)  │                                              │
│        ├─────────────────▶│                                              │
│        │                  │                                              │
│        │                  │  3. CDN Distribution                         │
│        │                  │                                              │
│        │                  ▼                                              │
│        │           ┌─────────────┐                                      │
│        │           │ CloudFront  │                                      │
│        │           │    CDN      │                                      │
│        │           └──────┬──────┘                                      │
│        │                  │                                              │
│        │  4. Image Access │                                              │
│        │◀─────────────────┤                                              │
│        │                  │                                              │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/images/presigned-url` | 업로드용 Presigned URL 발급 |
| `POST` | `/images/presigned-url/scan` | 스캔용 이미지 업로드 URL |
| `POST` | `/images/presigned-url/profile` | 프로필 이미지 업로드 URL |
| `DELETE` | `/images/{key}` | 이미지 삭제 |
| `GET` | `/images/{key}/metadata` | 이미지 메타데이터 조회 |

---

## Key Implementation Patterns

### 1. Presigned URL Generation

```python
class ImageService:
    def __init__(self, s3_client: S3Client, config: ImageConfig):
        self.s3 = s3_client
        self.config = config

    async def generate_presigned_url(
        self,
        purpose: ImagePurpose,
        content_type: str,
        user_id: str,
    ) -> PresignedUrlResponse:
        """업로드용 Presigned URL 생성"""

        # 파일 키 생성 (purpose별 경로 분리)
        key = self._generate_key(purpose, user_id)

        # Presigned URL 생성
        presigned_url = await self.s3.generate_presigned_url(
            ClientMethod="put_object",
            Params={
                "Bucket": self.config.bucket_name,
                "Key": key,
                "ContentType": content_type,
            },
            ExpiresIn=self.config.presigned_expiry,  # 5분
        )

        # CDN URL 생성
        cdn_url = f"{self.config.cdn_base_url}/{key}"

        return PresignedUrlResponse(
            upload_url=presigned_url,
            cdn_url=cdn_url,
            key=key,
            expires_in=self.config.presigned_expiry,
        )

    def _generate_key(self, purpose: ImagePurpose, user_id: str) -> str:
        """S3 키 생성 (purpose별 경로)"""
        timestamp = datetime.utcnow().strftime("%Y%m%d")
        unique_id = uuid.uuid4().hex[:8]

        paths = {
            ImagePurpose.SCAN: f"scans/{timestamp}/{user_id}/{unique_id}",
            ImagePurpose.PROFILE: f"profiles/{user_id}/{unique_id}",
            ImagePurpose.CHAT: f"chat/{timestamp}/{user_id}/{unique_id}",
        }

        return paths.get(purpose, f"misc/{timestamp}/{unique_id}")
```

### 2. Image Purpose Types

| Purpose | Path Pattern | TTL | Description |
|---------|--------------|-----|-------------|
| `SCAN` | `scans/{date}/{user}/{id}` | 30일 | 폐기물 스캔 이미지 |
| `PROFILE` | `profiles/{user}/{id}` | 영구 | 프로필 이미지 |
| `CHAT` | `chat/{date}/{user}/{id}` | 7일 | 채팅 첨부 이미지 |

### 3. CloudFront CDN Configuration

```python
CDN_CONFIG = {
    "distribution_id": "E1234567890ABC",
    "base_url": "https://cdn.growbin.app",
    "cache_policy": {
        "default_ttl": 86400,      # 24시간
        "max_ttl": 31536000,       # 1년
        "compress": True,
        "query_string": False,
    },
    "origin_access_identity": "origin-access-identity/cloudfront/E...",
}
```

### 4. S3 Lifecycle Rules

```python
LIFECYCLE_RULES = [
    {
        "ID": "scan-cleanup",
        "Filter": {"Prefix": "scans/"},
        "Status": "Enabled",
        "Expiration": {"Days": 30},
    },
    {
        "ID": "chat-cleanup",
        "Filter": {"Prefix": "chat/"},
        "Status": "Enabled",
        "Expiration": {"Days": 7},
    },
]
```

---

## Upload Flow

```
┌──────────┐     ┌─────────────┐     ┌─────────┐     ┌───────────┐
│  Client  │     │ Images API  │     │   S3    │     │CloudFront │
└────┬─────┘     └──────┬──────┘     └────┬────┘     └─────┬─────┘
     │                  │                 │                 │
     │ 1. Request URL   │                 │                 │
     ├─────────────────▶│                 │                 │
     │                  │                 │                 │
     │ 2. Presigned URL │                 │                 │
     │◀─────────────────┤                 │                 │
     │   + CDN URL      │                 │                 │
     │                  │                 │                 │
     │ 3. Direct Upload │                 │                 │
     ├────────────────────────────────────▶│                 │
     │   (PUT to S3)    │                 │                 │
     │                  │                 │                 │
     │ 4. Upload OK     │                 │                 │
     │◀────────────────────────────────────┤                 │
     │                  │                 │                 │
     │ 5. Access via CDN│                 │                 │
     ├─────────────────────────────────────────────────────▶│
     │                  │                 │                 │
     │ 6. Cached Image  │                 │                 │
     │◀─────────────────────────────────────────────────────┤
     │                  │                 │                 │
```

---

## Security

| Feature | Implementation |
|---------|----------------|
| Presigned URL | 5분 만료, PUT only |
| Content-Type | 허용된 MIME 타입만 |
| File Size | 최대 10MB 제한 |
| Bucket Policy | CloudFront OAI only |
| CORS | 특정 도메인만 허용 |

---

## Scan Integration

```python
# Scan API에서 이미지 업로드 후 분석 요청
async def scan_with_image(image_key: str, user_id: str):
    # 1. CDN URL 생성
    cdn_url = f"{CDN_BASE_URL}/{image_key}"

    # 2. Scan Worker에 분석 요청
    job = await scan_queue.enqueue(
        vision_analysis_task,
        image_url=cdn_url,
        user_id=user_id,
    )

    return {"job_id": job.id}
```

---

## Infrastructure

- **AWS S3**: 이미지 저장소
- **CloudFront**: CDN 배포
- **Kubernetes**: API Deployment
- **IAM**: S3/CloudFront 권한 관리
