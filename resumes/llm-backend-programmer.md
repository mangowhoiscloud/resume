# LLM 백엔드 프로그래머 지원서

## Eco² - LangGraph 멀티에이전트 파이프라인 | 2024.10–현재

LangGraph Send API 기반 멀티에이전트 파이프라인을 설계·구현하여, 9분류 Intent 분석 후 11종 서브에이전트(scan, classify, weather, location, web_search, character, price, bulk_waste, image_gen 등)를 동적 병렬 라우팅하는 AI 챗봇 백엔드를 단독 개발했습니다.

### 문제

- LLM 파이프라인 호출당 10-20초 지연 → 동시 접속 50 VU에서 병목
- 단일 Intent 구조 → 복합 질의 처리 불가
- 다수 서브에이전트 동시 이벤트 발행 → 클라이언트 측 이벤트 순서 보장 불가

### 해결

- Celery/RabbitMQ 태스크 큐 → Redis Event Bus 3-Tier(Streams + Pub/Sub + State KV) 전환
- Event/State 분리 + Lamport Clock 기반 seq → 논리적 시계열 순서 모사
- Taskiq asyncio-native 워커 + RabbitMQ Direct Exchange
- LangGraph Send API Multi-Intent Fanout → 의도별 서브에이전트 동적 생성·병렬 실행
- Vision Classification → Rule-based Retrieval → Domain Knowledge Injection → Answer 파이프라인
- Multi-LLM Provider Strategy 패턴 (OpenAI / Gemini) + Fallback 체인
- Token v2 스트리밍 + ReadThroughCheckpointer(Redis Primary + PostgreSQL Async Sync)
- Connection Pool 212→33 (84% 감소)

### 인프라

- 24-Node Self-managed Kubernetes 클러스터
- ArgoCD GitOps 선언적 배포
- Istio mTLS 서비스 메시
- OpenTelemetry 분산 트레이싱
- KEDA 오토스케일링
- DOMA + Clean Architecture(Port/Adapter 4-Layer) 기반 7개 도메인 서비스

### 개발 방법론

- ADR·장애 로그·도메인 규칙 → Agent Knowledge Base → 자체 RAG
- Claude Code 에이전트의 코드베이스 온보딩 가속화
- 도메인별 Skills 마이그레이션 (코드 리뷰, 린팅, E2E 테스트)
- Permission Mode 전환 (Plan→Auto-Accept→Normal) → 설계-구현-검증 사이클

### 성과

- 동시 접속 VU 50→500 확장 (10배)
- RPM 400+ 처리량
- 2025 새싹톤 전국 181개 팀 중 우수상 수상

---

## Rakuten Symphony | 2023.04–2024.03

C/RPC 기반 분산 스토리지 서버(CNP)와 Go 기반 Object Storage 게이트웨이를 개발하며 페타바이트급 대규모 프로덕션 분산 시스템의 실무 역량을 축적했습니다.

### 핵심 성과

- 멀티스레드 동시성 버그 mutex_lock crash → SEGMENT_LOCK down_write→down_read 전환, 읽기 병렬성 확보
- Eventual Consistency 모델 기반 분산 게이트웨이 캐시 정합성 패턴 설계
- Go 대용량 오브젝트 고성능 병렬 I/O 처리 구현
- 글로벌 팀(인도·일본·한국) 영어 기반 코드 리뷰·아키텍처 설계·장애 분석
- 수백 대 규모 프로덕션 클라우드 온콜 장애 대응 운영 체계

---

## DREAM · 카카오테크 부트캠프 | 2024.04–2024.09

카카오테크 부트캠프 6개월간 백엔드·클라우드·AI 집중 과정 이수, 팀 프로젝트 리드.

### 핵심 성과

- Elasticsearch 벡터 검색 + BM25 하이브리드 RAG 파이프라인 설계·구현
- LangChain 에이전트 설계·구현
- CPU 사용률 89%→40% 절감
- 배포 시간 80% 단축
- Python FastAPI 백엔드 + AWS 컨테이너 마이크로서비스 + CI/CD 자동화

---

## Skills

- **Languages**: Python, Go, C
- **LLM/AI**: LangGraph, LangChain, OpenAI API, Gemini SDK, RAG, Prompt Engineering
- **Infrastructure**: Kubernetes (24-Node), ArgoCD, Istio, OpenTelemetry, KEDA
- **Messaging**: RabbitMQ, Redis Streams, Pub/Sub, Celery, Taskiq
- **Databases**: PostgreSQL, Redis, Elasticsearch
- **Architecture**: Clean Architecture, DOMA, Event-Driven, Microservices
- **DevOps**: Docker, GitOps, CI/CD, Kustomize
- **Collaboration**: English-based global team, Code Review, ADR
