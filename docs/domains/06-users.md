# Users Domain API

> 사용자 프로필 및 캐릭터 소유권 관리

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Users API |
| **프로토콜** | HTTP REST + gRPC (Auth 연동) |
| **특징** | 프로필 CRUD, 캐릭터 소유권 관리 |

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
│          │  │   GET/PATCH/DELETE    │  │                        │
│          │  └───────────────────────┘  │                        │
│          │                             │                        │
│          │  ┌───────────────────────┐  │                        │
│          │  │ Character Ownership   │  │                        │
│          │  │   user_characters     │  │                        │
│          │  └───────────────────────┘  │                        │
│          └─────────────┬───────────────┘                        │
│                        │                                         │
│                        ▼                                         │
│          ┌─────────────────────────────┐                        │
│          │         PostgreSQL          │                        │
│          │   users + user_characters   │                        │
│          └─────────────────────────────┘                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### HTTP REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/users/me` | 내 프로필 조회 |
| `PATCH` | `/users/me` | 프로필 수정 (nickname, phone_number) |
| `DELETE` | `/users/me` | 계정 삭제 |
| `GET` | `/users/me/characters` | 소유 캐릭터 목록 |
| `GET` | `/users/me/characters/{name}` | 캐릭터 소유 여부 확인 |

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

### 1. Profile Management

```python
class UserProfileResponse(BaseModel):
    """사용자 프로필 응답 스키마."""

    display_name: str  # nickname 또는 name
    nickname: str
    phone_number: str | None
    provider: str      # google, kakao
    last_login_at: datetime | None


class UserUpdateRequest(BaseModel):
    """사용자 프로필 수정 요청."""

    nickname: str | None = Field(min_length=1, max_length=120)
    phone_number: str | None = Field(min_length=10, max_length=20)
```

### 2. Character Ownership

```python
class CharacterOwnership:
    """캐릭터 소유권 관리"""

    async def get_owned_characters(self, user_id: UUID) -> list[UserCharacterResponse]:
        """소유 캐릭터 목록 조회"""
        ownerships = await self.repo.get_by_user(user_id)
        return [
            UserCharacterResponse(
                id=o.character_id,
                code=o.character.code,
                name=o.character.name,
                type=o.character.type,
                dialog=o.character.dialog,
                acquired_at=o.acquired_at,
            )
            for o in ownerships
        ]

    async def check_ownership(
        self,
        user_id: UUID,
        character_name: str
    ) -> CharacterOwnershipResponse:
        """캐릭터 소유 여부 확인"""
        owned = await self.repo.has_ownership_by_name(user_id, character_name)
        return CharacterOwnershipResponse(
            character_name=character_name,
            owned=owned,
        )
```

### 3. Character Reward Flow (스캔 기반)

```
스캔 완료 → 분류 결과 (middle_category) → Character 도메인 EvaluateRewardCommand
    │
    ▼
캐릭터 매칭 (분류 결과 기반) → 소유권 확인 → user_characters 저장
```

**매칭 로직**: 스캔 분류 결과의 `middle_category`로 캐릭터 자동 매칭
- 예: "플라스틱" → 플라스틱 캐릭터
- 예: "종이류" → 종이 캐릭터
- **첫 로그인 시**: 기본 캐릭터 자동 부여

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
    phone_number VARCHAR(20),
    profile_image_url VARCHAR(500),
    default_character_id UUID,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,

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
```

---

## gRPC Auth Integration

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
        )

        await self.user_repo.save(new_user)

        return UserResponse(
            id=new_user.id,
            email=new_user.email,
            nickname=new_user.nickname,
            created=True,
        )
```

---

## Infrastructure

- **Kubernetes**: Deployment + HPA
- **PostgreSQL**: Users, Character Ownership
- **gRPC**: Auth service integration

---

## References

- Character Reward 로직: Character 도메인의 `EvaluateRewardCommand` 참조
