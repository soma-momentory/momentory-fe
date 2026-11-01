# Momentory Expo Lab

웹에서 **앱의 모든 화면을 실제 앱 코드로** 처음부터 끝까지(스플래시 · 소개 · 로그인 · 온보딩 · 탭 · 회고 · 편지 · 쉼터 · 마이) 띄우고, 눌러서 흐름을 시험하고, 데이터 양 · 시각 · 서버 실패를 바꿔 보고, 디자인 시안을 승인본과 나란히 비교하는 **로컬 전용** 작업대다. 옛 캡처 Atlas(PNG 38장)는 지웠다 — 보이는 것은 전부 살아 있는 앱이다.

## 실행

```bash
npm ci
npm run lab:skins            # (선택) Android 에뮬레이터 스킨을 로컬 SDK 에서 복사 — 없으면 SVG 외형
npm run lab:web -- --port 8092
```

`http://localhost:8092/` 를 연다. ⚠ `CI=1` 로 띄우면 Expo 가 파일 감시를 끄므로 코드를 고쳐도 다시 묶지 않는다.

## 구조 — 셸과 프레임 (2026-11-02 · 「전 화면」 네 갈래)

```
셸(최상위 창 · src/shell/ShellApp.tsx)
 ├ 왼쪽   라우트 목록 — app/ 에서 생성 · 앱 순서로 묶음 · 검색 · 프레임이 지금 선 화면에 배지
 ├ 가운데 한 화면 / A·B 비교 / 전체 화면 / 매트릭스(기기별 · 데이터 세트별)
 │        └ 실제 기기 외형(DeviceFrame) 안에 <iframe name={encodeFrameConfig(config)} src="/<라우트>">
 └ 오른쪽 조작 · 디자인 편집(DesignEditorPanel) · 요청 기록
프레임(iframe 안) = 실제 앱(expo-router 전체) + 가짜 서버 + 시안 적용 — 갈래 A·B·D
```

| 갈래    | 무엇                                              | 파일                                                 |
| ------- | ------------------------------------------------- | ---------------------------------------------------- |
| A       | 프레임 부트스트랩 — `window.name` 의 설정으로 앱  | `index.ts` · `src/frame/` · `metro.config.js`        |
| B       | 가짜 서버 · 데이터 세트 · `sampleParams`          | `src/fake-server/`                                   |
| C(여기) | 셸 · 라우트 목록 · 기기 외형 · 해시 상태          | `src/App.tsx` · `src/shell/` · `src/lab-devices.ts`  |
| D       | 디자인 시안 편집 · 적용                           | `src/design-editor/`                                 |
| 공유    | 프레임 설정 · 셸↔프레임 메시지 · 시안 모양 (계약) | `src/lab-contract.ts` — 바꾸면 네 갈래를 같이 고친다 |

셸은 프레임에 **설정을 iframe 이름으로** 싣고(`LabFrameConfig` — 데이터 세트 · 플랫폼 · 기기 · 고정 시각 · 시안 · 로그인 · 지연 · 실패 주소 · 오늘 다시 쓰기), **주소는 `lab:navigate` 로만** 옮긴다. 프레임은 `lab:ready` · `lab:route` · `lab:statusBar` · `lab:request` 를 보낸다(`src/shell/frameBus.ts` 가 단일 통로). 설정이 바뀌면 프레임이 새로 뜨되 **지금 서 있던 주소에서** 다시 시작한다 — 흐름 도중에 데이터 세트나 날짜를 바꿔도 제자리다. 프레임이 아직 준비 전이면(갈래 A 가 없을 때도) 메시지 대신 새로 띄운다.

### 상태는 URL 해시에

```
#/screens?route=/home&dataset=normal&platform=ios&device=iphone-16&layout=ab
         &now=2026-11-03T21:30:00%2B09:00&latency=1000&fail=/api/v1/reports&scale=1.3&repeat=0
```

새로고침 · 뒤로/앞으로 · 주소 공유가 같은 화면을 다시 연다. 기본값은 적지 않는다. 형식은 `src/shell/hashState.ts`.

### 레이아웃

- **한 화면** — 흐름 시험. 목록을 고르면 그 화면의 프리셋(아래)이 적용된다.
- **A/B 비교** — 같은 라우트 · 같은 데이터. A 는 승인본(`designDraftId: null`), B 는 지금 시안. 「프레임 같이 움직이기」를 켜면 한쪽에서 누른 이동을 다른 쪽이 따라간다.
- **전체 화면** — 라우트마다 작은 실제 프레임. 화면 근처에 온 칸만 붙이고, 동시에 부팅하는 프레임은 4개로 묶는다. 칸을 누르면 한 화면으로.
- **매트릭스** — 같은 라우트를 표의 모든 기기에, 또는 데이터 세트 다섯에.

### 조작 패널

플랫폼 · 기기 · 데이터 세트 · 로그인 상태 · **오늘 다시 쓰기**(켜면 오늘 이미 썼어도 일기를 다시 쓸 수 있다 · 끄면 실제 서버처럼 하루 1번) · **일기 쓰기 다시 시작**(`/retro/confirm` · 직접 쓰기 `/retro/write` 를 새로 띄운다) · 데이터 초기화(`lab:resetData` · 프레임이 못 들으면 셸이 직접 비운다) · **가상 시각**(아침 8:00 · 밤 21:30 · 03:59 = 04:00 하루 경계 직전 · **하루 넘기기 +1일 / 되돌리기 −1일**(시·분 유지) · 지금으로) · 가짜 서버 지연(0 · 1초 · 5초) · 실패시킬 주소 · 글씨 배율(설정의 `textScale` — 프레임이 읽어야 적용된다) · 확대 · 다시 불러오기. 가짜 DB 는 `frameId:datasetId` 로 남으므로 하루를 넘겨도 쓴 기록이 쌓인다.

## 라우트 목록 — `app/` 에서 만든다

```bash
npm run lab:routes                                   # src/shell/routes.generated.ts 다시 쓰기
node expo-lab/scripts/gen-routes.mjs --check         # 어긋나면 실패 (jest 가 부른다)
```

`routes.generated.ts`(자동 · 57개) + `routeMeta.ts`(손 · 제목 · 묶음 · 순서 · 주의) = `routes.ts`. 새 라우트가 `app/` 에 생기면 `src/shell/__tests__/routes.test.ts` 가 「제목 없음」으로 깨진다 — `routeMeta.ts` 에 한 줄을 더한다.

**프리셋** — 바로 열었을 때 의미 있게 보이도록:

| 묶음                         | 세션 | 데이터 세트                     |
| ---------------------------- | ---- | ------------------------------- |
| 스플래시 · 로그인 · 소개     | 없음 | `new-user`                      |
| 온보딩                       | 있음 | `new-user` (서버가 온보딩 필요) |
| 나머지                       | 있음 | 고른 것(처음 `normal`)          |
| 동적 라우트(`[id]`·`[date]`) | —    | id 는 가짜 서버 `sampleParams`  |

흐름으로만 닿거나 가드가 다른 화면으로 넘기는 라우트는 프레임 위에 한 줄로 알린다(`routeMeta.ts` 의 `hint`): `/retro/draft`(대화를 끝내야 열림) · `/retro/confirm`·`/retro/write`(오늘 일기가 있으면 `/retro/talk` 로 — 하루 넘기기로 새 날에서) · `/retro/done`(바람카드는 흐름에서만) · `/diary/[id]`(그 id 가 없으면 보관함으로) · 홈 시트 둘(투명 시트) · `/`(0.8초 뒤 소개로) · `/reading`(5초 뒤 이름으로) · 소개의 감춘 두 장(`schedule` · `letter`).

## 기기 외형 — 실제 기기처럼

표 하나(`src/lab-devices.ts`)를 셸(외형)과 프레임(앱이 받는 안전 영역)이 같이 쓴다. **추정으로 그리지 않는다** — 줄마다 `source` 에 출처를 적었다.

| 기기           | 크기    | 안전 영역 위/아래 | 상태바 | 모서리 | 가림                    | 출처                                                          |
| -------------- | ------- | ----------------- | ------ | ------ | ----------------------- | ------------------------------------------------------------- |
| iPhone SE 3    | 375×667 | 20 / 0            | 20     | 0      | 없음 · 홈 버튼          | useyourloaf                                                   |
| iPhone 13 mini | 375×812 | 50 / 34           | 44     | 44     | 노치 174×35 (환산 근사) | useyourloaf · ScreenCorners · 노치 실물 26.8×5.35mm 환산      |
| iPhone 16e     | 390×844 | 47 / 34           | 47     | 47.33  | 노치 162×32 (환산 근사) | 〃                                                            |
| iPhone 16      | 393×852 | 59 / 34           | 54     | 55     | 섬 126×37.33 @ y11      | useyourloaf · ScreenCorners · Apple Design Resources          |
| iPhone 16 Pro  | 402×874 | 62 / 34           | 54     | 62     | 섬 @ y14 (도출)         | 〃 — 섬 위치는 안전 영역 62 에서 도출                         |
| iPhone 16 Plus | 430×932 | 59 / 34           | 54     | 55     | 섬 @ y11                | 〃                                                            |
| Pixel 8        | 412×915 | 50.29 / 24        | 50.29  | 33.5   | 펀치홀 ⌀27.62 @ y11.24  | Android SDK devices.xml · 스킨 · **Pixel_8 AVD dumpsys 실측** |

- **Galaxy S24 는 뺐다** — 기본 화면 배율 · 펀치홀 · 상태바를 로컬 자료로 확인할 수 없다.
- **Android**: 로컬 SDK 의 공식 에뮬레이터 스킨(`skins/pixel_8` 의 `back.webp` · `mask.webp` · `layout`)을 `npm run lab:skins` 가 `expo-lab/public/device-skins/` 로 복사한다(gitignore — SDK 파일은 담지 않는다). 화면은 스킨 `layout` 의 자리에 놓고, 모서리 · 펀치홀은 `mask.webp` 를 CSS mask 로 뒤집어 깎는다. 스킨이 없으면 같은 수치의 SVG 외형. 상태바 132px · 제스처 막대 63px · 펀치홀 `cutoutSpec` 은 AVD(Android 16 · 제스처 탐색)를 띄워 `dumpsys window` 로 읽었고, 시계 · 아이콘 · 제스처 손잡이(108×3.81dp · 아래 9.9dp) 자리는 그 화면 캡처에서 쟀다.
- **iOS**: 공식 외형 자산이 없어 SVG/CSS 로 그린다 — 정확한 화면 크기 · 화면 모서리 · 섬/노치 · 옆 버튼 · 홈 인디케이터(134×5 · 아래 8) · SE 는 홈 버튼과 각진 화면.
- 상태바(시각은 프레임의 가상 시각 · 12시간제 · 앞자리 0 없음) · 가림 · 하단 막대는 iframe **위에** 그리고 누르기는 통과한다. 글자색은 프레임의 `lab:statusBar` 를 따른다(기본 어두운 글자).

## 검증

```bash
npm run typecheck:expo-lab && npm run lint && npm run format:check
npx jest expo-lab
EXPO_LAB_PORT=8092 npx playwright test expo-lab/e2e/shell.spec.ts expo-lab/e2e/layout-matrix.spec.ts
LAB_FRAMES=1 EXPO_LAB_PORT=8092 npx playwright test expo-lab/e2e   # 프레임(A)·가짜 서버(B)가 합쳐진 뒤
```

`shell.spec.ts` · `layout-matrix.spec.ts` 의 셸 검사(목록 · 해시 왕복 · 뒤로/앞으로 · 프리셋 · 가상 시각 · 기기 크기 · 전체 화면 지연 부팅)는 셸만으로 통과한다. 프레임 안 실제 앱이 필요한 검사(현재 화면 배지 · 요청 기록 · 가로 넘침)는 `LAB_FRAMES=1` 일 때만 돈다.

## 옛 Studio · 홈 비교 — 갈래 D 작업 중

`src/studio/`(Design Studio 2.0 · 상태 비교)와 화면별 Mock 어댑터(`src/claude-home` · `src/current-home` · `src/rest` · `src/archive` · `src/my` · `src/report` · `src/diary` · `src/retro`)는 셸 진입에서 빠졌다. 갈래 D 가 디자인 편집을 실제 프레임 위로 옮기고, 통합 때 이 폴더들과 남은 `src/catalog/`(Studio 가 쓰는 시안 폰 둘)를 지운다. 그때까지 아래 도구는 그대로다.

운영 디자인 반영 — 브라우저 편집은 Git 파일을 바꾸지 않는다. 내보낸 JSON 으로 운영 변경을 준비할 때:

```bash
node expo-lab/scripts/apply-design.mjs path/to/export.json
node expo-lab/scripts/apply-design.mjs path/to/export.json --write
git diff -- src/design/studioApproved.json
npm run typecheck && npm run test:visual
```

첫 명령은 Diff 만 출력하고 `--write` 만 `src/design/studioApproved.json` 을 갱신한다. 기록: [Studio 검증](STUDIO_VALIDATION.md) · [홈 UI 이전](HOME_UI_VALIDATION.md) · [시각 검증](VISUAL_VALIDATION.md) · [이미지 성능](PERFORMANCE_VALIDATION.md)(캡처 축소본 기록 — 캡처는 2026-11-02 에 지웠다).

## 서체

앱과 같은 교보손글씨(`assets/fonts/KyoboHandwriting2025lyb.ttf`)는 프레임 안의 실제 앱이 스스로 불러온다. 셸(도구 UI)은 시스템 서체를 쓴다.

## Vite Lab 삭제 (2026-11-02)

옛 `design-lab/`(Vite + React DOM 캡처 뷰어)을 지웠다. 그 화면 목록 · 캡처를 넘겨받았던 `src/catalog/` 캡처와 `assets/current-app*/` 도 「전 화면」 셸이 실제 앱 프레임으로 대신하면서 지웠다 — 필요하면 삭제 직전 커밋(`2b3da32`)에서 꺼낸다.
