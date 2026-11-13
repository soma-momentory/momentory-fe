import {
  background,
  emotion,
  homeV2,
  interaction,
  label,
  musicPaper,
  primary,
  retroRug,
  retroDiary,
  status,
  withAlpha,
  restCards,
  restScene,
  restThemeCard,
  weeklyHappiness,
} from "@/design/ds";
import { EMOTIONS } from "@/features/emotion/model/emotion";

/**
 * 대비 검수를 **테스트로 고정한다.**
 *
 * `docs/DESIGN.md` §1 의 값 여섯이 WCAG 2.1 AA 에 미달이라 보정했다
 * (`src/design/ds/color.ts` 머리말의 표). 주석만 남기면 다음 사람이 "시안과 다르네"
 * 하고 되돌린다 — 되돌리면 여기가 깨진다.
 *
 * 기준: 본문 4.5 · 큰 글자(18.66px+ bold) 3.0 · 비텍스트 UI 3.0.
 */

const luminance = (hex: string) => {
  const v = hex.replace("#", "");
  const ch = [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
};

/** 두 **불투명** 색의 대비비 */
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
};

/** α 합성 — 반투명 면 위의 글자를 재려면 먼저 배경과 섞어야 한다 */
const flatten = (hex: string, alpha: number, bg: string) => {
  const parse = (h: string) => {
    const v = h.replace("#", "");
    return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
  };
  const f = parse(hex);
  const b = parse(bg);
  const mix = f.map((c, i) => Math.round((c ?? 0) * alpha + (b[i] ?? 0) * (1 - alpha)));
  return `#${mix.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
};

/** 화면에 실제로 깔리는 세 면. **가장 어두운 면에서도** 통과해야 한다 */
const SURFACES = [background.normal, background.alternative, background.elevated];
const worstOn = (fg: string) => Math.min(...SURFACES.map((bg) => contrast(fg, bg)));

describe("본문 글자 — 세 배경 전부에서 4.5", () => {
  it.each([
    ["label.strong", label.strong],
    ["label.normal", label.normal],
    ["label.neutral", label.neutral],
    ["label.alternative", label.alternative],
    ["primary.heavy", primary.heavy],
    ["status.negative", status.negative],
    ["status.cautionary", status.cautionary],
    ["interaction.inactive", interaction.inactive],
  ])("%s", (_name, hex) => {
    expect(worstOn(hex)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("비텍스트 UI — 3.0", () => {
  it("primary.normal — 선택 링·아이콘이 배경에서 보인다", () => {
    expect(worstOn(primary.normal)).toBeGreaterThanOrEqual(3);
  });

  it("status.positive — 완료 체크 아이콘", () => {
    expect(worstOn(status.positive)).toBeGreaterThanOrEqual(3);
  });
});

describe("비활성 버튼 — 꺼져 있어도 읽혀야 한다", () => {
  /**
   * WCAG 는 비활성 컨트롤을 대비 기준에서 **면제**하지만, 그것은 「기준을 안 재도 된다」이지
   * 「안 보여도 된다」가 아니다. 시안 값(`#A3B5A9` on `#DDE7E0` = 1.70)은 실기기에서
   * **글자가 없는 것처럼** 보였다 — 「다음에 무엇이 오는지 보이게 두려고」 비활성 버튼을
   * 남기는 것인데(`04.md`) 라벨이 사라지면 그 이유가 통째로 없어진다.
   */
  it("비활성 라벨이 비활성 면 위에서 읽힌다", () => {
    expect(contrast(label.disabled, interaction.disabled)).toBeGreaterThanOrEqual(4);
    // 시안 값이 왜 못 쓰이는지 함께 고정한다 — 되돌리면 여기가 깨진다
    expect(contrast("#A3B5A9", interaction.disabled)).toBeLessThan(2);
  });

  it("그래도 활성보다 약하다 — 면 색이 상태를 말한다", () => {
    // 활성 solid 는 진한 초록 면 + 흰 글자(5.03), 비활성은 연한 면 + muted 글자.
    // 글자 대비가 활성 쪽을 넘어서면 어느 것이 눌리는지 뒤집힌다
    expect(contrast(label.disabled, interaction.disabled)).toBeLessThan(
      contrast(label.onFill, primary.heavy),
    );
  });
});

describe("색 면 위 흰 글자", () => {
  it("주 CTA 는 primary.heavy 다 — design.md 의 primary.normal(2.9)로 되돌리면 깨진다", () => {
    expect(contrast(label.onFill, primary.heavy)).toBeGreaterThanOrEqual(4.5);
    // 시안 값이 왜 못 쓰이는지 함께 고정한다
    expect(contrast(label.onFill, "#7C9E86")).toBeLessThan(3);
  });

  it("삭제 버튼 면 — status.negative 한 값이 글자와 면 둘 다 통과한다", () => {
    expect(contrast(label.onFill, status.negative)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("감정 12색", () => {
  it("색이 열두 개 다 있다 — 도메인과 칸이 맞는다", () => {
    for (const e of EMOTIONS) expect(emotion[e.id]).toMatch(/^#[0-9A-F]{6}$/i);
  });

  // 도트·캡슐은 55% 틴트 면이다(design.md §1). 그 위 글자가 본문 기준을 넘어야 한다
  it.each(EMOTIONS.map((e) => [e.name, e.id] as const))(
    "%s — 55%% 틴트 위 label.normal 이 4.5 를 넘는다",
    (_name, id) => {
      const tint = flatten(emotion[id], 0.55, background.elevated);
      expect(contrast(label.normal, tint)).toBeGreaterThanOrEqual(4.5);
    },
  );

  /**
   * 원색 도트·링은 배경 대비가 낮아 3:1 에 못 미친다(12색 · 2026-11-14) — **의도한 예외**다.
   * 감정을 색만으로 판단하게 하지 않고 **이름을 늘 함께 쓴다**(`RULES.md` 「보관함」).
   * 이 테스트는 그 예외가 여전히 예외임을 드러내 둔다 — 규칙이 사라지면 근거도 사라진다.
   */
  it("원색 도트는 3:1 을 못 넘는다 — 그래서 이름 없는 감정 도트를 만들지 않는다", () => {
    const below = EMOTIONS.filter((e) => worstOn(emotion[e.id]) < 3);
    expect(below.length).toBeGreaterThan(0);
  });
});

/**
 * 회고 대화의 **러그**(아이보리 면) — 화면 바닥까지 깔려 독의 오류 한 줄이 늘 그 위에 얹힌다.
 * 러그 색을 짙게 바꾸면 여기가 먼저 깨진다(갈색 러그였을 때는 `neutral` 이 2.5 까지 떨어졌다).
 */
describe("로그인 — 스플래시 면 위 글자", () => {
  it("실패 한 줄 · 약관 · 「SNS 로그인」이 베이지 면에서 4.5 를 넘는다", () => {
    expect(contrast(status.negativeOnSplash, background.splash)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(label.neutral, background.splash)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("회고 러그 위의 글자", () => {
  it("오류 한 줄(label.neutral)은 러그 면에서 4.5 를 넘는다", () => {
    expect(contrast(label.neutral, retroRug.fill)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("withAlpha", () => {
  it("hex 를 rgba 로 옮긴다 — 화면이 문자열을 잇지 않게", () => {
    expect(withAlpha("#7C9E86", 0.18)).toBe("rgba(124,158,134,0.18)");
  });
});

describe("쉼터 안의 빈티지 버튼 — 잉크 글자", () => {
  it.each([
    ["크림 면", restScene.surface],
    ["꿀빛 주 행동 면", restScene.accent],
  ])("%s 위에서 4.5 를 넘는다", (_, face) => {
    expect(contrast(restScene.ink, face)).toBeGreaterThanOrEqual(4.5);
  });
});

/**
 * 홈 v2(`ds/homeV2.ts`) — 시안 값 둘(마친 일정 글자 · 체크 테두리)이 미달이라 보정했다.
 * 보정 값을 시안으로 되돌리면 여기가 깨진다(A-5 선례).
 */
describe("홈 v2 — 종이 위 글자와 체크", () => {
  const v2 = homeV2.color;

  it("홈 v2 — 마친 일정 글자는 카드 위 4.5 를 넘는다(v2 `#A8988A` 2.63 로 되돌리면 깨진다)", () => {
    expect(contrast(v2.taskDone, v2.card)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#A8988A", v2.card)).toBeLessThan(3);
  });

  it("홈 v2 — 체크 테두리 · 읽지 않음 점은 3:1 을 넘는다", () => {
    expect(contrast(v2.taskBorder, v2.card)).toBeGreaterThanOrEqual(3);
    expect(contrast("#C9BBA8", v2.card)).toBeLessThan(3);
    expect(contrast(v2.alert, v2.paper)).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ["잉크 / 종이", v2.ink, v2.paper],
    ["잉크 / 날짜 종이", v2.ink, v2.date],
    ["잉크 / 요일 종이", v2.ink, v2.weekday],
    ["잉크 / 오늘 형광", v2.ink, v2.today],
    ["보조 / 카드", v2.muted, v2.card],
    ["보조 / 종이", v2.muted, v2.paper],
  ])("홈 v2 — 잉크 · 보조 글자는 종이 · 날짜 종이 · 요일 종이 · 카드 위 4.5 — %s", (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("홈 v2 — CTA 흰 글자 4.5", () => {
    expect(contrast(v2.white, v2.green)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("일기 방식 선택", () => {
  it("AI 대화 버튼의 아이보리 글씨는 확정된 갈색 바탕에서 4.5 이상이다", () => {
    expect(contrast(retroDiary.paper, retroDiary.methodTalk)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("날짜별 바람카드 — 쪽지 위 글자", () => {
  it("글자는 종이와 형광 위 4.5 를 넘는다", () => {
    const { ink, muted, paper, highlight } = restCards.color;
    expect(contrast(ink, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(muted, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(ink, highlight)).toBeGreaterThanOrEqual(4.5);
    // 카드 없는 날의 날짜 · 요일
    expect(contrast(label.neutral, paper)).toBeGreaterThanOrEqual(4.5);
  });

  it("문구(클립 · 압정 윤곽)는 종이 위 3 을 넘어 보인다", () => {
    const { clip, ink, paper } = restCards.color;
    expect(contrast(clip, paper)).toBeGreaterThanOrEqual(3);
    expect(contrast(ink, paper)).toBeGreaterThanOrEqual(3);
  });
});

describe("주간 행복", () => {
  const paper = homeV2.color.paper;

  it("글자는 종이 위 4.5 를 넘고, 선은 3 을 넘는다", () => {
    expect(contrast(weeklyHappiness.color.text, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(weeklyHappiness.color.entry, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(weeklyHappiness.color.placeholder, paper)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(weeklyHappiness.color.line, paper)).toBeGreaterThanOrEqual(3);
  });
});

describe("쉼터 테마 카드", () => {
  it("이름과 시간이 얹히는 종이는 잉크 글자 4.5 를 넘는다", () => {
    for (const paper of Object.values(restThemeCard.paper)) {
      expect(contrast(homeV2.color.ink, paper)).toBeGreaterThanOrEqual(4.5);
      // 시간 줄은 옅은 갈색(muted)이다
      expect(contrast(homeV2.color.muted, paper)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("홈 배경음악 창의 종이", () => {
  it("창의 글자(제목 · 곡 이름 · 묶음 이름)는 종이 위에서 본문 AA 를 넘는다", () => {
    expect(contrast(label.strong, musicPaper.surface)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(label.normal, musicPaper.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
