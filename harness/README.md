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

## Parallel Harness M1

독립 Task는 [`parallel.example.json`](parallel.example.json)처럼 `schemaVersion: 1`, `tasks[]`에 `id`, `requirement`, `allowedPaths`, `dependsOn`을 적는다. `allowedPaths`는 **정확한 저장소 상대 파일 경로**만 받는다. 각 Task는 고유한 파일을 가져야 하며, 보호 경로와 겹치거나 의존성이 없거나 순환하면 어떤 worktree도 만들기 전에 거절한다. Core가 생성한 `tasks/NNN-*.md` 한 파일만 Task 허용 경로 검사에서 예외로 인정한다.

```bash
node harness/parallel.mjs start harness/parallel.example.json
node harness/parallel.mjs status <parallel-run-id>
node harness/parallel.mjs stop <parallel-run-id>
node harness/parallel.mjs restart <parallel-run-id>
```

`start`와 `restart`는 완료될 때까지 실행한다. `stop`은 별도 터미널에서 요청한다. `status`는 실행 중에도 `state.json`의 Task 상태, PID, 브랜치, worktree, 로그·결과 파일과 Core run ID를 보여준다. 실행 기록은 Git에서 제외된 `harness/parallel-runs/<runId>/` 아래에 남는다. Task별 브랜치는 `harness/m1/<runId>/<task-id>-a<attempt>`이고, worktree는 해당 실행의 `worktrees/` 아래에 만든다. 각 worktree의 Core 기록은 자체 `harness/runs/`에 남으며 이전 Core 실행이나 다른 Task의 기록을 읽거나 고치지 않는다.

최대 네 Worker를 동시에 시작한다. 선행 Task가 `DONE`일 때만 후속 Task를 시작한다. 실패·사람 확인 대기는 다른 독립 Worker를 중단하지 않고, 그 Task에 의존하는 Task만 `BLOCKED`로 남긴다. `restart`는 완료 Task를 건너뛰고 나머지 Task를 **새 브랜치와 worktree의 새 시도**로 실행한다. 이전 시도와 로그는 보존한다. 중단 시 Core에 SIGTERM을 보내 정리할 시간을 주고 15초 뒤에도 남아 있으면 프로세스 그룹을 강제 종료한다.

M1은 각 새 worktree에서 잠금 파일이 있는 루트와 `design-lab/`에 `npm ci`를 실행한 뒤 Core의 기존 `node harness/run.mjs` 진입점을 그대로 호출한다. 각 Worker가 의존성을 따로 설치하므로 첫 실행에는 레지스트리 접근·디스크 공간·설치 시간이 필요하다. Core의 사람 결정·수동 검증 대기 상태는 Parallel 실행에서 `WAITING`으로 기록한다. 답변 파일을 채운 뒤 해당 Task worktree에서 Core의 `--resume <core-run-id>`를 직접 실행할 수 있지만, Parallel DAG는 그 결과를 자동으로 다시 반영하지 않는다. 후속 Task가 필요한 경우 `restart`로 새 시도를 만든다. 각 Task는 같은 시작 커밋을 기준으로 하므로 선행 Task의 파일 변경을 후속 Task에 자동 전달하지 않는다. 브랜치 통합·충돌 해결·Push·PR·Merge는 하지 않는다. 종료 후 허용 파일 범위를 검사하며, Worker 실행 중 보호 파일을 쓰는 행위를 실시간으로 막는 격리는 제공하지 않는다.

회귀 검사: `node --test harness/tests/*.test.mjs`. Parallel 테스트는 임시 Git 저장소에 실제 worktree와 Node Worker 프로세스를 1개·2개·4개 띄우고 테스트용 Core 진입점으로도 4개를 동시에 실행해 의존성 설치, DAG, 실패 격리, 중단·재시작을 확인한다. AI 서비스에 연결한 Core 전체 루프는 별도의 실사용 검증이 필요하다.
