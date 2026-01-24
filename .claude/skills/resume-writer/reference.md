# Reference: LLM 백엔드 프로그래머 지원서 (2996자)

대상: LLM 백엔드 프로그래머 포지션
배분: Eco² 2000자 / Rakuten 500자 / DREAM 500자
원칙: STAR 암시 구조 + Amazon Resume Principles
특징: Event/State 분리 + seq 시계열 모사, Agent Knowledge Base + Skills 방법론 포함

---

[이코에코(Eco²) - LangGraph 멀티에이전트 파이프라인 | 2025.10–현재]

LangGraph Send API 기반 멀티에이전트 파이프라인을 설계·구현하여, 9분류 Intent 분석 후 11종 서브에이전트(scan, classify, weather, location, web_search, character, price, bulk_waste, image_gen 등)를 동적 병렬 라우팅하는 AI 챗봇 백엔드를 단독 개발했습니다.

Eco² 서비스의 LLM 파이프라인은 호출당 10-20초의 높은 지연으로 동시 접속 50 VU에서 병목이 발생했고, 단일 Intent 구조로는 "이 페트병 어떻게 분리해? 근처 수거함도 알려줘" 같은 복합 질의를 처리할 수 없었습니다. 다수의 서브에이전트가 동시에 이벤트를 발행하면서 클라이언트 측 이벤트 순서 보장도 불가능한 상태였습니다.

이를 해결하기 위해 Celery/RabbitMQ 태스크 큐에서 Redis Event Bus 3-Tier(Streams + Pub/Sub + State KV)로 전환했습니다. token·weather·location 등 서브에이전트와 목적에 따라 Event(진행 알림, 토큰 스트림)와 State(결과 스냅샷)를 분리하고, Lamport Clock 기반 seq를 부여하여 논리적 시계열 순서를 모사했습니다. 서브에이전트가 동시 실행되어도 이벤트 유실 없이 정확한 순서로 클라이언트에 전달되며, FE에서는 seq 기반 정렬로 UI를 결정적으로 렌더링하는 것이 동시성 확장의 핵심입니다. Taskiq asyncio-native 워커가 RabbitMQ Direct Exchange로 파이프라인 단위 작업을 소비합니다.

LangGraph Send API로 Multi-Intent Fanout을 구현하여 의도별 서브에이전트를 동적 생성·병렬 실행합니다. Vision Classification → Rule-based Retrieval → Domain Knowledge Injection → Answer 파이프라인에서 대한민국 폐기물 분류체계와 13종 캐릭터 도메인 지식을 구조화 프롬프트로 주입하여 할루시네이션을 억제하고, 사용자 위치 연동 실시간 날씨·수거함·재활용센터 검색과 네이티브 웹 검색까지 하나의 그래프에서 병렬 처리합니다. Multi-LLM Provider(OpenAI Responses API / Gemini SDK)를 Strategy 패턴으로 추상화하고 Fallback 체인으로 벤더 장애 시 자동 전환하여 서비스 연속성을 확보했습니다. Token v2 스트리밍과 ReadThroughCheckpointer(Redis Primary + PostgreSQL Async Sync)로 연결 단절 후에도 seq 기반 catch-up이 가능한 멀티턴 대화 메모리를 구현하고, Connection Pool 212→33(84% 감소)으로 psycopg_pool.PoolTimeout을 해결했습니다.

인프라는 24-Node Self-managed Kubernetes 클러스터 위에 ArgoCD GitOps를 구축하여 선언적 배포 파이프라인을 확립하고, Istio mTLS 서비스 메시, OpenTelemetry 분산 트레이싱, KEDA 오토스케일링으로 DOMA + Clean Architecture(Port/Adapter 4-Layer) 기반 7개 도메인 서비스를 운영합니다. 32일 만에 클러스터부터 전체 API를 완료한 뒤, 아키텍처 결정 기록(ADR)·장애 로그·도메인 규칙을 Agent Knowledge Base로 지속 축적하고 자체 RAG로 활용하여 Claude Code 에이전트의 코드베이스 온보딩을 가속화했습니다. 도메인별 코드 리뷰·린팅·E2E 테스트를 Skills로 마이그레이션하여 에이전트 워크플로우에 통합하고, Permission Mode 전환(Plan→Auto-Accept→Normal)으로 설계-구현-검증 사이클을 운용하며 3개월간 성능 고도화를 지속했습니다.

결과적으로 동시 접속 VU 50→500 확장(10배), RPM 400+ 처리량을 달성했으며, 2025 새싹톤 전국 181개 팀 중 우수상을 수상하여 분산 이벤트 아키텍처와 LLM 멀티에이전트 파이프라인 설계의 확장성을 검증받았습니다.

[Rakuten Symphony | 2024.12–2025.08]

C/RPC 기반 분산 스토리지 서버(CNP)와 Go 기반 Object Storage 게이트웨이를 개발하며 페타바이트급 대규모 프로덕션 분산 시스템의 실무 역량을 축적했습니다. CNP에서는 멀티스레드 동시성 버그로 인한 mutex_lock crash를 재현·분석하여 SEGMENT_LOCK의 down_write→down_read 전환으로 해결하고, 읽기 병렬성을 확보하면서 프로덕션 데이터의 무결성을 유지했습니다. Object Storage에서는 Eventual Consistency 모델 기반 환경의 분산 게이트웨이 캐시 정합성 패턴을 설계하고 Go로 대용량 오브젝트의 고성능 병렬 I/O 처리를 구현했습니다. 글로벌 팀(인도·일본·한국) 환경에서 영어 기반 코드 리뷰·아키텍처 설계 논의·장애 분석을 수행하며, 수백 대 규모 프로덕션 클라우드 환경에서의 릴리즈 사이클과 온콜 기반 장애 대응 운영 체계를 체득했습니다.

[DREAM · 카카오테크 부트캠프 | 2024.06–2024.11]

카카오테크 부트캠프에서 6개월간 백엔드·클라우드·AI 집중 과정을 이수하고 팀 프로젝트를 리드하며, Elasticsearch 벡터 검색 + BM25 하이브리드 RAG 파이프라인과 LangChain 에이전트를 설계·구현하여 LLM 기반 애플리케이션 백엔드 개발의 기초 역량을 확립했습니다. DREAM 프로젝트에서 멀티 인덱스 검색 전략과 프롬프트 엔지니어링으로 문서 검색 정확도와 응답 품질을 개선하고, 비동기 처리와 쿼리 최적화를 통해 CPU 사용률 89%→40% 절감, 배포 시간 80% 단축을 달성했습니다. Python FastAPI 백엔드와 AWS 클라우드 환경에서 컨테이너 마이크로서비스 설계 및 CI/CD 파이프라인 자동화 및 인프라 코드화 역량을 확보하여, 이코에코의 24-Node Kubernetes 클러스터 운영과 LangGraph 멀티에이전트 파이프라인으로 발전시키는 핵심적 기술 토대가 되었습니다.