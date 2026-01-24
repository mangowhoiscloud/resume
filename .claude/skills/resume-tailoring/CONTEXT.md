# Resume Tailoring - 프로젝트 컨텍스트

## Resume Library
- `resumes/` 디렉토리에 마크다운 형식의 이력서 보관
- 새 JD 지원 시 tailored 버전이 여기에 추가됨

## SSOT (사실 검증용)
- **포트폴리오**: `/Users/mango/workspace/resume/eco2-portfolio.html`
- **이력서**: `/Users/mango/workspace/resume/index.html`
- **블로그**: `https://rooftopsnow.tistory.com`
- **코드베이스**: `/Users/mango/workspace/SeSACTHON/backend`
- **기존 지원서 레퍼런스**: `/Users/mango/workspace/resume/.claude/skills/resume-writer/reference.md`
- **프로젝트 스토리라인**: `/Users/mango/workspace/resume/.claude/skills/resume-writer/storyline.md`

## 사용법

JD를 제공하며 호출:
```
"이 JD에 맞춰 이력서 tailoring 해줘: [JD 붙여넣기 또는 URL]"
```

Multi-job 모드 (3-5개 동시):
```
"다음 포지션들에 동시 지원하려고 해: [JD1], [JD2], [JD3]"
```

## 주의사항
- 블로그에 기록된 수치와 기술 스택만 사용 (과장 금지)
- 한국어/영어 모두 지원
- 생성된 이력서는 resumes/에 저장하여 라이브러리 축적
