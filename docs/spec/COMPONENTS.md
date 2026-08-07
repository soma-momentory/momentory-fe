<!--
⚠ 반입 스냅샷 — 직접 고치지 말 것. 재반입 절차: docs/spec/SNAPSHOT.md
@generated-from momentory@b850920 (02_디자인시스템/COMPONENTS.md)
@generated-sha256 e5e13baa5682037d2170382a676dc1d11f3a5b828658dfaf6fb8f1dae5d06b50
-->

> ⚠ **이 문서는 원본(01_화면설계 · 136화면) 기준이다 — MVP 값이 아니다 (상류 R-43).**
> P0 스펙 표를 그대로 구현하면 어긋난다 — 실제로 셋이 어긋났다: `Card`(r14 → **r18 · ink 10% · 여백 15/17**) ·
> `ProgressDots`(gap 8 → **6**) · `BackChevron`(글리프 26·ink → **19 · body**).
> **값은 항상 [`momentory.css`](momentory.css) 가 이긴다.** 이 문서는 컴포넌트의 의도·구조 참고용으로만 쓴다.
> 본문이 언급하는 상류 문서(`TOKENS.md` · `컴포넌트-화면.md` · `flows/*.mjs` 등)는 **미반입**이다 —
> 필요하면 담당자에게 요청. 본문의 `TOKENS.md` 링크는 반입 시 일반 텍스트로 보정했다(SNAPSHOT.md 「보정 목록」).

<!-- ─── 여기부터 상류 원본 ─── -->
---
layer: canonical
owner: 파이프라인
generated: null
---

# RN 컴포넌트 인벤토리 — 전 8파트 136화면 기준

> 소스: `05_도구/lib.mjs` 공통 구성요소 + `flows/1-splash.mjs`·`2-onboarding.mjs` 화면 조립 함수.
> 개발은 화면 단위가 아니라 **이 목록의 컴포넌트 단위**로 진행한다. 토큰은 `02_디자인시스템/TOKENS.md`(읽기) · `theme.ts`(import).
> 어느 컴포넌트가 몇 화면을 흔드는지는 `02_디자인시스템/컴포넌트-화면.md` — 손대기 전에 거기부터 본다.
> 핵심 통찰: **온보딩 채팅 컴포넌트군 = 회고 채팅(4. REFLECTION)과 공유** — 한 번 만들면 앱의 두 축을 다 커버한다.
>
> ⚠ 이 문서는 **손으로 쓴다** (생성물이 아니다). 새 파트를 반입하면 컴포넌트를 이어서 기록한다.

## P0 — 첫 주에 만들 것 (온보딩 + 회고 채팅의 뼈대)

| 컴포넌트 | 시안 소스 | 스펙 | 상태/변형 |
|---|---|---|---|
| `ScreenBackground` | `lib.screen()` | 라디얼 그라디언트(`theme.gradients.screen`) + SafeArea. 다크모드에서도 반전 안 함(S0.md) | 기본 / `height` 연장(L1·L2 스크롤) |
| `AppText` | `lib.text()` | Pretendard 강제 + `typography.styles` 역할 프리셋 | display·title·heading·bodyLg·body·bodySm·caption·footnote |
| `AppButton` | `lib.button()` | h54 r14, 라벨 15 bold. 탭 최소 44pt, `motion.press` | primary(**#A25B2C** = `accentFill`, 2026-08-01 보정) / kakao / apple / google(card+stroke) / ghost / **disabled+진행점**(X1-b: opacity .75 + 펄스 점) |
| `Card` | `lib.card()` | fill `card`, stroke primary 30% 1px, r14 | 기본 / 안내(noticeCard: bulletRow 포함) / 텍스트만(textCard) |
| `ChatLayout` | `buildChatKids`·`chatScreen` | **하단 고정 스택**: 아바타+버블 ↑ / 인터랙션 / 힌트 한 줄 / CTA. 대화는 위로 밀려 올라감(160ms), **단계가 바뀌면 비움**(RULES.md) | 질문 / 반응(buildReactionKids: 답버블→답장→결과카드) |
| `BabaBubble` | `bubble()` | 왼쪽 크림 카드, 테두리 없음. `motion.bubble`(220ms, 연속 +90ms 스태거) | 질문 / 되돌려주는 한 줄(반응 강약 4단계 — RULES.md 표) |
| `AnswerBubble` | `answerBubble()` | 오른쪽 잉크색 버블. 칩→버블 morph 180ms. **답 안 해도 버블 남김**("알려주고 싶지 않아요") | — |
| `Avatar` | `avatar()` | 52px 원형, 기본 `얼굴_클로즈업/01_기본표정` | 표정 교체 prop (회고 채팅에서 감정 반응용) |
| `TypingDots` | `typingDots()` | 답장 후 자동 전진(~1.2s) 대기 표시 | **→ 회고 채팅의 AI 응답 로딩 상태로 재사용** (가장 중요한 재사용) |
| `ChipFlow` | `chipFlow`·`estChipWidth` | 줄바꿈 플로우 배치, gap 8, 행 높이 52. 선택 = **테두리 색+굵기(2px) 동시 변경**(색만으로 표시 금지) | 미선택 / 선택 / 복수 선택+힌트("N개 선택됨 · 다시 누르면 취소돼요") |
| `InputRow` | `inputRow()` | 04 닉네임·08 시간 공용. 값/placeholder/카운터("2/10")/지우기 ×(글리프 19~22px + hitSlop 44) | 비어있음 / 입력 중 / 확정 / 지운 직후 안내줄 |
| `ProgressDots` | `progressDots()` | 점 6개, 활성만 6→18px pill. **숫자·"4/6" 표기 금지**. 상단 오른쪽 고정 | activeIndex / 없음(R·완료 화면) |
| `BackChevron` | `backChevron()` | ‹ 44pt, 상단 왼쪽. 첫 질문엔 없어도 **자리 예약**(진행점 y 고정). Android 시스템 뒤로와 동일 동작 | 표시 / 자리만 |

## P1 — 예외·상태·법적 (SPLASH 계열)

| 컴포넌트 | 시안 소스 | 스펙 | 비고 |
|---|---|---|---|
| `BannerBar` | `bannerBar()` | 상단 바 아래 한 줄 고정 자리, `#F1E7D6` 둥근 카드 + 점. E1(재개)·E3(오프라인) 공용 형식 | 상태 알림은 **이 한 곳에서만** 나온다(RULES.md) |
| `ExceptionLayout` | `exceptionScreen()` (1-splash) | 이미지(원형96/자유150) + 제목 + 본문 + 안내카드 + 버튼 1~2개 스택. X1~X8·E0-b 전부 이 골격 | `motion.notice`. 흔들기·붉은 점멸 금지 |
| `NoticeCard` | `noticeCard()` | bulletRow 1줄 안내 카드 | X 화면들 |
| `LegalSheet` | `legalSheet()` | 헤더(뒤로 원형 44) + **한눈에 보기 카드** + 조문(①②③) + 시행일 + 닫기 | L1·L2. 내용은 docs가 원본 |
| `SplashLockup` | `lockup()`·`wordmarkBlock()` | 광원(blur)+발그림자+바바+먼지3+워드마크(34, 자간 .145em, medium)+연결선 44×1+슬로건 | `motion.breathe`(1.015 — 1.02 아님). S0/S0-b/X2 재사용 |
| `ProgressTrack` | S0-b 진행 바 | 96×3 트랙 + 44 필, 하단 고정 | 대기 문구 2종(조건부 교체) |
| `OtherRow` | `otherRow()` | 기타 칩 ON 시 인라인 밑줄 입력(0/12) + 입력 전 CTA 잠금 + 경고 한 줄("기타에 무엇을 적을지 알려주세요") | 06·07 공용. **모달 금지** |
| `BulletRow` / `KVRow` | lib | 카드 내부 행 2종 | 법적·안내·요약 |

## P1.5 — 파트 3~8 공용 (소스: `05_도구/flows/ui.mjs` — 클래스 어휘를 노드로 옮긴 것)

| 컴포넌트 | ui.mjs | 쓰이는 곳 |
|---|---|---|
| `TabBar` | `tabbar(active, frameH)` | 홈·쉼터·보관함·리포트·마이 5탭. 활성 primary 600 / 비활성 legal 500 |
| `ScrollArea` | `scrollArea(y,h,blocks)` | **HTML `.stack` 대응 — clip 프레임.** 넘치는 내용이 하단 고정 요소를 침범하지 않게 한다. 긴 화면은 전부 이걸로 |
| `EmotionPill` | `epill(id)` | 감정 9종 알약(점+이름). 배경 base 22% · 글자 ink |
| `EmotionGrid` | `emotionGrid` (3-home) / C3·A4 | 3×3 감정 선택. 선택 = 테두리 2px + 배경 |
| `ScheduleRow` / `MemoRow` / `NotiGroup` | 동명 | 오늘의 하루 목록 — 체크·감정·메모·일정에 붙는 알림(세로선) |
| `Bubble` / `BubbleMe` / `Typing` | `bub` `bubMe` `typing` | 회고 대화. 온보딩과 같은 문법 |
| `InputPill` | `inputPill` | 회고·대나무숲 하단 입력 |
| `Sheet` | `sheet(name,h,children)` | 딤 + 바텀시트(표면 card). 12-c·C1-b·E12·R3-b·E22 |
| `SegBar` | `segBar` | 보관함/리포트 탭, 일기 두 관점 전환 |
| `StatTiles` / `Metrics` | `statTiles`(5-rest) · `metrics`(7-report) | 지표 3~4칸 (값·델타·이름) |
| `WarnLine` | `warnLine` | 상태 알림 한 줄(accentWash). 예외 화면 상단 |
| `RowCard` | `rowCard`(8-my) | 설정 행 묶음 — 라벨+값+› 또는 토글 |
| `SpaceTile` / `SpRow` | `spaceGrid` · `spRow` | 쉼터 공간 타일·행 |
| `MonthCalendar` | `monthCalendar`(6-archive) | 보관함 캘린더 — 날짜 아래 감정 점 |
| `BambooPost` | `bambooPost`(5-rest) | 대나무숲 글 + 토닥토닥 1종 |

## P2 — 개별 화면 전용

| 컴포넌트 | 시안 소스 | 비고 |
|---|---|---|
| `TimeWheelSheet` | `timeWheelSheet()` | 08-b 시간 선택 — 시안은 참고 목업. 구현은 네이티브 피커/커스텀 휠 + `motion.sheet`. **기본값 없는 휠**(RULES: 출시 후 데이터로 프리셋 칩 재검토) |
| `ResultCard` | `resultCard()` | 09-b 오늘 일정 프리뷰 등 결과 요약 카드 |
| `DemographicsRow` | `demographics*()` | 05 나이(숫자 2자리)+성별 칩+"알려주고 싶지 않아요" |
| 완료·복귀 조립 | 10·10-b·R | 위 컴포넌트 조합. R은 진행점·‹ 없음(도착 화면) + 공백 일수 문구(숫자 예외 허용) |

## 만들지 않는 것 (OS가 그림)

- **권한 팝업·알림**(P1~P3) — `iosAlertCard`/`androidDialog`는 스펙 문서용 목업. 실제는 OS 다이얼로그 호출만. 커스텀 금지(RULES.md)
- 상태바·홈 인디케이터 — 시안 전용
- iOS 알럿 서체·Android Roboto — 지정하지 않음

## 공통 규칙 (전 컴포넌트)

0. **감정은 `theme.emotions` 9종만** — id 1~9(불안함·우울함·화남/답답·행복함·막막함·무기력·피곤함·뿌듯함·평온함). 색은 항상 이름과 함께 쓰고, 이모지 척도로 대체하지 않는다
   - **정본은 `05_도구/lib.mjs` 의 `EMO`** — 읽기는 `TOKENS.md` 「감정 9종」(상류 생성물 — 미반입). 값을 바꾸려면 `lib.mjs` 를 고친다
1. 색·크기·시간을 하드코딩하지 않는다 — 전부 `theme.ts` 참조
2. 탭 대상 44pt+, 선택지 52pt, **칩 행 52pt · 칩 간격 8pt** (`theme.touch`)
3. 모든 모션은 `theme.motion.spec.*` 토큰 사용, **Reduce Motion 시 opacity 120ms만**
4. 오류·거부·실패 = 한 줄 안내로 흡수. 모달·재시도 버튼·경고 아이콘 금지 (E0-b 세션 실패만 예외)
5. 숫자로 압박하지 않는다 — 진행률·남은 개수 표기 금지 (복귀 공백 일수만 예외)
6. 거부해도 사용자가 고른 값은 버리지 않는다 (예: 알림 거부 시 `retroTime` 저장 + `notifyGranted=false`)
7. **선택 상태를 색만으로 표시하지 않는다** — 테두리 색과 굵기(2px)를 동시에 바꾼다. 색각 이상·저대비 환경에서 선택 여부가 사라지지 않게

> 이 절이 **인터랙션 불변 규칙의 정본**이다. 상류에 보내는 `06_운영문서/클로드디자인/핸드오프지침.md §7` 은 여기를 참조한다 — 같은 규칙을 두 문장으로 적지 않는다.
