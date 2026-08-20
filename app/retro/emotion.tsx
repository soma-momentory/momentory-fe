import { router } from "expo-router";

import { Button, ChatBubble, ChatScaffold, ChoiceGrid } from "@/components/ds";
import { EMOTIONS, isEmotionId } from "@/features/emotion/model/emotion";
import { useRetro } from "@/features/retro/model/retro";

/**
 * `C3` · 시작 감정 고르기 · 9종
 *
 * `DESIGN.md` 「일기」 2번: **「감정 선택 3×3, 하나 선택해야 CTA 활성」**.
 *
 * **감정 선택은 필수다.** `[잘 모르겠어요]` 통과 버튼을 두지 않는다 — 시작 감정이
 * 없으면 첫 질문의 근거도, 리포트의 감정 흐름도 만들 수 없다(`C3.md`).
 * **서버도 요구한다** — `StartRetrospectRequest.currentEmotion` 이 required 다.
 * 그래서 CTA 는 고르기 전까지 **잠겨 있되 사라지지 않는다**.
 *
 * - **하나만 고른다** — 여러 개를 허용하면 "지금 가장 가까운"이라는 질문이 무너진다
 * - 9종은 **한 화면에 3×3** 으로 다 보인다. 스크롤로 감추면 뒤쪽은 선택되지 않는다
 * - **감정색을 쓰지 않는다**(`DESIGN.md` §1) — 브랜드 초록 18% + 초록 2px 로 통일한다.
 *   아홉을 각자 제 색으로 칠하면 고른 것이 어느 것인지가 색의 밝기 싸움이 된다
 * - **임상 용어·강도 척도를 쓰지 않는다** — 감정에 숫자를 붙이지 않는다
 *
 * 옛 화면의 요약 카드(「…으로 시작할게요 · 지금 다시 골라도 괜찮아요」)는 뺐다 —
 * 시안에 없고, 고른 타일이 이미 굵기·테두리·면으로 무엇을 골랐는지 말한다.
 */
const CHOICES = EMOTIONS.map((e) => ({ id: String(e.id), label: e.name }));

export default function RetroEmotion() {
  const startEmotion = useRetro((s) => s.startEmotion);
  const setStartEmotion = useRetro((s) => s.setStartEmotion);

  const pick = (id: string) => {
    const n = Number(id);
    // 그리드는 문자열 id 로 말한다 — 도메인으로 들어올 때 한 번 좁힌다
    if (isEmotionId(n)) setStartEmotion(n);
  };

  return (
    <ChatScaffold
      leading="arrow-left"
      onLeadingPress={() => router.back()}
      dock={
        // 잠긴 CTA 는 사라지지 않고 흐려진다 — 다음이 있다는 사실은 남는다
        <Button
          label="이야기 시작하기"
          fill
          disabled={startEmotion == null}
          onPress={() => router.push("/retro/talk")}
        />
      }
    >
      <ChatBubble>오늘을 떠올렸을 때, 어떤 마음이 가장 가까웠어요?</ChatBubble>

      <ChoiceGrid
        items={CHOICES}
        selected={startEmotion == null ? null : String(startEmotion)}
        // 이미 고른 것을 다시 눌러도 비우지 않는다 — 「없음」으로 돌아갈 자리가 없다
        onSelect={pick}
      />
    </ChatScaffold>
  );
}
