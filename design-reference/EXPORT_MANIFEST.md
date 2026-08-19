# EXPORT_MANIFEST

Momentory MVP 디자인 reference 패키지예요.
**production 코드가 아니에요** — 로컬 React Native + Expo 구현 시 확정된 디자인과 UI 구조를 정확히 재현하기 위한 참조 자료예요.

- **SSOT는 `design.md`** 하나예요. 색·타이포·스페이싱·컴포넌트 스펙·화면별 상태 규칙의 최종 기준이에요.
- `styles/momentory-tokens.css`는 **reference**예요. RN 토큰을 구현할 때 값 검증용으로만 쓰고, 값이 `design.md`와 다르면 `design.md`를 따르세요.
- 이 패키지는 디자인 확정 상태를 **그대로 보존**한 것이에요. 리팩터링·중복 제거·구조 변경을 하지 않았어요.

---

## 1. 폴더 구조

```text
momentory-design-reference/
├── design.md                      ← SSOT (최종 기준)
├── EXPORT_MANIFEST.md             ← 이 파일
│
├── 화면 소스 (루트, .dc.html 9개)
│   Login / Onboarding / Home Sample / Schedule /
│   Diary / Rest / Archive / Report / My
│
├── 디자인 시스템 문서 (루트, .dc.html 4개)
│   00 Foundations / 01 Core Components /
│   02 Momentory Components / 03 Patterns
│
├── styles/
│   └── momentory-tokens.css       ← Momentory 색 토큰 (reference)
│
├── _ds/wanted-design-system-.../tokens/
│   ├── fig-tokens.css             ← Wanted 원본 488 변수
│   ├── typography.css             ← 19단 타입 스케일 토큰 + .wds-* 클래스
│   ├── foundations.css            ← radius · elevation · hairline · safe area
│   ├── aliases.css                ← Wanted semantic alias 층
│   └── fonts.css                  ← 폰트 스택 (CDN @import)
│   └── ../styles.css              ← 위 5개를 @import 하는 진입점
│
└── assets/icons/                  ← 실제 사용 아이콘 26개 SVG
```

화면이 파일마다 여러 프레임으로 들어 있어요 — 요청대로 억지로 분리하지 않았어요.
`.dc.html`은 Design Component 형식이에요: `<style>` 블록(테마 토큰) + 마크업 + 하단 `<script data-dc-script>`(상태 로직). 브라우저로 바로 열어 볼 수 있지만 `support.js` 런타임을 제외했으므로 **소스 읽기 전용**이에요. 렌더해서 보려면 원본 프로젝트에서 확인하세요.

---

## 2. 화면 이름 → 소스 파일

| 화면 | 파일 | 프레임 |
| --- | --- | --- |
| 로그인 | `Login.dc.html` | 라이트, 다크 |
| 온보딩 (대화형) | `Onboarding.dc.html` | 03 첫 메시지 / 04-a·b 닉네임 / 05-a·b 나이 / 05-c·d 성별 / 06-a·b 관심 분야 / 07-a·b 쉬는 방법 / 08-a 시간 미선택 / 08-b 휠 시트 / 08-c 완료 / 09 일정 참고 / 10 완료 |
| 홈 | `Home Sample.dc.html` | 라이트, 다크 |
| 일정 추가 / 수정 / 삭제 / 순서 변경 | `Schedule.dc.html` | 4-1 추가 / 4-2 ⋮ 메뉴 / 4-3 수정 / 4-4 삭제 확인 / 4-5 꾹 누름 / 4-6 이동 중 / 4-7 체크로 완료 |
| 일기 시작 전 일정 확인 | `Diary.dc.html` | ①-a 기본 / ①-b 일정 많음 |
| 감정 선택 | `Diary.dc.html` | ②-a 선택 전 / ②-b 선택 후 |
| 대화형 일기 | `Diary.dc.html` | ③-a 시작 / ③-b 입력+키보드 / ③-c 전송 후 / ③-d 선택형 / ③-d2 직접 쓰기 / ③-e 척도(슬라이더) / ③-f 누적 / ③-g 마지막 |
| 일기 생성 중 | `Diary.dc.html` | ④-a |
| 완성된 일기 확인 | `Diary.dc.html` | ④-b |
| 일기 직접 수정 | `Diary.dc.html` | ④-c |
| 저장 완료 | `Diary.dc.html` | ④-d1 행동카드 없음 / ④-d2 행동카드 있음 |
| 쉼터 진입 | `Rest.dc.html` | R1 |
| 행동카드 (수행 전 / 직후 / 저장 후) | `Rest.dc.html` | R2-a / R2-b / R2-c |
| 행동카드 누적 상세 | `Rest.dc.html` | R3 |
| 보관함 캘린더 | `Archive.dc.html` | A1 |
| 보관함 리스트 | `Archive.dc.html` | A2 |
| 일기 상세 | `Archive.dc.html` | A3 |
| 주간 리포트 | `Report.dc.html` | W1 |
| 마이 기본 | `My.dc.html` | M1 |
| 알림 설정 | `My.dc.html` | M2 |
| 기본 정보 목록 | `My.dc.html` | M3 |
| 닉네임 / 나이 / 성별 / 관심 분야 / 쉬는 방법 수정 | `My.dc.html` | M4 / M5 / M6 / M7 / M8 |

**날짜별 행동카드**는 R2의 하단 캘린더에서 날짜를 선택하는 방식이에요 (별도 화면 없음).
**행동카드 생성 없음/있음** 분기는 `Diary.dc.html` ④-d1 / ④-d2예요.

---

## 3. 공통 컴포넌트 → 위치

Wanted 컴포넌트를 `<x-import component-from-global-scope="WantedDesignSystem_cd71f6.…">`로 마운트해서 써요.
**구현 본체(`_ds_bundle.js`)는 요청대로 제외했어요.** 각 컴포넌트의 스펙은 `design.md` 6~11장과 `01 Core Components.dc.html`에 정리돼 있어요.

| 컴포넌트 | 출처 | 스펙 문서 | 사용 예 |
| --- | --- | --- | --- |
| Button / CTA | Wanted `Button` | `design.md` §6, `01 Core` | 전 화면 |
| Icon Button | Wanted `IconButton` | `01 Core` | 알림·전송·⋮·월 이동 |
| Text Button | Wanted `TextButton` | `01 Core` | ＋ 추가, 전체보기, 건너뛰기 |
| TextInput | Wanted `TextField` / `TextArea` | `design.md` §7 | 마이 수정, 일기 편집 |
| 입력 pill (커스텀) | 각 화면 인라인 | `design.md` §7 | 온보딩 답장, M4·M5 |
| 채팅 입력 (커스텀) | `Diary.dc.html` | `design.md` §7 | ③-b, ③-d2 |
| Card | 인라인 (Elevated + hairline) | `design.md` §8 | 홈·쉼터·리포트·일기 |
| Chip / Choice | Wanted `ChipFilter` | `design.md` §9 | 온보딩, 감정, 보관함 필터 |
| List Cell | Wanted `ListCell` | `01 Core` | 일정, 마이, 보관함 |
| Header | Wanted `TopNavigation` + `StatusBar` | `design.md` §10 | 전 화면 |
| Bottom Navigation | Wanted `BottomNavigation` | `design.md` §10 | 홈·쉼터·보관함·리포트·마이 |
| Modal | Wanted `Modal` | `design.md` §11 | 일정 삭제 확인 |
| Bottom Sheet | Wanted `BottomSheet` | `design.md` §11 | 감정, 시간 선택, 알림 설정 |
| Menu | Wanted `Menu` | `01 Core` | 일정 ⋮ |
| Section Header | Wanted `SectionHeader` | `01 Core` | 홈 오늘 일정, 마이 섹션 |
| Toast | Wanted `Toast` | `01 Core` | 일정 추가·삭제 |
| Loading (스피너) | Wanted `Circular` | `01 Core` | 일기 생성 중 |
| Skeleton | Wanted `Skeleton` | `01 Core` | 미사용 (카탈로그만) |
| Switch / Checkbox / Radio | Wanted | `01 Core` | 일정 완료, 시트 선택 |
| Segmented | Wanted `Segmented` | `01 Core` | 미사용 (칩으로 대체) |
| **Emotion selector** | 커스텀 | `02 Momentory` 4-2 | `Diary` ②, 홈 감정 시트 |
| **Slider** | 커스텀 | `01 Core` 3-3, `02 Momentory` 4-7 | `Diary` ③-e |
| **Chat bubble** | 커스텀 (인라인 `<p>`) | `design.md` §4, `02 Momentory` 4-4~4-6 | `Onboarding`, `Diary` |
| **Send button** | Wanted `IconButton` + `send` | — | `Diary`, `Rest` |
| **Calendar** | 커스텀 | — | `Rest` R2, `Archive` A1 |
| **상태 아이콘** | `assets/icons/` | §5 | 전 화면 |

---

## 4. 중복된 UI 구현 (통합하지 않고 그대로 내보냈어요)

| 중복 | 위치 | 비고 |
| --- | --- | --- |
| 배경 격자 SVG `<pattern>` | 13개 파일 전부 (`obcGrid`·`schGrid`·`myGrid`… id만 다름) | 32px 정격자, 값 동일. RN에서는 컴포넌트 하나로 만드세요 |
| 테마 토큰 `<style>` 블록 | 13개 파일 전부 | 값 동일 → `styles/momentory-tokens.css`로 추출해 뒀어요 |
| 채팅 말풍선 | `Onboarding.dc.html`, `Diary.dc.html` | 스펙 동일(질문 `16 16 16 4` / 답변 `16 16 4 16`), 각각 인라인 |
| 캘린더 그리드 | `Rest.dc.html` R2, `Archive.dc.html` A1 | 표시 규칙이 달라요 (쉼터: 수행 dot / 보관함: 감정 도트) |
| 세로 휠 피커 | `Onboarding.dc.html` 08-b, `My.dc.html` M2 | 로직 동일 (`wheelRef` + 40px 행 + scroll-snap) |
| 감정 3×3 선택 | `Diary.dc.html` ②, `Home Sample.dc.html` 시트, `02 Momentory` 4-2 | 홈은 시트 안, 일기는 전체 화면 |
| 키보드 블록 (291px) | `Schedule.dc.html`, `Diary.dc.html`, `My.dc.html` | 시각 재현용 목업 — RN에서는 실제 키보드 사용 |
| 슬라이더 | `01 Core`, `02 Momentory`, `Diary.dc.html` ③-e | 트랙 6px + thumb 24px 동일 |

---

## 5. Asset → 사용 화면

`assets/icons/` — Wanted 아이콘 세트에서 **실제 사용 중인 26개만** 추출했어요 (전체 299개 중).
24×24 그리드 · `fill="currentColor"` · 색은 CSS로 지정해요.

| 파일 | 용도 | 사용 화면 |
| --- | --- | --- |
| `arrow-left.svg` | 뒤로가기 | Onboarding, Diary, Rest, Archive, My |
| `close.svg` | 닫기 (플로우 종료) | Schedule, Diary |
| `chevron-right.svg` | 행 진입 표시 | Rest, Archive, Report, 마이 전체 |
| `chevron-left.svg` | 이전 월·주 이동 | Rest, Archive, Report |
| `home.svg` | 탭바 — 홈 | 탭 있는 전 화면 |
| `heart.svg` | 탭바 — 쉼터 | 탭 있는 전 화면 |
| `folder-job.svg` | 탭바 — 보관함 | 탭 있는 전 화면 |
| `document.svg` | 탭바 — 리포트 / 일기 지표 | 탭 있는 전 화면, Report |
| `nav-my-page.svg` | 탭바 — 마이 / 기본 정보 수정 행 | 탭 있는 전 화면, My M1 |
| `bell.svg` | 알림 (날짜 우측) / 알림 설정 행 | Home, My |
| `plus.svg` | 일정 추가 | Home, Schedule |
| `pencil.svg` | 수정 | Schedule |
| `trash.svg` | 삭제 | Schedule |
| `more-vertical.svg` | ⋮ 더보기 | Home, Schedule, Archive |
| `handle.svg` | 순서 변경 핸들 | Schedule |
| `send.svg` | 전송 (채팅·느낀 점) | Diary, Rest |
| `check.svg` | 체크 | 00 Foundations |
| `circle-check.svg` | 완료 상태 / 저장 완료 | Onboarding, Home, Diary, Rest, Archive |
| `circle-info.svg` | 정보 안내 블록 | Onboarding 09 |
| `circle-exclamation.svg` | 오류 안내 | 01 Core, 02 Momentory |
| `calendar.svg` | 일정·캘린더 | Onboarding, Archive, Report |
| `clock.svg` | 시간 / 미수행 상태 | Onboarding, Rest |
| `search.svg` | 검색 | Archive A2 |
| `list-ordered.svg` | 리스트 뷰 스위처 | Archive |
| `logo-kakao.svg` | 카카오 로그인 | Login |
| `logo-apple.svg` | Apple 로그인 | Login |

**이미지 asset 없음** — 캐릭터 일러스트는 요청대로 전부 제거했고, 로고·스플래시·앱 아이콘 이미지는 제작하지 않았어요. 브랜드는 텍스트 워드마크(`모멘토리`, Title 2)예요.
Google 로그인 마크만 예외로 `Login.dc.html` 안에 4색 인라인 SVG로 들어 있어요 (Wanted 세트에 없어서 공식 마크 사용).

---

## 6. 폰트 (파일 제외 · 정보만)

| 용도 | Family | Weight | 비고 |
| --- | --- | --- | --- |
| 전체 UI | **Pretendard** (`Pretendard JP`) | 400 Regular · 500 Medium · 600 SemiBold · 700 Bold | 한글·영문·일문. Light·Thin 미사용 |
| 브랜드 (미사용) | Wanted Sans | 400~700 | 현재 화면에서 쓰지 않아요 |
| 코드·토큰값 (미사용) | SF Mono | — | 문서용 |

- 본문 기본 웨이트는 **Medium 500**이에요. Regular 400은 입력값·플레이스홀더·읽기 본문에만 써요.
- 현재 `tokens/fonts.css`가 **jsDelivr CDN**에서 `@import`해요 (SIL OFL). RN에서는 Pretendard `.ttf`/`.otf`를 직접 받아 `expo-font`로 등록해야 해요.
- 타입 스케일 11단은 `design.md` §2, 원본 토큰은 `tokens/typography.css`에 있어요.

---

## 7. 웹 전용 — RN에서 그대로 못 쓰는 부분

| 항목 | 웹 구현 | RN 대응 |
| --- | --- | --- |
| hairline 경계 | `box-shadow: inset 0 0 0 1px` | `borderWidth: StyleSheet.hairlineWidth` + `borderColor` |
| 스크림 오버레이 | 절대 위치 `<span>` + opacity | `Pressable` 의 `android_ripple` / `pressed` 스타일 |
| 배경 격자 | 인라인 SVG `<pattern>` | `react-native-svg` `Pattern` 또는 타일 이미지 |
| `.wds-*` 타입 클래스 | CSS 클래스 | `StyleSheet` 텍스트 프리셋 |
| CSS 변수 `var(--…)` | `:root` 커스텀 프로퍼티 | 테마 객체 + Context |
| `data-theme="dark"` 스코프 | CSS 속성 선택자 | `useColorScheme()` + 테마 분기 |
| `scroll-snap-type` 휠 피커 | CSS 스냅 | `ScrollView` + `snapToInterval={40}` |
| `text-overflow: ellipsis` | CSS | `numberOfLines={1}` |
| 키보드 목업 (291px) | 정적 마크업 | 실제 키보드 + `KeyboardAvoidingView` |
| Safe Area 34px 고정값 | 고정 `<div>` | `react-native-safe-area-context` |
| 375×812 프레임 | 고정 폭 | 실제 화면 폭 (반응형 확인 필요) |
| `transition-property` 전역 규칙 | CSS 회피책 | 불필요 (웹 엔진 이슈였어요) |
| `<x-import>` 컴포넌트 마운트 | DC 런타임 | 해당 없음 — 스펙만 참조 |

---

## 8. 외부 dependency

| 항목 | 종류 | 상태 |
| --- | --- | --- |
| Pretendard / Wanted Sans | 폰트 CDN (jsDelivr) | 유일한 외부 URL. RN에서는 로컬 등록 필요 |
| Wanted Design System | 디자인 시스템 (CC BY 4.0, 원티드랩) | 구현 본체 제외. 토큰 CSS와 스펙 문서만 포함 |
| React / DC 런타임 (`support.js`) | 렌더 런타임 | **제외** — RN에서 불필요 |

**외부 URL asset은 폰트 2개뿐이에요.** 이미지 CDN 참조는 없어요.

---

## 9. 제외한 파일

| 파일 | 이유 |
| --- | --- |
| `_ds/…/_ds_bundle.js` (632KB) | Wanted 59개 컴포넌트 전체 구현. RN에서 직접 사용 불가 → 사용 아이콘 26개만 SVG로 추출 |
| `_ds/…/_ds_manifest.json` (144KB) | 컴포넌트 메타데이터 |
| `_ds/…/_adherence.oxlintrc.json` (76KB) | 린트 규칙 |
| `_ds/…/readme.md` (23KB) | Wanted 시스템 가이드 (필요하면 별도 요청) |
| `support.js` (69KB) | DC 웹 런타임 |
| `uploads/momentory-mvp.fig` (3.3MB) | 원본 Figma 파일 |
| `uploads/*.png` | 검토용 스크린샷 |
| `fig-extract/` | .fig 디코딩 중간 산출물 |
| `.thumbnail` | 프로젝트 썸네일 |
| `04 Playground.dc.html` | 초기 조립 실험용. 확정 화면은 `Home Sample` 이후로 대체됐어요 |

---

## 10. `design.md` 와 현재 디자인의 불일치

전역 검수(2026-08-19)에서 3건을 찾아 **모두 수정 완료**했어요. 현재 남은 불일치는 없어요.

| 검수 항목 | 결과 |
| --- | --- |
| 프레임 폭 | 로그인·홈이 380px이었어요 → 전 화면 **375** 통일 ✅ |
| 비활성 색 | 로그인이 옛 베이지 `#ECE4D4` → **`#DDE7E0` / `#A3B5A9`** 초록 축 통일 ✅ |
| 버튼 활성 전환 | `var()` 배경 트랜지션이 멈춰 활성 색이 안 보였어요 → 13개 파일 전역 규칙으로 해결 ✅ |
| 좌우 패딩 20 | 전 화면 일치 ✅ |
| 카드 radius 16 / 프레임 28 | 전 화면 일치 ✅ |
| CTA 높이 48 | 전 화면 일치 ✅ |
| 격자 농도 (라이트 7% / 다크 5%) | 전 화면 일치 ✅ |
| 탭바 위치 (`paddingBottom: 9`) | 탭 있는 전 화면 일치 ✅ |
| 아이콘 세트 | Wanted 세트만 사용, 없는 글리프 추측 없음 ✅ |

**알아 두실 점 (불일치가 아니라 의도적 차이)**
- 라이트·다크 병행 화면은 **로그인·홈 2개**뿐이에요. 나머지는 라이트만 있고, 다크 값은 `design.md` §1과 토큰 CSS에 정의돼 있어요.
- 감정 팔레트 9색은 **도트·캡슐에만** 써요. 감정 선택 칩은 브랜드 초록으로 통일했어요 (검토 과정에서 확정).
- 예외 상태(빈 보관함, 네트워크 실패, 로그인 실패, 저장 실패 등)는 설계하지 않았어요 — `design.md` 마지막 절 참조.
- 실제 로고 파일·앱 아이콘·스플래시 이미지가 없어요. RN 구현 전에 별도 제작이 필요해요.

---

## 11. 권장 구현 순서

`design.md` 마지막 절과 동일해요.

공통 토큰·컴포넌트(Button · Input · Card · Chip · Header · BottomNav · Modal/Sheet)
→ 로그인 → 온보딩 → 홈·일정 → 일기 진입 → 대화 → 일기 생성 → 쉼터·행동카드 → 보관함 → 리포트 → 마이

화면부터 찍기보다 **토큰과 공통 컴포넌트를 먼저 깔고** 화면을 조립하세요. 그래야 화면마다 값이 어긋나지 않아요.
