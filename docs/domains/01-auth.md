# Auth Domain API

> OAuth 2.0 + PKCE 기반 소셜 인증 서비스

---

## Overview

| 항목 | 내용 |
|------|------|
| **서비스** | Auth API + Auth Worker + Auth Relay |
| **프로토콜** | HTTP REST + gRPC (Users 연동) |
| **인증 방식** | OAuth 2.0 + PKCE (S256) |
| **Provider** | Google, Kakao |
| **토큰** | JWT (Access/Refresh) |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Auth Domain                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌──────────┐     ┌─────────────┐     ┌─────────────────┐      │
│   │  Client  │────▶│  Auth API   │────▶│  OAuth Provider │      │
│   └──────────┘     └──────┬──────┘     │  (Google/Kakao) │      │
│                           │            └─────────────────┘      │
│                           │                                      │
│                    ┌──────▼──────┐                               │
│                    │   gRPC      │                               │
│                    │  (Users)    │                               │
│                    └──────┬──────┘                               │
│                           │                                      │
│   ┌───────────────────────┼───────────────────────────────┐     │
│   │                       ▼                               │     │
│   │  ┌─────────────┐   ┌─────────────┐   ┌────────────┐  │     │
│   │  │ Auth Worker │◀──│ Auth Relay  │──▶│  RabbitMQ  │  │     │
│   │  │  (TaskIQ)   │   │  (Outbox)   │   │  (Fanout)  │  │     │
│   │  └──────┬──────┘   └─────────────┘   └────────────┘  │     │
│   │         │                                             │     │
│   │         ▼                                             │     │
│   │  ┌─────────────┐                                      │     │
│   │  │ Redis       │  JWT Blacklist                       │     │
│   │  │ (Sentinel)  │  Token Cache                         │     │
│   │  └─────────────┘                                      │     │
│   └───────────────────────────────────────────────────────┘     │
│                        Async Layer                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### OAuth Flow

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/{provider}/login` | OAuth 인증 시작 (PKCE code_challenge 생성) |
| `GET` | `/auth/{provider}/callback` | OAuth 콜백 처리 |
| `POST` | `/auth/refresh` | Access Token 갱신 |
| `POST` | `/auth/logout` | 로그아웃 (토큰 무효화) |

### Token Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/auth/me` | 현재 사용자 정보 |
| `POST` | `/auth/verify` | 토큰 검증 |

---

## Key Implementation Patterns

### 1. PKCE Flow (S256)

```python
# OAuth 인증 시작 시 PKCE 파라미터 생성
code_verifier = generate_random_string(64)
code_challenge = base64url(sha256(code_verifier))

# Authorization URL에 포함
params = {
    "code_challenge": code_challenge,
    "code_challenge_method": "S256",
    ...
}
```

### 2. Auth Relay Outbox Pattern

```
Auth API                    Auth Relay                 Consumers
    │                           │                          │
    │  1. Logout Request        │                          │
    ├──────────────────────────▶│                          │
    │                           │                          │
    │  2. Redis Outbox Write    │                          │
    │      (blacklist.events)   │                          │
    │◀──────────────────────────┤                          │
    │                           │                          │
    │                           │  3. RabbitMQ Fanout      │
    │                           ├─────────────────────────▶│
    │                           │     (blacklist.events)   │
    │                           │                          │
    │                           │  4. Local Cache Update   │
    │                           │                          │
```

### 3. JWT Blacklist (Logout)

- **저장소**: Redis Sentinel (HA)
- **TTL**: Access Token 만료 시간과 동기화
- **Fanout**: RabbitMQ를 통한 모든 서비스 동기화

### 4. gRPC Integration (Users Service)

```protobuf
service UserService {
  rpc GetOrCreateUser(GetOrCreateUserRequest) returns (UserResponse);
  rpc GetUserById(GetUserByIdRequest) returns (UserResponse);
}
```

---

## Security Features

| Feature | Implementation |
|---------|----------------|
| PKCE | S256 challenge/verifier |
| Token Rotation | Refresh 시 새 토큰 쌍 발급 |
| Blacklist | Redis + Fanout 즉시 무효화 |
| Secure Cookie | HttpOnly, SameSite=Lax |

---

## Infrastructure

- **Kubernetes**: Deployment + HPA
- **Redis**: Sentinel 3-node (token cache, blacklist)
- **RabbitMQ**: Fanout Exchange (blacklist.events)
- **gRPC**: Users Service 연동

---

## Related Services

- **Users API**: 사용자 프로필 관리
- **ext-authz**: Istio 인가 (JWT 검증)
- **Auth Relay**: 비동기 이벤트 브로드캐스트
