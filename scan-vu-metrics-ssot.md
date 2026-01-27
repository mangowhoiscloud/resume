# Scan VU Metrics - Single Source of Truth (SSOT)

> **Updated**: 2026-01-28
> **Source**: https://rooftopsnow.tistory.com/252 ~ 259
> **Test Environment**: OpenAI Tier 4 (TPM 4,000,000), Worker minReplica=2, maxReplica=5

---

## Summary Table

| VU | Completion Rate | RPM | E2E p95 | E2E avg | Scan Submit p95 | Poll p95 | Failed | Grafana Snapshot |
|----|-----------------|-----|---------|---------|-----------------|----------|--------|------------------|
| **1000** | 97.8% | 373.4 | 173.3s | 121.3s | 787ms | 2,609ms | 33 | [raintank](https://snapshots.raintank.io/dashboard/snapshot/ZcKhGJho3PmmovpclCoQOHqG9RMkWb8U) |
| **900** | 99.7% | 405.5 | 149.6s | 102.2s | 635ms | 2,494ms | 4 | [raintank](https://snapshots.raintank.io/dashboard/snapshot/WBoZVhb5eXwfaFcphMAubQwrEMXJrPFp) |
| **800** | 99.7% | 367.3 | 144.6s | 97.9s | 734ms | 2,110ms | 4 | [raintank](https://snapshots.raintank.io/dashboard/snapshot/VV9dOtFB57B6cDhqAFaPwQU93kds3nlO) |
| **700** | 99.2% | 329.1 | 122.3s | 89.9s | 444ms | 1,283ms | 11 | [live](https://grafana.dev.growbin.app/d/scan-sse-pipeline/f09f93a1-scan-sse-pipeline-event-bus?from=2026-01-27T06:32:35.036Z&to=2026-01-27T06:37:41.547Z) |
| **600** | 99.7% | 358.6 | 108.3s | 73.0s | 360ms | 922ms | 4 | [raintank](https://snapshots.raintank.io/dashboard/snapshot/zs6Mbbdc9FRTrEBbAoHTL6tsKJmbqZf6) |
| **500** | **100%** | 367.9 | 83.3s | 59.2s | 232ms | 349ms | 0 | [raintank](https://snapshots.raintank.io/dashboard/snapshot/acaYWQuYqSHJSXzV54qnA0c8N0FGMX6R) |

---

## Detailed Metrics by VU

### VU 1000 (tistory/259)
```yaml
# Core Metrics
Completion Rate: 97.8%
Total Submitted: 1,518
Total Completed: 1,469
Total Failed: 33
RPM: 373.4 req/m

# Latency
E2E p95: 173.3s
E2E avg: 121.3s
Scan Submit p95: 787ms
Poll p95: 2,609ms

# Polling
Total Poll Requests: 70,432
Avg Polls/Task: 46.4

# API/Rate Limit
HTTP 429: 0
TPM Usage: ~2,448,000 (61%)
TPM Headroom: 1,552,000 (39%)

# Grafana
Snapshot: https://snapshots.raintank.io/dashboard/snapshot/ZcKhGJho3PmmovpclCoQOHqG9RMkWb8U
```

### VU 900 (tistory/258)
```yaml
# Core Metrics
Completion Rate: 99.7%
Total Submitted: 1,540
Total Completed: 1,532
Total Failed: 4
RPM: 405.5 req/m

# Latency
E2E p95: 149.6s
E2E avg: 102.2s
Scan Submit p95: 635ms
Poll p95: 2,494ms

# Polling
Total Poll Requests: 63,499
Avg Polls/Task: 41.2

# API/Rate Limit
HTTP 429: 0
TPM Usage: ~2,553,000 (64%)

# Infrastructure
Worker Replicas: 3
API Replicas: 3
Redis Cache Peak: 512.26MB

# Grafana
Snapshot: https://snapshots.raintank.io/dashboard/snapshot/WBoZVhb5eXwfaFcphMAubQwrEMXJrPFp
```

### VU 800 (tistory/257)
```yaml
# Core Metrics
Completion Rate: 99.7%
Total Submitted: 1,386
Total Completed: 1,378
Total Failed: 4
RPM: 367.3 req/m

# Latency
E2E p95: 144.6s
E2E avg: 97.9s
Scan Submit p95: 734ms
Poll p95: 2,110ms

# Polling
Total Poll Requests: 52,845
Avg Polls/Task: 38.1

# API/Rate Limit
HTTP 429: 0
TPM Usage: ~2,297,000 (57%)

# Infrastructure
Worker Replicas: 3 + 1 canary
Worker CPU Peak: 206m
Worker Memory Peak: 597Mi

# Grafana
Snapshot: https://snapshots.raintank.io/dashboard/snapshot/VV9dOtFB57B6cDhqAFaPwQU93kds3nlO
```

### VU 700 (tistory/256)
```yaml
# Core Metrics
Completion Rate: 99.2%
Total Submitted: 1,496
Total Completed: 1,313
Total Failed: 11
RPM: 329.1 req/m

# Latency
E2E p95: 122.3s
E2E avg: 89.9s
Scan Submit p95: 444ms
Poll p95: 1,283ms

# Polling
Total Poll Requests: 57,955
Avg Polls/Task: 39.7

# API/Rate Limit
HTTP 429: 0
TPM Usage: ~2,188,000 (55%)

# Infrastructure
Redis Cache: 225MB (+35% vs baseline)

# Grafana (Live Dashboard)
URL: https://grafana.dev.growbin.app/d/scan-sse-pipeline/f09f93a1-scan-sse-pipeline-event-bus?from=2026-01-27T06:32:35.036Z&to=2026-01-27T06:37:41.547Z&timezone=browser&refresh=10s
```

### VU 600 (tistory/253)
```yaml
# Core Metrics
Completion Rate: 99.7%
Total Submitted: 1,408
Total Completed: 1,401
Total Failed: 4
RPM: 358.6 req/m

# Latency
E2E p95: 108.3s
E2E avg: 73.0s
Scan Submit p95: 360ms
Poll p95: 922ms

# Polling
Total Poll Requests: 47,727
Avg Polls/Task: 33.9

# Infrastructure
Queue Peak (scan.vision): 358 messages
Worker CPU Peak: 1.85 cores
Worker Memory Peak: 1.52GB

# Grafana
Snapshot: https://snapshots.raintank.io/dashboard/snapshot/zs6Mbbdc9FRTrEBbAoHTL6tsKJmbqZf6
```

### VU 500 (tistory/252) - NEW SLA BASELINE
```yaml
# Core Metrics
Completion Rate: 100%
Total Submitted: 1,336
Total Completed: 1,336
Total Failed: 0
RPM: 367.9 req/m

# Latency
E2E p95: 83.3s
E2E avg: 59.2s
Scan Submit p95: 232ms
Poll p95: 349ms

# Polling
Total Poll Requests: 38,860
Avg Polls/Task: 29.1

# Infrastructure
Worker Replicas: 3 (1 + 2 scaled)
API Replicas: 3 (1 + 2 scaled)
Queue Peak (scan.vision): 352
Queue Peak (scan.answer): 258
Queue Peak (scan.rule): 268
Queue Peak (scan.reward): 155
Worker CPU Peak: 1.72 cores
Worker Memory Peak: 1.30GB
Redis Cache Peak: 102MB (+76MB delta)

# Stage Processing Times (low load)
scan.vision avg: 4.5s
scan.rule avg: 0.04s
scan.answer avg: 6.7s
scan.reward avg: 0.05s
Total Sequential: ~11-12s

# Key Finding
Queue wait time: ~47s (80% of E2E avg 59.2s)

# Grafana
Snapshot: https://snapshots.raintank.io/dashboard/snapshot/acaYWQuYqSHJSXzV54qnA0c8N0FGMX6R
```

---

## Grafana Snapshot URLs

| VU | Type | URL |
|----|------|-----|
| 1000 | raintank | https://snapshots.raintank.io/dashboard/snapshot/ZcKhGJho3PmmovpclCoQOHqG9RMkWb8U |
| 900 | raintank | https://snapshots.raintank.io/dashboard/snapshot/WBoZVhb5eXwfaFcphMAubQwrEMXJrPFp |
| 800 | raintank | https://snapshots.raintank.io/dashboard/snapshot/VV9dOtFB57B6cDhqAFaPwQU93kds3nlO |
| 700 | live | https://grafana.dev.growbin.app/d/scan-sse-pipeline/f09f93a1-scan-sse-pipeline-event-bus?from=2026-01-27T06:32:35.036Z&to=2026-01-27T06:37:41.547Z |
| 600 | raintank | https://snapshots.raintank.io/dashboard/snapshot/zs6Mbbdc9FRTrEBbAoHTL6tsKJmbqZf6 |
| 500 | raintank | https://snapshots.raintank.io/dashboard/snapshot/acaYWQuYqSHJSXzV54qnA0c8N0FGMX6R |

---

## SLA Recommendation

| Criteria | Previous (300 VU) | New SLA (500 VU) |
|----------|-------------------|------------------|
| Completion Rate | 99.9% | **100%** |
| RPM | 402 req/m | 367.9 req/m |
| E2E p95 | 48.5s | 83.3s |
| Scan API p95 | 83ms | 232ms |
| Failed | - | **0** |

**New SLA**: 500 VU, 100% completion, 367.9 RPM, E2E p95 83.3s
**Saturation Point**: 1000 VU (97.8% completion)
**Safe Range**: 500-900 VU (99.2%+ completion)

---

## Update Checklist

### eco2-portfolio.html
- [ ] Hero Section: 300 VU → 500 VU, 528 RPM → 367.9 RPM
- [ ] Hero Grafana Link: Update to VU 500 snapshot
- [ ] Streaming Category: 300 VU 99.9% → 500 VU 100%
- [ ] Production-Ready Section: SLA VU/RPM 업데이트
- [ ] Journey Section: 포화지점 600 → 1000 VU
- [ ] modal-domain-scan: 진화 테이블 전체 업데이트 (500~1000 VU)
- [ ] SSE Event Bus 관련 모달: 테이블/분석 텍스트
- [ ] modal-scan-vision/rule/answer: SLA 기준
- [ ] modal-scan-infra: 성능 테이블 + Grafana 링크

### index.html / resume-lgai-research.html
- [ ] VU/RPM 지표 업데이트 (있는 경우)
