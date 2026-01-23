# Eco² 프로젝트 스토리라인

블로그 포스트 기반 시간순 기술 진화 아크.
지원서 작성 시 내러티브 구성에 참조합니다.

---

## Phase 1: Genesis Sprint (32일)
**Source**: rooftopsnow.tistory.com/15

- 14-node K8s 클러스터 + GitOps + 7 도메인 API를 32일 만에 구축
- 181개 팀 중 6위 본선 진출
- 555,148줄 작성 → 68,000줄 반영 (12%)
- DB 부트스트랩 데드락 → PostSync 훅 해결

## Phase 2: Pipeline Architecture (수상)
**Source**: rooftopsnow.tistory.com/16

- 우수상 수상
- Vision Classification → Rule-based Retrieval → Disposal Rules → Answer 파이프라인 확립
- 할루시네이션 방지: 구조화 프롬프트 + Grounding
- 불필요한 캐싱/히스토리 주입 제거, 엔드포인트 분할(/v1, /v2)

## Phase 3: Observability & Service Mesh
**Source**: rooftopsnow.tistory.com/25, /42

- 16→24노드 확장
- Istio 서비스 메시, gRPC 내부 통신
- Jaeger + OpenTelemetry 분산 트레이싱
- EDA 전환으로 모놀리식 한계 극복

## Phase 4: Queuing 도입
**Source**: rooftopsnow.tistory.com/86

- RabbitMQ + Celery 도입
- 태스크 단위 큐잉의 한계 인식
- 파이프라인 단위 오케스트레이션으로 방향 전환

## Phase 5: Scalability Breakthrough (핵심 전환점)
**Source**: rooftopsnow.tistory.com/109

- Redis Event Bus 3-Tier (Streams + Pub/Sub + State KV)
- VU 50 → 500, RPM 400+
- Event Router: 멱등성 보장
- Celery → Redis 이벤트 시스템 전환

## Phase 6: Clean Architecture 정립
**Source**: rooftopsnow.tistory.com/128

- Port/Adapter 4-Layer: Presentation → Application → Infrastructure
- Vision → Rule-based → Answer → Reward 체이닝
- Stateless reducer 패턴
- ext-authz 2,500 VU 부하 테스트 통과
- 개발 비용: ~897만원 (2개월)

## Phase 7: Agent Tool Evolution
**Source**: rooftopsnow.tistory.com/191

- 토큰 비용 폭발 (이틀 50-60만원)
- Cursor → Claude Code Max 전환
- 에이전트 워크플로우 = 기존 CRUD와 본질적으로 다른 패러다임

## Phase 8: Multi-Agent System (현재)
**Source**: rooftopsnow.tistory.com/236

- LangGraph + Taskiq asyncio-native
- Event Bus Layer → LLM 비동기 큐잉 재사용
- 서브에이전트별 상태 분리
- timestamp → seq 기반 이벤트 필터링
- FE-BE 동기화: Optimistic Update + IndexedDB + Cursor-based Reconciliation

---

## 핵심 진화 축

| 축 | 시작 | 현재 |
|---|---|---|
| 인프라 | 14 nodes | 24 nodes |
| 큐잉 | Celery/RabbitMQ | Redis Event Bus 3-Tier |
| 아키텍처 | 모놀리식 | DOMA + Clean Architecture |
| LLM | 단일 호출 | LangGraph Multi-Agent |
| 동시성 | VU 50 | VU 500 (ext-authz 2,500) |
| 이벤트 | task_id 필터 | seq 기반 시계열 모사 |
| 개발 도구 | Cursor | Claude Code Max |
