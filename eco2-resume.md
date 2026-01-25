Eco² (이코에코)

[개발 환경]
OS: Ubuntu 22.04 LTS (AWS EC2)
Infra: Kubernetes 24-Node, PostgreSQL, Redis (Streams/Pub/Sub/KV), RabbitMQ, Elasticsearch, Istio Service Mesh
CI/CD(GitOps): ArgoCD App-of-Apps + Sync Wave, Terraform, Ansible, Helm
프레임워크: Python 3.11, FastAPI, SQLAlchemy 2.0, Celery, Gevent, Taskiq, Go
LLM: GPT-5.2, Gemini-3.0-flash, LangGraph, OpenAI Agents SDK
Observability: Prometheus, Grafana, Jaeger, Fluent Bit, Elasticsearch, Kibana
문서 및 일정 관리: Notion, Tistory (100+ 포스팅), Claude Code (35 세션, 2.86B 토큰)
개발 인원: 5명 (Backend/Infra 1명, AI Research 1명, Frontend 2명, UI/UX 1명)
총 개발 기간: 약 3개월 (2025.10.30 ~ 2026.01.25)
참여 역할: Backend / Infra (1인 전담)
수상: 2025 AI 새싹톤 본선 우수상 (Top 4)

[개요]
Eco²는 재활용 분류를 돕는 AI 챗봇 서비스입니다. 사용자가 재활용품 사진을 촬영하면 LLM이 품목을 분류하고, 챗봇을 통해 분리수거 방법과 인근 수거 장소를 안내합니다. 10월 말 14-node 클러스터 구축을 시작으로 11월 중순까지 7개 도메인 서버를 개발했고, 12월 초 새싹톤 본선에서 우수상을 수상했습니다. 이후 Istio Service Mesh 도입과 ext-authz 기반 Auth Offloading, RabbitMQ + Celery 비동기 파이프라인 구축, Clean Architecture 마이그레이션을 거쳐 1월에는 LangGraph 기반 Multi-Agent 아키텍처로 Chat 도메인을 고도화했습니다. 8개 Domain 마이크로서비스(Auth, Character, Chat, Scan, Location, Users, Image, Info)와 8개 Worker로 구성된 Event-Driven Architecture를 설계·구현했습니다.

[LangGraph Multi-Agent Pipeline 설계]
초기 Chat 도메인은 단일 LLM 호출 구조였습니다. 재활용 도메인 특성상 수거장소, 분리방법, 캐릭터, 일반상식 등 이질적인 질의가 혼재했고, 단일 프롬프트로 모든 케이스를 처리하려 하니 응답 품질이 불안정했습니다. 특히 복합 질의("이거 어디서 버려? 이코는 뭐 좋아해?")에서 후속 질문이 누락되는 문제가 반복됐습니다.

이를 해결하기 위해 9개 클래스 Intent Classification을 도입했습니다. waste(폐기물 분리배출), character(캐릭터 질문), location(위치 검색), bulk_waste(대형폐기물), recyclable_price(재활용 시세), collection_point(수거함 위치), web_search(웹 검색), image_generation(이미지 생성), general(일반 대화)로 분류 체계를 수립했습니다. LLM 분류 신뢰도에 키워드 맵 매칭 보정(+0.2), Chain-of-Intent 전이 보너스(+0.15), 짧은 질문 페널티(-0.1)를 적용해 final_confidence를 산출하고, 0.6 미만 시 general로 분류하는 Confidence Scoring 시스템을 구현했습니다.

복합 질의는 Multi-Intent로 분리해 각 Intent별 전용 서브에이전트를 LangGraph Send API로 병렬 실행했습니다. 11개 서브에이전트(location_node, method_node, character_node 등)가 StateGraph로 연결되며, Aggregator가 결과를 수집해 최종 응답을 구성합니다. Fallback Chain(rag → web_search → general_llm)으로 분류 실패나 RAG 품질 미달 시에도 자연스러운 응답을 유지했습니다. Token Streaming은 astream_events v2와 DynamicProgressTracker를 결합해 Phase 기반 병렬 서브에이전트 진행률을 실시간으로 전달했습니다.

Multi-Model Orchestration을 위해 LLMClientPort를 추상화하고, OpenAI Agents SDK(Primary), Responses API(Fallback), Gemini SDK를 Provider 자동 추론 및 런타임 모델 전환이 가능하도록 구성했습니다. NodePolicy(FAIL_OPEN/CLOSE/FALLBACK)와 Circuit Breaker를 적용해 특정 노드 장애 시에도 그래프 전체가 중단되지 않도록 Resilience를 확보했습니다.

[Event Bus Layer 도출 과정]
Scan 파이프라인은 이미지 업로드 → Vision(OCR) → Rule(LLM 분류) → Answer(응답 생성) → Reward(캐릭터 매칭)까지 평균 11.3초가 소요되는 비동기 작업입니다. 이 중 85%가 LLM I/O-bound였기에 SSE로 진행 상황을 실시간 전달해야 했습니다.

Phase 0(Sync)에서는 Thread Pool 6개로 동기 처리했으나, 100 VU에서 150초 이상 타임아웃이 발생하며 완료율 0%를 기록했습니다. GIL 병목과 스레드 점유가 원인이었습니다.

Phase 1(Celery Events)에서는 Celery 이벤트를 SSE로 직접 전달하는 구조로 전환했습니다. 그러나 50 VU에서 503 에러가 발생했고, 원인을 분석하니 SSE 연결 1개당 RabbitMQ 연결 21개가 생성되어 341개 연결이 폭발하는 구조였습니다. SSE:RabbitMQ = 1:21 비율로 메모리 초과가 발생했습니다.

Phase 2(KEDA)에서는 KEDA 기반 오토스케일링을 적용해 완료율을 35%에서 86.3%로 끌어올렸습니다. 그러나 SSE Pod마다 N개 코루틴이 개별 XREAD를 수행해 CPU 85%, Context Switching 오버헤드가 발생했고, 고부하 시 30%로 하락하는 문제가 남았습니다.

Phase 3(Event Bus Layer)에서 근본적인 아키텍처 개선을 단행했습니다. Redis Streams(영속) + Pub/Sub(실시간) + State KV(복구)로 책임을 분리하고, Event Router가 Consumer Group(XREADGROUP)으로 4개 shard를 병렬 소비해 Pub/Sub로 브로드캐스트합니다. SSE Gateway는 Pub/Sub만 구독하므로 연결 복잡도가 O(n×m)에서 O(n)으로 감소했습니다.

추가로 Pub/Sub Shard 최적화를 적용했습니다. 기존 job_id별 채널(sse:events:{job_id}) 구조에서 shard별 채널(sse:events:{shard}, shard = hash(job_id) % 4) 구조로 변경하고, SSE Gateway가 시작 시 4개 shard 전체를 구독한 뒤 메시지 내 job_id로 내부 라우팅하도록 개선했습니다. 연결 수가 O(N)에서 O(4)로 감소해 1,000 VU 기준 99.6% 연결 절감을 달성했습니다.

결과적으로 SLA 300 VU에서 99.9% 완료율, 402 req/m 처리량을 확보했습니다. 500 VU에서는 단일 노드 한계로 94%까지 하락했으나, Pod count와 Shard count가 독립적으로 스케일링 가능한 구조를 확보해 수평 확장 기반을 마련했습니다.
