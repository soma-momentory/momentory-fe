# Momentory Codex 작업 안내

제품·디자인 판단은 `docs/DESIGN.md`, 저장소 작업 규칙은 `docs/CONTRIBUTING.md`를 따른다. `docs/spec/`은 동결 스냅샷이다. 기존 미커밋 변경을 보존한다.

검수 요청에는 프로젝트 로컬 스킬을 선택한다. 문구·모멘토리 톤은 `$momentory-ux-writing`, 타이포그래피·화면 간 디자인 일관성은 `$momentory-design-audit`, 수정 화면 QA·프론트 성능은 `$momentory-screen-qa`를 사용한다. 범위가 겹칠 때만 함께 사용한다. 감사 요청만으로 제품 코드를 수정하지 않는다.

제품 여정은 `$momentory-product-journey`, AI 회고·다음 날 편지의 합성 사례 평가는 `$momentory-ai-quality-eval`, 계측은 `$momentory-analytics-audit`, 변경 diff 리뷰는 `$momentory-pr-review`를 사용한다. 작은 수정은 변경 영역만 검사하고 전체 앱 감사는 명시적 요청에서만 수행한다. 공식 `playwright-cli`는 Expo Web Lab의 로컬 화면 관찰에 사용하며 `diagnose-activation`, `diagnose-retention`, `craft-experiment-design`은 필요한 분석 틀만 참고한다. Amplitude MCP 미연결 상태에서 운영 데이터를 분석했다고 보고하지 않는다. 실제 일기·감정 데이터는 외부 도구로 전송하지 않는다. 외부 전송·유료 실행·게시 전에 범위와 비용에 대한 명시적 허가를 받는다.

일반 프론트 수정에서는 변경 파일과 직접 영향받는 화면만 확인한다. 먼저 주 스킬 하나를 고른다: 문구는 `momentory-ux-writing`, 시각·서체·간격은 `momentory-design-audit`, 동작·상태·반응형은 `momentory-screen-qa`, diff 위험 리뷰는 `momentory-pr-review`. 변경 성격이 실제로 겹칠 때만 보조 스킬의 해당 항목을 추가한다. 기본 검사는 관련 타입/린트·좁은 테스트이며, Lab 브라우저·전체 앱 검사·네이티브 E2E는 그 결과나 요청이 필요할 때만 한다.

홈 v2 히어로·감정 도크 배치나 장식 요소의 접근성 속성을 수정하면 `npx playwright test expo-lab/e2e/home-accessibility-layout.spec.ts --workers=1`로 실제 경계와 웹 콘솔을 확인한다. 다른 화면의 작은 변경에는 이 검사를 자동으로 붙이지 않는다.

사용자가 문장 하나를 제공하고 모멘토리 톤으로 재작성만 요청하면 저장소 검색·문서 읽기 없이 제공된 문장으로 답한다. 실제 화면 문구 감사에서는 해당 화면의 관련 문서·코드 부분만 읽는다.

온보딩→첫 기록·재방문처럼 제품 흐름을 묻는 요청은 `momentory-product-journey`를 먼저 사용한다. 이벤트의 누락·중복·개인정보 자체가 쟁점일 때만 `momentory-analytics-audit`를 함께 사용한다. `diagnose-activation`·`diagnose-retention`은 명시 호출 전용 참고 스킬이며, 실제 코호트·전환율 분석은 데이터 연결과 조회 권한이 있을 때만 한다. A/B 실험 설계를 명시한 요청에는 `craft-experiment-design`을 사용한다.
