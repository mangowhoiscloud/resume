# Users Domain API

> 사용자 프로필 및 캐릭터 소유권 관리

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Users API + Users Worker |
| **프로토콜** | HTTP REST + gRPC (Auth 연동) |
| **특징** | 캐릭터 소유권, 포인트 시스템 |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                       Users Domain                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────────┐                    ┌──────────────┐          │
│   │   HTTP API   │◀──────────────────▶│   gRPC API   │          │
│   │  (External)  │                    │  (for Auth)  │          │
│   └──────┬───────┘                    └──────┬───────┘          │
│          │                                   │                   │
│          └─────────────┬─────────────────────┘                   │
│                        │                                         │
│                        ▼                                         │
│          ┌─────────────────────────────┐                        │
│          │       Users Service         │                        │
│          │                             │                        │
│          │  ┌───────────────────────┐  │                        │
│          │  │   Profile Manager     │  │                        │
│          │  └───────────────────────┘  │                        │
│          │                             │                        │
│          │  ┌───────────────────────┐  │                        │
│          │  │ Character Ownership   │  │                        │
│          │  └───────────────────────┘  │                        │
│          │                             │                        │
│          │  ┌───────────────────────┐  │                        │
│          │  │   Points System       │  │                        │
│          │  └───────────────────────┘  │                        │
│          └─────────────┬───────────────┘                        │
│                        │                                         │
│   ┌────────────────────┼────────────────────┐                   │
│   │                    ▼                    │                   │
│   │  ┌─────────────┐      ┌─────────────┐   │                   │
│   │  │ PostgreSQL  │      │   Redis     │   │                   │
│   │  │   (Users)   │      │  (Cache)    │   │                   │
│   │  └─────────────┘      └─────────────┘   │                   │
│   └─────────────────────────────────────────┘                   │
│                     Data Layer                                   │
│                                                                  │
│   ┌─────────────────────────────────────────┐                   │
│   │            Users Worker                 │                   │
│   │  ┌─────────────────────────────────┐    │                   │
│   │  │  Async Tasks (Points, Rewards)  │    │                   │
│   │  └─────────────────────────────────┘    │                   │
│   └─────────────────────────────────────────┘                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### HTTP REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/me` | 내 프로필 조회 |
| `PUT` | `/users/me` | 프로필 수정 |
| `GET` | `/users/me/characters` | 소유 캐릭터 목록 |
| `POST` | `/users/me/characters/{id}/select` | 기본 캐릭터 설정 |
| `GET` | `/users/me/points` | 포인트 조회 |
| `GET` | `/users/me/points/history` | 포인트 이력 |

### gRPC Service (for Auth)

```protobuf
service UserService {
  // Auth 서비스에서 호출 - OAuth 로그인 시 사용자 생성/조회
  rpc GetOrCreateUser(GetOrCreateUserRequest) returns (UserResponse);

  // 사용자 ID로 조회
  rpc GetUserById(GetUserByIdRequest) returns (UserResponse);

  // 사용자 존재 여부 확인
  rpc ValidateUser(ValidateUserRequest) returns (ValidateResponse);
}
```

---

## Key Implementation Patterns

### 1. Character Ownership

```python
class CharacterOwnership:
    """캐릭터 소유권 관리"""

    async def grant_character(self, user_id: str, character_id: str) -> bool:
        """캐릭터 소유권 부여"""
        ownership = UserCharacter(
            user_id=user_id,
            character_id=character_id,
            acquired_at=datetime.utcnow(),
        )
        await self.repo.save(ownership)
        return True

    async def get_owned_characters(self, user_id: str) -> list[Character]:
        """소유 캐릭터 목록 조회"""
        ownerships = await self.repo.get_by_user(user_id)
        character_ids = [o.character_id for o in ownerships]
        return await self.character_client.get_characters(character_ids)

    async def set_default_character(self, user_id: str, character_id: str) -> bool:
        """기본 캐릭터 설정"""
        # 소유권 확인
        if not await self.repo.has_ownership(user_id, character_id):
            raise OwnershipError("Character not owned")

        await self.user_repo.update(user_id, default_character_id=character_id)
        return True
```

### 2. Points System

```python
class PointsService:
    """포인트 적립/사용 관리"""

    POINT_RULES = {
        "scan_complete": 10,      # 스캔 완료
        "daily_login": 5,         # 일일 로그인
        "streak_bonus": 20,       # 연속 로그인 보너스
        "character_unlock": -100, # 캐릭터 해금 (차감)
    }

    async def add_points(
        self,
        user_id: str,
        reason: str,
        amount: int | None = None,
    ) -> PointTransaction:
        """포인트 적립"""
        points = amount or self.POINT_RULES.get(reason, 0)

        transaction = PointTransaction(
            user_id=user_id,
            amount=points,
            reason=reason,
            timestamp=datetime.utcnow(),
        )

        await self.transaction_repo.save(transaction)
        await self.user_repo.increment_points(user_id, points)

        return transaction

    async def get_balance(self, user_id: str) -> int:
        """포인트 잔액 조회"""
        user = await self.user_repo.get(user_id)
        return user.points
```

### 3. gRPC Auth Integration

```python
# Auth 서비스에서 OAuth 로그인 시 호출
class UserGrpcService(UserServiceServicer):
    async def GetOrCreateUser(
        self,
        request: GetOrCreateUserRequest,
        context: grpc.aio.ServicerContext,
    ) -> UserResponse:
        """OAuth 로그인 시 사용자 생성 또는 조회"""

        # 기존 사용자 조회
        existing = await self.user_repo.get_by_provider(
            provider=request.provider,
            provider_id=request.provider_id,
        )

        if existing:
            return UserResponse(
                id=existing.id,
                email=existing.email,
                nickname=existing.nickname,
                created=False,
            )

        # 신규 사용자 생성
        new_user = User(
            provider=request.provider,
            provider_id=request.provider_id,
            email=request.email,
            nickname=request.nickname or generate_nickname(),
            points=100,  # 초기 포인트
        )

        await self.user_repo.save(new_user)

        # 기본 캐릭터 부여
        await self.character_ownership.grant_character(
            user_id=new_user.id,
            character_id=DEFAULT_CHARACTER_ID,
        )

        return UserResponse(
            id=new_user.id,
            email=new_user.email,
            nickname=new_user.nickname,
            created=True,
        )
```

---

## Database Schema

```sql
-- 사용자 테이블
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,      -- google, kakao
    provider_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    nickname VARCHAR(100) NOT NULL,
    profile_image_url VARCHAR(500),
    default_character_id UUID,
    points INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(provider, provider_id)
);

-- 캐릭터 소유권 테이블
CREATE TABLE user_characters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    character_id UUID NOT NULL,
    acquired_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(user_id, character_id)
);

-- 포인트 거래 내역
CREATE TABLE point_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    amount INTEGER NOT NULL,
    reason VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_point_transactions_user
ON point_transactions(user_id, created_at DESC);
```

---

## Users Worker Tasks

```python
@celery_app.task
def process_daily_login_reward(user_id: str):
    """일일 로그인 보상 처리"""
    points_service.add_points(user_id, "daily_login")

@celery_app.task
def process_streak_bonus(user_id: str, streak_days: int):
    """연속 로그인 보너스"""
    if streak_days >= 7:
        points_service.add_points(user_id, "streak_bonus")

@celery_app.task
def sync_character_ownership(user_id: str):
    """캐릭터 소유권 동기화"""
    # Character 서비스와 동기화
```

---

## Infrastructure

- **Kubernetes**: Deployment + HPA
- **PostgreSQL**: Users, Ownership, Transactions
- **Redis**: Profile cache, Session
- **gRPC**: Auth service integration
- **RabbitMQ**: Users Worker tasks
