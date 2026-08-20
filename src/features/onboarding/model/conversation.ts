import type { Option } from "@/features/onboarding/data/optionsApi";
import {
  OTHER_INTEREST,
  OTHER_REST_METHOD,
  UNSPECIFIED_GENDER,
  type OnboardingDraft,
} from "@/features/onboarding/model/draft";
import { formatKoreanTime } from "@/lib/time";

/**
 * 온보딩 대화 — **질문 순서와 답변을 말로 옮기는 규칙**이 여기 한 곳에 있다.
 *
 * 새 디자인의 온보딩은 화면마다 질문 하나를 보이고 끝나는 것이 아니라
 * **지난 턴이 위에 쌓인 채 유지된다**(`DESIGN.md` 「온보딩」). 그러려면 각 화면이
 * **앞 화면들의 질문과 답까지** 그릴 수 있어야 한다 — 화면마다 자기 질문만 들면
 * 앞 질문을 여섯 곳에 복사하게 되고, 한 곳만 고쳐지면 대화가 어긋난다.
 *
 * 그래서 이 파일이 갖는 것은 둘뿐이다: **질문 문안**과 **답을 문장으로 바꾸는 법**.
 * 답의 원본은 `draft` 에 있고 여기서 만들지 않는다.
 *
 * ## 문안은 어디서 왔나
 *
 * 규칙은 로그인에서 정한 것과 같다(`PLAN.md` A-7):
 * **두 곳에 다 있는 슬롯은 `docs/spec/screens/` 문안**, 시안에만 있는 새 슬롯은 시안 문안.
 *
 * - `04`·`06`·`07`·`08`·`09` 질문 — 스펙 문안. 시안이 「제목 + 설명」을
 *   **한 메시지 안의 두 문장**으로 합쳤으므로(`Onboarding.dc.html` 「설문형에서 바뀐 것」)
 *   문장은 그대로 두고 줄만 합쳤다
 * - `05-a`(나이)·`05-c`(성별) — **새 슬롯**이다. 옛 화면은 폼 라벨(「나이」·「성별」)이라
 *   질문 문장이 없었다. 시안 문안을 쓴다
 * - ⚠ `03` 인사 — **화자가 바뀐다.** 스펙은 「모멘토리의 바바예요」이고 그 근거가
 *   「앱 이름과 캐릭터를 분리한다」(`03.md`)인데, 반입 패키지가 **캐릭터를 전부 뺐다**
 *   (`EXPORT_MANIFEST` §5). 인사할 캐릭터가 화면에 없으므로 시안대로 앱이 말한다.
 *   **바바는 회고(`C*`)와 `Diary.babaView` 에 그대로 남아 있다** — 온보딩에서만 빠진다
 */

export const ONBOARDING_STEPS = [
  "welcome",
  "nickname",
  "age",
  "gender",
  "interests",
  "rest",
  "retroTime",
  "calendar",
  "done",
] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export type Turn = { key: string; role: "question" | "answer"; text: string };

/** 화면이 넘겨주는 선택지 — 라벨을 붙이는 데만 쓴다 */
export type OptionLists = {
  genders: readonly Option[];
  interestAreas: readonly Option[];
  restMethods: readonly Option[];
};

const labelOf = (list: readonly Option[], id: string) => list.find((o) => o.id === id)?.label ?? id;

/**
 * 고른 것들을 한 줄로. 「기타」는 적은 값으로 바꿔 보인다 —
 * 답변 버블에 「기타」라고만 남으면 무엇을 골랐는지 나중에 못 읽는다.
 */
const joinPicked = (
  ids: readonly string[],
  list: readonly Option[],
  otherId: string,
  otherText: string,
) =>
  ids
    .map((id) =>
      id === otherId && otherText.trim().length > 0 ? otherText.trim() : labelOf(list, id),
    )
    .join(", ");

/** 각 단계의 질문. `null` 이면 그 단계는 질문하지 않는다(`welcome` 은 인사다) */
function questionOf(step: OnboardingStep, draft: OnboardingDraft): string | null {
  switch (step) {
    case "welcome":
      return "안녕하세요. 모멘토리예요.\n앞으로 하루를 조금 더 편하게 돌아볼 수 있도록 몇 가지만 여쭤볼게요.";
    case "nickname":
      return "어떻게 불러드리면 좋을까요?\n편하게 불리고 싶은 이름을 알려주세요. 실명도, 별명도 괜찮아요.";
    case "age":
      // 이름을 부르는 첫 자리다 — 비어 있으면 호칭 없이 묻는다
      return draft.nickname.length > 0
        ? `${draft.nickname}님, 나이는 어떻게 되나요?\n질문을 조금 더 잘 맞추는 데만 사용할게요.`
        : "나이는 어떻게 되나요?\n질문을 조금 더 잘 맞추는 데만 사용할게요.";
    case "gender":
      return "성별도 알려주실래요?\n원하지 않으면 넘어가도 괜찮아요.";
    case "interests":
      return "요즘 마음이 가장 자주 머무는 곳은 어디인가요?\n관심 있는 이야기를 골라주시면, 당신의 하루와 가까운 질문을 건넬게요.";
    case "rest":
      return "마음이 지치거나 스트레스를 받을 때, 어떤 방법이 가장 도움이 되나요?\n지쳐 보이는 날 이걸 먼저 권해드릴게요.";
    case "retroTime":
      return "하루를 언제 돌아보면 가장 편안할까요?\n바쁜 하루 속에서도 부담 없이 기록할 수 있도록, 당신이 편한 시간에 찾아갈게요.";
    case "calendar":
      return "마지막으로 하나만 더 부탁드릴게요.\n오늘 있었던 일을 더 쉽게 떠올릴 수 있도록 캘린더를 연결해볼까요?";
    case "done":
      return "고마워요.\n이제 당신에게 편한 방식으로 하루를 함께 기억해볼게요.";
  }
}

/**
 * 그 단계에서 사용자가 한 답. `null` 이면 아직 답하지 않았거나
 * 답이 없는 단계다(`welcome`·`done`).
 *
 * **건너뛴 것은 건너뛴 대로 말한다** — 빈 버블을 만들지 않고 「괜찮아요」로 남긴다.
 * 대화에서 답이 사라지면 질문 둘이 붙어 보여 무엇에 답한 것인지 읽히지 않는다.
 */
function answerOf(
  step: OnboardingStep,
  draft: OnboardingDraft,
  options: OptionLists,
): string | null {
  switch (step) {
    case "nickname":
      return draft.nickname.length > 0 ? draft.nickname : null;
    case "age":
      return draft.age.length > 0 ? `${draft.age}세` : "괜찮아요";
    case "gender":
      if (draft.gender == null) return "괜찮아요";
      return draft.gender === UNSPECIFIED_GENDER
        ? labelOf(options.genders, UNSPECIFIED_GENDER)
        : labelOf(options.genders, draft.gender);
    case "interests":
      return draft.interests.length > 0
        ? joinPicked(draft.interests, options.interestAreas, OTHER_INTEREST, draft.interestOther)
        : null;
    case "rest":
      return draft.restMethods.length > 0
        ? joinPicked(
            draft.restMethods,
            options.restMethods,
            OTHER_REST_METHOD,
            draft.restMethodOther,
          )
        : null;
    case "retroTime":
      // 알림을 껐어도 시각은 정해진다 — 「알림 없이」는 알림의 답이지 시각의 답이 아니다
      return draft.notifyRetro
        ? formatKoreanTime(draft.retroTime)
        : `${formatKoreanTime(draft.retroTime)} · 알림 없이`;
    case "calendar":
      return draft.calendarLinked ? "좋아요" : "나중에 할게요";
    default:
      return null;
  }
}

/**
 * `step` **앞의** 턴들 — 그 화면이 자기 질문 위에 쌓아 보일 대화다.
 * 자기 질문은 포함하지 않는다(화면이 「지금 묻는 것」으로 따로 그린다).
 *
 * 아직 답하지 않은 단계는 질문만 남는다 — 뒤로 갔다가 다시 올 때
 * 없는 답을 지어내지 않는다.
 */
export function turnsBefore(
  step: OnboardingStep,
  draft: OnboardingDraft,
  options: OptionLists,
): Turn[] {
  const upto = ONBOARDING_STEPS.indexOf(step);
  const turns: Turn[] = [];

  for (const s of ONBOARDING_STEPS.slice(0, Math.max(0, upto))) {
    const q = questionOf(s, draft);
    if (q != null) turns.push({ key: `${s}-q`, role: "question", text: q });
    const a = answerOf(s, draft, options);
    if (a != null) turns.push({ key: `${s}-a`, role: "answer", text: a });
  }

  return turns;
}

/** 그 단계가 지금 묻는 말 */
export function questionAt(step: OnboardingStep, draft: OnboardingDraft): string | null {
  return questionOf(step, draft);
}
