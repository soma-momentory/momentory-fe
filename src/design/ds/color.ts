import type { EmotionId } from "@/features/emotion/model/emotion";

/**
 * Momentory DS — 색. 정본은 [`docs/DESIGN.md`](../../../docs/DESIGN.md) §1.
 *
 * **컴포넌트는 semantic 층만 참조한다.** 화면마다 새 값을 만들지 않는다 —
 * 그것이 이 파일이 하나뿐인 이유다.
 *
 * **다크 모드는 없다** (2026-08-20 결정 N1 · `PLAN.md` A-2). `DESIGN.md` §1 의 다크
 * 팔레트는 구현하지 않는다 — `useColorScheme()` 분기를 만들지 말고, 테마 객체를
 * 두 벌로 만들지도 않는다. 나중에 켤 일이 생기면 이 파일이 갈리는 지점이다.
 *
 * ## ⚠ 시안에서 이탈한 값 — 대비 검수 결과 (2026-08-20)
 *
 * `docs/spec/RULES.md` 「접근성」과 WCAG 2.1 AA(본문 4.5 · 비텍스트 3.0)로
 * 전 조합을 실측했더니 **시안 값 여섯이 미달**이었다. 색조·채도는 유지하고 명도만
 * 내려 보정했고, **세 배경(`normal` `alternative` `elevated`) 전부에서** 기준을 넘는다.
 *
 * | 역할                 | design.md | 최저 대비 | 채택        | 보정 후  |
 * | -------------------- | --------- | --------- | ----------- | -------- |
 * | Label/Alternative    | `#8C7A66` | 3.67      | `#7C6C5B`   | **4.50** |
 * | Interaction/Inactive | `#C2BAAA` | 1.72      | `#796D57`   | **4.52** |
 * | Status/Negative      | `#CF6247` | 3.67      | `#B94C30`   | **4.52** |
 * | Status/Cautionary    | `#D98A3F` | 2.63      | `#A15E20`   | **4.52** |
 * | Status/Positive      | `#6F9A58` | 2.90      | `#6D9757`   | **3.01** |
 * | Primary/Normal       | `#7C9E86` | 2.64      | `#6F947A`   | **3.02** |
 *
 * **주 버튼 면은 `primary.heavy` 다.** `DESIGN.md` §6 은 배경 `#7C9E86` + 라벨
 * `#FFFDF8` 을 지정하는데 그 조합이 **2.91** 이라 large·bold 기준(3.0)에도 못 미친다.
 * 흰 글자가 얹히는 초록 면은 `primary.heavy #56755F`(**5.03**) 하나뿐이다 —
 * 이 저장소가 오래 지켜 온 규칙과 같다(`CLAUDE.md` 규칙 2: 「primary 는 장식 전용,
 * 글자가 얹히는 면은 deep」). `primary.normal` 은 **선택 링·아이콘·틴트 전용**이다.
 *
 * ## 기준을 못 넘지만 그대로 두는 것 — 이유가 있다
 *
 * - `label.assistive`(2.08 · 플레이스홀더) — **플레이스홀더에 다른 데서 못 얻는
 *   정보를 담지 않는다**는 조건으로 둔다. 라벨·헬퍼가 늘 함께 있어야 한다
 * - ~~`label.disabled` + `interaction.disabled`(1.70) — WCAG 비활성 컨트롤 예외~~
 *   → **되돌렸다.** 실기기에서 라벨이 아예 안 보였다. `label.disabled` 를 보정했다(위 표 참조)
 * - **감정 9색의 원색 도트·링**(1.46~3.31) — 일곱이 3:1 미만이다. 감정을 **색만으로
 *   판단하게 하지 않고 이름을 늘 함께 쓴다**(`RULES.md` 「보관함」)는 규칙이 이걸
 *   떠받친다. 이름 없는 감정 도트를 만들면 그때 이 예외가 깨진다
 */

/** 면 — 앱 기본 · 구분 영역 · 카드/시트/입력 */
export const background = {
  normal: "#F7F4ED",
  alternative: "#F7F1E7",
  elevated: "#FFFDF8",
} as const;

/**
 * 글자. **여섯 단이고 새로 만들지 않는다.**
 * `strong` 큰 타이틀 · `normal` 기본 · `neutral` 본문 보조 · `alternative` 설명·메타·헬퍼 ·
 * `assistive` 플레이스홀더 · `disabled` 비활성 라벨.
 */
export const label = {
  strong: "#241F19",
  normal: "#3C2E22",
  neutral: "#6B5C4A",
  /** ⚠ 시안 `#8C7A66`(3.67) 보정 — 설명·헬퍼는 읽혀야 하는 글자다 */
  alternative: "#7C6C5B",
  /** ⚠ AA 미달(2.08). 플레이스홀더 전용 — 여기에만 있는 정보를 담지 않는다 */
  assistive: "#B9B2A2",
  /**
   * ⚠ 시안 `#A3B5A9`(1.70) 보정 — **비활성 버튼의 글자가 실제로 읽히지 않았다.**
   * 에뮬레이터에서 「다음」·「확인」이 **글자가 없는 것처럼** 보인다는 보고를 받고 고쳤다.
   *
   * WCAG 는 비활성 컨트롤을 대비 기준에서 **면제**하지만, 그것은 「기준을 안 재도 된다」이지
   * 「안 보여도 된다」가 아니다. **다음에 무엇이 오는지 보이게 두려고** 비활성 버튼을
   * 남기는 것인데(`04.md`), 라벨이 사라지면 그 이유가 통째로 없어진다.
   *
   * 비활성이라는 사실은 **면**(`interaction.disabled` 연한 초록)이 이미 말한다 —
   * 활성은 진한 초록 면에 흰 글자다. 그래서 글자를 읽히게 해도 둘이 헷갈리지 않는다.
   */
  disabled: "#5D7364",
  /** 색 면 위 글자 — `primary.heavy`(5.03) · `status.negative`(4.99) 에서만 통과 */
  onFill: "#FFFDF8",
} as const;

/**
 * 브랜드 초록.
 * - `normal` 선택 링 · 아이콘 · 틴트 바탕 — **글자를 얹지 않는다**(흰 글자 2.9)
 * - `strong` press (그런데 `DESIGN.md` §6 은 press 에서 fill 을 바꾸지 않고
 *   스크림을 얹는다 — `overlay.press*` 를 쓴다. 이 값은 예외용으로만 둔다)
 * - `heavy` **글자 · 흰 글자가 얹히는 면**(주 CTA)
 */
export const primary = {
  /** ⚠ 시안 `#7C9E86`(2.64) 보정 — 선택 링이 배경에서 보여야 한다 */
  normal: "#6F947A",
  strong: "#688A72",
  heavy: "#56755F",
} as const;

/** 완료·하이라이트. 글자를 얹으면 `label.strong`(10.98) */
export const secondary = { normal: "#F3D07A" } as const;

export const status = {
  /** 완료 체크 — **아이콘 전용**(3.01). 글자로 쓰지 않는다 */
  positive: "#6D9757",
  /** 현재 쓰는 자리가 없다. 쓰게 되면 글자로도 통과한다(4.52) */
  cautionary: "#A15E20",
  /** 삭제 — 글자(4.52)와 **흰 글자가 얹히는 면**(4.99) 둘 다 이 값 하나다 */
  negative: "#B94C30",
} as const;

/**
 * 보관함 달력의 **일정 점** — 연한 연두 (2026-09-07 · 사용자가 색을 지정했다).
 * 브랜드 초록(sage `primary`)보다 노랗고 훨씬 밝아 감정 얼굴 위에서 섞이지 않는다.
 *
 * ⚠⚠ 배경 대비 **1.59**(카드 면)다(사용자가 고른 값에서 2026-09-07 에 한 톤 낮춘 것).
 * 보관함은 여기에 **80% 를 얹어** 더 옅게 쓴다(`withAlpha` · 실효 1.45).
 * `emotion` 10색(1.46~3.31)의 아래쪽과 같은 자리라 **약한 시각 신호**다 —
 * 「이 색으로만 말하지 않는다」가 그만큼 더 엄한 조건이 된다.
 * 달력 칸의 낭독기 이름이 「일정 있음」을 싣고, 고른 날 아래 「○월 ○일의 일정」 목록이
 * 글자로 말한다. **점·장식 전용이다** — 글자·아이콘·면에 쓰지 않는다.
 */
export const scheduleDot = "#BBD494";

export const interaction = {
  /** ⚠ 시안 `#C2BAAA`(1.72) 보정 — 비활성 탭은 비활성 컨트롤이 아니라 갈 수 있는 곳이다 */
  inactive: "#796D57",
  /** 비활성 버튼 배경. 이 면 위의 글자가 `label.disabled` 다 */
  disabled: "#DDE7E0",
} as const;

/**
 * 채움·선 — 전부 `rgba(140,122,102,α)` 한 색조다.
 * **경계는 border 가 아니라 hairline 이다**(`metrics.ts` `hairline`).
 */
const WARM = "140,122,102";
export const fill = {
  alternative: `rgba(${WARM},0.06)`,
  normal: `rgba(${WARM},0.10)`,
  strong: `rgba(${WARM},0.18)`,
} as const;

export const line = {
  alternative: `rgba(${WARM},0.14)`,
  neutral: `rgba(${WARM},0.24)`,
  normal: `rgba(${WARM},0.34)`,
} as const;

/**
 * 덮개.
 * - `dimmer` 시트·모달 뒤
 * - `press*` **버튼은 자기 fill 을 바꾸지 않고 이 스크림을 얹는다**(`DESIGN.md` §6).
 *   웹의 `transition-property` 회피책은 RN 에 필요 없다
 */
export const overlay = {
  dimmer: "rgba(48,38,28,0.32)",
  pressLight: "rgba(60,46,34,0.09)",
  pressNormal: "rgba(60,46,34,0.12)",
  pressStrong: "rgba(60,46,34,0.18)",
} as const;

/**
 * **카드 액자** — 쉼터 `R2` 의 바람카드가 쓰는 두 색 (2026-09-06).
 *
 * 타로 카드 결의 테두리를 위해 이름을 만들었다. `label` 이나 `line` 을 쓰지 않은
 * 이유: 잉크(`label.strong` #241F19)는 검게 보여 종이 카드의 손그림 선이 안 되고,
 * `line.*` 는 반투명이라 크림 띠 위에서 색이 흐려진다. **불투명한 웜 브라운**이
 * 있어야 띠 위든 카드 위든 같은 선으로 읽힌다.
 *
 * - `stroke` 바깥·안쪽 두 선. 검정이 아닌 **연한 갈색**
 * - `ornament` 모서리 장식 칸의 마름모. 선보다 **한 단 더 연하게**
 */
export const cardFrame = { stroke: "#8B7D70", ornament: "#BDB2A5" } as const;

/**
 * **회고 대화 화면의 러그** (2026-09-11 · 사용자 요청) — 바바가 앉고 화면 바닥까지 채우는 큰 둥근 러그.
 *
 * **아이보리 단색**이다. 흙갈색(`#C49A72`) → 오트·라테 빛(`#D9B991`) → 아이보리(`#EFE4CC` · 반점·두께 띠)를
 * 거쳐 질감 없이 한 색으로 돌아왔다. 윤곽을 그려 주던 두께 띠가 빠져서 **`#EFE4CC` 에서 한 단 짙게** 잡았다 —
 * 그 값은 화면 바탕과 1.15 라 러그의 둥근 윗변이 거의 안 보인다(지금 1.20).
 *
 * - `fill` 러그 면. 독의 오류 한 줄(`label.neutral`)이 이 위에 얹혀 4.88 — 러그를 더 짙게 바꾸면
 *   `contrast.test.ts` 가 먼저 깨진다
 * - `shadow` 빈백이 러그에 드리운 **그림자** — 바바가 러그 위에 앉아 보이게. 장식 전용
 */
export const retroRug = {
  fill: "#EBDFC5",
  shadow: "rgba(122,90,60,0.18)",
} as const;

/**
 * **쉼터 카드를 누른 자리의 물결** (2026-09-11 · 사용자 요청 · `RestCardPressable`).
 *
 * **짙은 회색**을 옅게 얹는다 — 누름 효과 후보를 비교하던 데모의 물결 색(짙은 잉크 12%)을 그대로
 * 옮겼다. 거기까지 두 번 바꿨다: 브랜드 초록 16%(티가 덜 났다) → 짙은 아이보리 `#CFB891` 55%
 * (사용자가 데모의 회색을 골랐다). 따뜻한 잉크(`label.strong`)가 아니라 **색이 거의 없는 회색**이라
 * 크림 카드 위에서 「눌린 그늘」로만 읽힌다 — `cardRipple.peakOpacity`(0.08)로 얹으면 카드 면과 **1.17**
 * (데모의 12% 는 실기기에서 조금 짙어 한 단 옅게 했다).
 *
 * 장식 전용이다 — 글자를 얹지 않는다. 물결이 덮는 동안에도 카드 글자는 제 색(`label.*`) 그대로 읽힌다
 * (`label.strong` 13.7).
 */
export const restRipple = "#1F1E1D";

/** 배경 격자 — 32px 정격자. 기기 프레임에 고정되고 스크롤과 무관하다 */
export const grid = { stroke: `rgba(${WARM},0.07)`, size: 32 } as const;

/**
 * 소셜 로그인 — **모멘토리 팔레트 밖이다.**
 *
 * `DESIGN.md` 「로그인」: 「소셜 3종 공식 색·마크 유지」 ·
 * `Login.dc.html` 주석: 「공통은 높이·Radius·간격만 — **색·로고는 손대지 않음**」.
 * 각 플랫폼이 브랜드 가이드로 고정한 값이라 **대비 보정도 하지 않는다** —
 * 우리가 정한 값이 아니라서 바꿀 권한이 없다.
 *
 * 그래서 여기 있다: 린터가 `src/design/**` 밖의 hex 를 막으므로 화면이 직접 적을 수 없다.
 * semantic 층이 아니므로 **다른 화면이 가져다 쓰지 않는다** — 로그인 전용이다.
 */
export const social = {
  /**
   * 카카오 — [디자인 가이드](https://developers.kakao.com/docs/ko/kakaologin/design-guide) 「색상」.
   *
   * ⚠ **심볼과 레이블이 다른 검정이다.** 가이드 표가 심볼 `#000000` · 레이블
   * `#000000 85%` 로 **두 줄로 나눠** 적는다. 2026-08-24 이전에는 둘 다 85% 로
   * 그렸는데, 말풍선이 규정보다 흐렸다는 뜻이다.
   */
  kakao: { background: "#FEE500", symbol: "#000000", label: "rgba(0,0,0,0.85)" },
  /**
   * 흰 판 + `#747775` 1px 테두리 + `#1F1F1F` 글자 — 공식 Light 테마
   * ([브랜딩 가이드라인](https://developers.google.com/identity/branding-guidelines?hl=ko)).
   *
   * 테두리는 **inside 1px** 이다 — 바깥으로 그리면 버튼이 48 보다 커진다.
   *
   * 4색 「G」 hex 는 **여기서 지웠다**(2026-08-24). 공식 마크가 2025 년에
   * 그라디언트로 바뀌어 색 넷으로 그릴 수 없게 됐다 — 이제 구글이 배포하는
   * PNG 원본을 그대로 쓴다(`icons/GoogleMark.tsx`).
   */
  google: { background: "#FFFFFF", label: "#1F1F1F", border: "#747775" },
  /** 라이트에서 검정 판 + 흰 글자 (공식 규정) */
  apple: { background: "#000000", label: "#FFFFFF" },
} as const;

/**
 * 감정 10색 (채팅흐름_v2). **id 는 도메인이 쥔다**(`features/emotion`) — 여기는 색만 붙인다.
 * v2 에서 번호를 긍정→부정으로 다시 매기고 `화남·답답함`을 분리했다 — 각 감정은 자기 색을 그대로
 * 유지하고(번호만 이동), `답답함`(10)은 새 색을 붙인다(초안 — `DESIGN.md` 가 확정).
 * `Record<EmotionId, …>` 라서 감정이 늘면 컴파일러가 빠진 칸을 잡는다.
 *
 * 쓰는 법(`DESIGN.md` §1): 도트·캡슐은 **55% 틴트 면 + 원색 1.5px 링**.
 * **감정 선택 칩에는 감정색을 쓰지 않는다** — 브랜드 초록 18% + 초록 2px 로 통일한다.
 */
export const emotion: Record<EmotionId, string> = {
  1: "#F3D07A", // 행복함
  2: "#EFA76B", // 뿌듯함
  3: "#A8C79B", // 평온함
  4: "#C9AFA6", // 피곤함
  5: "#B4C3CC", // 막막함
  6: "#C7C1B6", // 무기력
  7: "#7A96B0", // 불안함
  8: "#A9B5D9", // 우울함
  9: "#C2796A", // 화남
  10: "#B8917C", // 답답함 (신설 · 초안)
};

/** `#RRGGBB` → `rgba(r,g,b,α)`. 화면이 hex 를 문자열로 잇지 않게 한다 */
export function withAlpha(hex: string, alpha: number): string {
  const v = hex.replace("#", "");
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** 감정 면 — 원색 55% 틴트. 이 위의 글자는 `label.normal` 로 6.96 이상이다 */
export const emotionTint = (id: EmotionId) => withAlpha(emotion[id], 0.55);

/** 선택 칩 배경 — 브랜드 초록 18% (`DESIGN.md` §9) */
export const selectedTint = withAlpha(primary.normal, 0.18);

/**
 * 감각연못 — **쉼 콘텐츠 안쪽의 작은 세계**(2026-09-03 · 2026-09-04 정리).
 *
 * 격자 위의 앱 팔레트가 아니라 **연못 위에 얹히는 것**의 색이다 — 손짓이 일으키는
 * 물의 반응(수면 · 잔물결 · 따뜻한 빛). 배경도 흔적도 이제 일러스트라
 * (`assets/sensory-pond/`) 연잎 · 소리 자국 · 꽃의 색은 여기 없다 — **그림이 든
 * 색을 코드가 다시 정하지 않는다**(카피바라 · 구글 마크와 같은 판단). 임시로
 * 도형을 그리던 때의 색 여섯(`lilyPad` · `traceLeaf` · `traceRing` …)은 그림이
 * 들어오면서 지웠다(2026-09-04). 「기존 화면의 격자와 다르게 별도 세계처럼」이
 * 요구라, semantic 층에 이름을 섞지 않고 한 묶음으로 둔다.
 *
 * **전부 장식 전용이다.** 글자를 얹지 않으므로 대비를 재지 않았다 — 글자를 얹게
 * 되면 그때 `label` 로 쓰고 여기 값을 글자색으로 쓰지 않는다. 감각연못
 * (`components/rest/pond/`) 밖에서 가져다 쓰지 않는다.
 */
export const pond = {
  /** 연못 영역의 바닥 — 그림이 뜨기 전 한 프레임, 그리고 그림의 둑과 같은 결 */
  bank: "#EDE4D1",
  /**
   * 감각 단계의 파동 — **따뜻하게**. 브랜드 테라코타(`#C2703D`)를 물에 풀어
   * 연하게 만든 살구빛. 글자를 얹지 않는다
   */
  warm: "#D9A67E",
  /**
   * 아래 판의 **감각 한 칸**에 그리는 선 — 눈·음표·손 글리프와 테두리. 그림 속
   * 윤곽선과 같은 결의 짙은 풀빛이다. 장식 전용이라 대비를 재지 않았다 —
   * 글자를 얹지 않는다.
   */
  markLine: "#4C6553",
  /**
   * 감각 셋은 **결이 다른 세 감각**이라 선 색이 다르다 (2026-09-05 레퍼런스).
   * 눈은 `markLine`(풀빛) · 소리는 물빛 · 손은 흙빛. **그 감각이 어떤 결인지**를
   * 말하는 색이다. 장식 전용 — 글자를 얹지 않는다.
   */
  markSound: "#41707B",
  markHand: "#A96B39",
  /** 잠시 누르는 동안 차오르는 빛의 바깥 — 물에 번진 온기 */
  warmSoft: "#EFCFB2",
  /** 그 빛의 한가운데 — 손끝이 닿아 있는 자리 */
  warmCore: "#F6E3CC",
  /**
   * 손끝에서 수면이 한 번 눌릴 때의 **빛** — 물이 밝게 튕기는 결이라 색이랄 것이
   * 거의 없다. 흰빛을 옅게 얹는다.
   *
   * **물결의 링**이 이 색이다(2026-09-06 · `SurfaceRipple`). 풀빛 링(옛 `ripple`
   * `#8DB09B`)은 밝은 물빛(`pond-ambient.webp`) 위에서 보이지 않아 지웠다 —
   * 물마루에 빛이 걸린 것처럼 읽히는 흰빛이 이 그림에는 맞다. 채워진 원이면
   * UI 배지가 되지만 가는 선이라 장면에 잠긴다.
   */
  surface: "#FFFFFF",
  /**
   * 장면 **위쪽에만** 아주 옅게 까는 빛 — 글이 앉는 자리다 (2026-09-06 · `PondTopVeil`).
   *
   * 그림 위쪽은 밝고 잎사귀가 많아 짙은 글자도 잔가지에 묻힌다. 그렇다고 흰 카드를
   * 두면 다시 「앱 화면 속 카드」가 되어 연못 안에 있다는 감각이 깨진다. 그래서
   * **면이 아니라 빛 한 겹**이다 — 위에서 아래로 사라지는 그라디언트라 경계선이
   * 생기지 않는다. 그림의 둑·물빛과 같은 결의 따뜻한 흰빛이라 색이 얹혔다는 느낌이
   * 없다. 짙기는 `pondVeil` 이 든다.
   */
  veil: "#FBF7EE",
} as const;

/**
 * 몸에 힘 빼기 — 노을 지는 언덕 뒤의 **해** (2026-10-05 · `components/rest/body/`).
 *
 * 하늘·언덕·카피바라는 그림(`assets/body-release/`)이라 색이 여기 없다. 해만 코드다 —
 * 들숨에 커지고 날숨에 작아지는 호흡 원이라서. 장식 전용이라 글자를 얹지 않는다.
 */
export const bodyRelease = {
  /** 해의 한가운데 → 바깥 번짐 */
  sunCore: "#F9B46F",
  sunGlow: "#FBD9B0",
  /** 카피바라를 감싸는 시간 링 — 바탕 줄은 옅게, 차오르는 호는 또렷하게(`bodyReleaseRing`) */
  ring: "#FFFFFF",
  /**
   * 장면 위의 버튼 면 — 노을 위에 단색 CTA 가 얹히면 앱 화면의 버튼으로 읽혀서
   * (실기기 · 2026-10-05) **반투명 크림 알약**으로 둔다. 글자는 `label.normal`
   */
  pill: "#FFF7EE",
  /** 끝났을 때 카피바라 둘레에서 떠오르는 빛 알갱이 — 노을 속 반딧불 결(`bodyReleaseFinish`) */
  mote: "#FFF1D2",
} as const;

export const color = {
  background,
  label,
  primary,
  secondary,
  status,
  scheduleDot,
  interaction,
  fill,
  line,
  overlay,
  grid,
  social,
  emotion,
} as const;
