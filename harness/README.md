# Momentory FE 개발 하네스

Harness Core 버전은 `1.0.1`이며 `harness/version.json`에 고정한다. 이 저장소의 설정은 `harness/project.json`에 있다. 공통 엔진은 `harness/lib/`와 `harness/schemas/`, 프로젝트 전용 시작 프롬프트는 `harness/prompts/`에 둔다.

Task는 `tasks/`에 생성한다. 실행 기록·잠금·체크포인트·결정 답변은 이 저장소의 `harness/runs/`에만 생성되며 Git에서 제외된다. Capstone의 기록과 설정을 참조하지 않는다.

시작 전에 `docs/CONTRIBUTING.md`의 작업 규칙과 `docs/HARNESS_NAV.md`의 범위별 문서를 읽는다. 첫 실행은 기존 변경 사항을 정리하고 하네스 설치 내용을 커밋한 뒤에 가능하다. 작업 트리가 깨끗해야 하네스의 사전 검사를 통과한다.

```bash
node harness/run.mjs "요구사항"
node harness/run.mjs --resume [runId]
```

`--resume`은 이 저장소의 `harness/runs/`만 조회한다. 이 설치 작업에서는 개발 루프를 실행하지 않는다.

## 사람의 결정 입력

터미널에서는 각 질문에 번호 또는 직접 입력으로 답한 뒤, 그 질문에 표시된 확인 코드를 입력해야 답변이 저장된다. 빈 줄은 추천안을 선택하지 않는다. 여러 줄을 한 번에 붙여넣거나 나누어 붙여넣더라도 남은 줄을 다음 질문의 답으로 넘기지 않는다. `q` 또는 Ctrl+C로 중단하면 확인을 마친 답변만 보존한다.

모든 질문을 마치면 질문별 답변 요약을 표시한다. `승인 <코드>`를 입력해야 다음 단계로 진행한다. 중단 후 재개할 때 이미 저장된 답변도 요약과 최종 승인을 다시 거친다. 터미널이 아닌 환경에서는 `decisions.json`의 각 `answer`를 채우고 전체를 확인한 뒤 `approved`를 `true`로 명시해야 재개된다.

입력 회귀 테스트는 `node --test harness/tests/*.test.mjs`로 실행한다. 기존 실패 실행 `20261014-234910`과 백업 자료는 보존하며 새 실행의 답변으로 재사용하지 않는다.
