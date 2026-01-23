# Resume Writer Skill

이력서·지원서 작성 전문 스킬. SSOT 기반으로 경력 사항을 정확하게 기술하고, 목표 글자 수에 맞춰 최적화합니다.

## SSOT (Single Source of Truth)

- **포트폴리오**: `/Users/mango/workspace/resume/eco2-portfolio.html`
- **이력서**: `/Users/mango/workspace/resume/index.html`
- **블로그**: `https://rooftopsnow.tistory.com` (개발 과정 기록)
- **코드베이스**: `/Users/mango/workspace/SeSACTHON/backend` (Eco² 백엔드)

작성 시 반드시 SSOT를 참조하여 사실 관계를 검증합니다.

## 작성 원칙

### Amazon Resume Principles
- **Accomplishments > Responsibilities**: 무엇을 했는지가 아니라 무엇을 달성했는지
- **Quantify**: 수치로 성과 증명 (VU 50→500, CPU 89%→40%)
- **Action Verbs**: 설계·구현·전환·확장·달성
- **Simplicity**: 군더더기 없는 직접적 서술

### STAR 구조 (암시적)
STAR 태그([Situation], [Task] 등)를 표면에 노출하지 않습니다.
문장 흐름으로 자연스럽게 상황→과제→행동→결과를 전개합니다.

### 문체 규칙
- "첫째, 둘째, 셋째" 열거 금지 → 문단 단위 자연 전개
- 기술 용어는 정확하게, 비기술적 설명은 배제
- 개발 과정의 내러티브를 담되, 감상적 표현은 배제
- 성과 지표는 before→after 형식으로 명시

## 작성 워크플로우

1. **SSOT 참조**: 포트폴리오·이력서·블로그에서 사실 관계 확인
2. **스토리라인 수립**: 블로그 포스트 시간순 분석 → 프로젝트 진화 아크 도출
3. **배분 설계**: 프로젝트별 목표 글자 수 할당
4. **초안 작성**: STAR 암시 구조 + Amazon 원칙 적용
5. **글자 수 맞춤**: python `len()` 으로 정밀 측정, 반복 조정
6. **문장력 검증**: 열거형 제거, 내러티브 흐름 확인

## 글자 수 측정 방법

```bash
python3 -c "
with open('/tmp/draft.txt', 'r') as f:
    text = f.read().strip()
print(f'Total: {len(text)}')
"
```

- `len(text)` (with newlines) 기준으로 측정
- 섹션별 `.split('[프로젝트명')` 으로 분리 후 개별 카운트
- 목표 대비 ±20자 이내를 허용 범위로 설정

## 프로젝트별 핵심 어필 포인트

### Eco² (메인 프로젝트)
- LangGraph Send API 멀티에이전트 동적 병렬 라우팅
- Redis Event Bus 3-Tier: Event/State 분리 + seq 기반 시계열 모사
- Multi-Intent Fanout: 복합 질의 단일 요청 병렬 처리
- Rule-based Retrieval: 도메인 지식 주입 (13종 캐릭터, 폐기물 분류)
- Multi-LLM Provider Strategy + Fallback
- Token v2 스트리밍 + seq 기반 catch-up
- 24-Node K8s + ArgoCD GitOps + Istio + OTEL + KEDA
- 개발 방법론: Agent Knowledge Base → 자체 RAG → Skills 마이그레이션
- 성과: VU 50→500(10x), RPM 400+, 새싹톤 우수상

### Rakuten Symphony
- C/RPC 분산 스토리지 서버 (CNP): mutex_lock crash → down_write→down_read
- Go Object Storage: Eventual Consistency, 병렬 I/O
- 글로벌 팀 (인도·일본·한국), 영어 기반 협업
- 페타바이트급 프로덕션 클라우드, 온콜 장애 대응

### DREAM · 카카오테크 부트캠프
- Elasticsearch 벡터 + BM25 하이브리드 RAG
- LangChain 에이전트
- CPU 89%→40%, 배포 시간 80% 단축
- AWS 컨테이너 마이크로서비스 + CI/CD
- Eco² 프로젝트의 기술적 토대

## 주의사항

- 블로그에 기록된 수치와 기술 스택만 사용 (과장 금지)
- 지원 기업의 JD 키워드와 자연스럽게 연결
- 동일 성과를 중복 기술하지 않음
- 개발 도구(Claude Code, Cursor) 언급 시 방법론으로서 기술
