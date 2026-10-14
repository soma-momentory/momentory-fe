# Momentory FE 개발 하네스

Harness Core 버전은 `1.0.0`이며 `harness/version.json`에 고정한다. 이 저장소의 설정은 `harness/project.json`에 있다. 공통 엔진은 `harness/lib/`와 `harness/schemas/`, 프로젝트 전용 시작 프롬프트는 `harness/prompts/`에 둔다.

Task는 `tasks/`에 생성한다. 실행 기록·잠금·체크포인트·결정 답변은 이 저장소의 `harness/runs/`에만 생성되며 Git에서 제외된다. Capstone의 기록과 설정을 참조하지 않는다.

시작 전에 `docs/CONTRIBUTING.md`의 작업 규칙과 `docs/HARNESS_NAV.md`의 범위별 문서를 읽는다. 첫 실행은 기존 변경 사항을 정리하고 하네스 설치 내용을 커밋한 뒤에 가능하다. 작업 트리가 깨끗해야 하네스의 사전 검사를 통과한다.

```bash
node harness/run.mjs "요구사항"
node harness/run.mjs --resume [runId]
```

`--resume`은 이 저장소의 `harness/runs/`만 조회한다. 이 설치 작업에서는 개발 루프를 실행하지 않는다.
