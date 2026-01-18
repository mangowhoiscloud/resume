# ext-authz Infrastructure

> Istio External Authorization with Local Cache Broadcast

---

## Overview

| 항목 | 내용 |
|------|------|
| **언어** | Go |
| **프레임워크** | Envoy ext-authz gRPC |
| **캐싱** | Local Cache Broadcast (sync.Map + RabbitMQ) |
| **연동** | Istio Service Mesh |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Istio Service Mesh                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐     ┌─────────────┐     ┌─────────────────────────────┐  │
│   │  Client  │────▶│ Istio Proxy │────▶│        ext-authz            │  │
│   │          │     │  (Envoy)    │     │    (Go gRPC Server)         │  │
│   └──────────┘     └──────┬──────┘     └─────────────┬───────────────┘  │
│                           │                          │                   │
│                           │                          │                   │
│                           │            ┌─────────────▼───────────────┐  │
│                           │            │      Local Cache            │  │
│                           │            │      (sync.Map)             │  │
│                           │            │      ~100ns lookup          │  │
│                           │            └─────────────┬───────────────┘  │
│                           │                          │                   │
│                           │                          │ Cache Miss        │
│                           │                          ▼                   │
│                           │            ┌─────────────────────────────┐  │
│                           │            │      Redis Sentinel         │  │
│                           │            │      (JWT Blacklist)        │  │
│                           │            └─────────────────────────────┘  │
│                           │                                              │
│                           ▼                                              │
│                    ┌─────────────┐                                      │
│                    │ Backend API │                                      │
│                    │  Services   │                                      │
│                    └─────────────┘                                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Performance Evolution

### Before Optimization (v1)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ext-authz v1 Flow                             │
│                                                                  │
│   Client ──▶ Envoy ──▶ ext-authz ──▶ Redis ──▶ Response         │
│                           │                                      │
│                           └── Every request hits Redis           │
│                                                                  │
│   Latency: 57-80ms (P50-P99)                                    │
│   RPS: ~500                                                      │
└─────────────────────────────────────────────────────────────────┘
```

### After Local Cache Broadcast (v2)

```
┌─────────────────────────────────────────────────────────────────┐
│                    ext-authz v2 Flow                             │
│                                                                  │
│   Client ──▶ Envoy ──▶ ext-authz ──▶ Local Cache ──▶ Response   │
│                           │              │                       │
│                           │              └── Hit: ~100ns         │
│                           │                                      │
│                           └── Miss: Redis (rare)                 │
│                                                                  │
│   Latency: 7.5-30ms (P50-P99)                                   │
│   RPS: ~14,000 (28x improvement)                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Performance Metrics

| Metric | Before (v1) | After (v2) | Improvement |
|--------|-------------|------------|-------------|
| **P50 Latency** | 57ms | 7.5ms | **87% ↓** |
| **P99 Latency** | 80ms | 30ms | **72% ↓** |
| **Max RPS** | ~500 | ~14,000 | **28x ↑** |
| **Cache Hit Rate** | N/A | >99% | - |

> 📊 Reference: [ext-authz 성능 최적화](https://rooftopsnow.tistory.com/24)

---

## Local Cache Broadcast Pattern

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Pod A      │     │  Pod B      │     │  Pod C      │
│  ┌───────┐  │     │  ┌───────┐  │     │  ┌───────┐  │
│  │sync.Map│  │     │  │sync.Map│  │     │  │sync.Map│  │
│  └───┬───┘  │     │  └───┬───┘  │     │  └───┬───┘  │
└──────┼──────┘     └──────┼──────┘     └──────┼──────┘
       │                   │                   │
       └───────────────────┼───────────────────┘
                           │
                    ┌──────▼──────┐
                    │  RabbitMQ   │
                    │   Fanout    │
                    │  Exchange   │
                    │(blacklist)  │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Auth Relay  │
                    │   Outbox    │
                    └─────────────┘

1. User logout → Auth Relay writes to Redis Outbox
2. Auth Relay publishes to RabbitMQ Fanout Exchange
3. All ext-authz Pods receive broadcast
4. Each Pod updates local sync.Map cache
5. Next request: ~100ns local lookup (no Redis!)
```

---

## Key Implementation

### 1. Local Cache (sync.Map)

```go
type LocalCache struct {
    blacklist sync.Map  // JWT ID → expiry time
    mu        sync.RWMutex
}

func (c *LocalCache) IsBlacklisted(jti string) bool {
    if expiry, ok := c.blacklist.Load(jti); ok {
        if time.Now().Before(expiry.(time.Time)) {
            return true
        }
        // Expired, remove from cache
        c.blacklist.Delete(jti)
    }
    return false
}

func (c *LocalCache) Add(jti string, expiry time.Time) {
    c.blacklist.Store(jti, expiry)
}
```

### 2. RabbitMQ Fanout Consumer

```go
func (s *AuthzServer) StartBlacklistConsumer(ctx context.Context) error {
    // Fanout exchange에서 메시지 수신
    msgs, err := s.rabbitCh.Consume(
        s.config.BlacklistQueue,  // 각 Pod별 고유 큐
        "",                        // consumer tag
        true,                      // auto-ack
        false,                     // exclusive
        false,                     // no-local
        false,                     // no-wait
        nil,
    )

    go func() {
        for msg := range msgs {
            var event BlacklistEvent
            if err := json.Unmarshal(msg.Body, &event); err != nil {
                continue
            }

            // Local cache 업데이트
            s.localCache.Add(event.JTI, event.Expiry)

            log.Info("Blacklist updated",
                "jti", event.JTI,
                "expiry", event.Expiry,
            )
        }
    }()

    return nil
}
```

### 3. Authorization Flow

```go
func (s *AuthzServer) Check(
    ctx context.Context,
    req *envoy_auth.CheckRequest,
) (*envoy_auth.CheckResponse, error) {
    // 1. Extract JWT from header
    token := extractToken(req.Attributes.Request.Http.Headers)
    if token == "" {
        return deny("missing token"), nil
    }

    // 2. Parse and validate JWT
    claims, err := s.jwtValidator.Validate(token)
    if err != nil {
        return deny("invalid token"), nil
    }

    // 3. Check local blacklist FIRST (fast path)
    if s.localCache.IsBlacklisted(claims.JTI) {
        return deny("token revoked"), nil
    }

    // 4. Cache miss → check Redis (slow path, rare)
    if s.redisClient.IsBlacklisted(ctx, claims.JTI) {
        // Update local cache for next time
        s.localCache.Add(claims.JTI, claims.ExpiresAt)
        return deny("token revoked"), nil
    }

    // 5. Allow request
    return allow(claims), nil
}
```

---

## Istio Integration

```yaml
# AuthorizationPolicy
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: ext-authz
  namespace: istio-system
spec:
  selector:
    matchLabels:
      app: istio-ingressgateway
  action: CUSTOM
  provider:
    name: ext-authz-grpc
  rules:
    - to:
        - operation:
            paths: ["/api/*"]
            notPaths: ["/api/health", "/api/auth/*"]

---
# MeshConfig Extension Provider
extensionProviders:
  - name: ext-authz-grpc
    envoyExtAuthzGrpc:
      service: ext-authz.auth.svc.cluster.local
      port: 9191
      timeout: 5s
```

---

## Monitoring

```yaml
# Prometheus Metrics
ext_authz_requests_total{result="allow|deny"}
ext_authz_latency_seconds{quantile="0.5|0.9|0.99"}
ext_authz_cache_hits_total
ext_authz_cache_misses_total
ext_authz_blacklist_size
```

---

## Infrastructure

- **Kubernetes**: Deployment (3 replicas)
- **Istio**: External Authorization Provider
- **Redis Sentinel**: JWT Blacklist fallback
- **RabbitMQ**: Fanout Exchange (blacklist.events)

---

## References

- [ext-authz 성능 최적화](https://rooftopsnow.tistory.com/24)
- [Local Cache Broadcast 패턴](https://rooftopsnow.tistory.com/113)
