import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Text } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { OtherReplyInput } from "@/components/onboarding/OtherReplyInput";
import { QuickReplies } from "@/components/onboarding/QuickReplies";
import { label as labelColor, space } from "@/design/ds";
import { MAX_INTERESTS, OTHER_INTEREST, useDraft } from "@/features/onboarding/model/draft";
import {
  choiceHint,
  useOnboardingOptions,
  withOtherLabel,
} from "@/features/onboarding/model/options";

/**
 * `06` · 관심 분야 (필수 · 복수) + `06-b`/`06-c` 기타 입력
 *
 * **칩은 질문 바로 아래 왼쪽, 대화 영역 안**이다(`Onboarding.dc.html` 「대화 문법」).
 *
 * **최대 3개.** 넷째부터는 눌러도 켜지지 않는다 — 다 고르면 아무것도 안 고른
 * 것과 같다(`06.md`). 제한 경고를 미리 띄우지 않고 안내는 몇 개를 골랐는지
 * **사실만** 말한다(`06-c.md`).
 *
 * - 기타를 켠 채 비워 두면 `[다음]` 이 잠긴다 — 켠 것은 "적을 게 있다"는 뜻
 * - 빠져나가는 길은 둘뿐 — **적거나, 기타를 끄거나**
 * - 확정은 `[확인]` 이다(`DESIGN.md` §7 「전송/확인 — 값이 비면 비활성」). 키보드
 *   `완료` 와 `[다음]` 도 같은 확정을 지나고, **공백뿐이면 확정하지 않고 기타
 *   선택을 취소한다**(`06-c.md`)
 *
 * **칩 목록은 서버가 준다.** 못 받았으면 대역으로 그린다 — 선택지를 기다리느라
 * 온보딩을 멈추지 않는다. 상한 3 은 서버가 말하지 않아 여기 남는다.
 */
export default function Interests() {
  const items = useOnboardingOptions((s) => s.interestAreas);
  const picked = useDraft((s) => s.interests);
  const other = useDraft((s) => s.interestOther);
  const set = useDraft((s) => s.set);

  /**
   * 칩에 얹힌 값 — **적는 중인 글자와 다르다.** 확정을 지난 것만 여기 들어와서
   * 「확인을 누르면 저장돼요」라는 안내대로 그때 칩이 바뀐다(`06-c.md`).
   * 초안에서 되살리는 이유는 뒤로 왔을 때다 — `[다음]` 이 이미 확정을 지났다.
   */
  const [committed, setCommitted] = useState(() => other.trim());

  const etcOn = picked.includes(OTHER_INTEREST);
  const otherTrimmed = other.trim();
  // 적는 중 — 확정을 지나면 줄을 닫는다. 답은 이미 칩이 들고 있다(`06-c.md`)
  const etcEditing = etcOn && committed.length === 0;
  // 적었지만 아직 확정 전 — 확정을 지나면 칩이 이미 바뀌어 있어 더 말할 것이 없다
  const etcPending = otherTrimmed.length > 0 && otherTrimmed !== committed;
  // 기타를 켠 채 비워 두면 잠긴다 (06-b.md)
  const ready = picked.length > 0 && (!etcOn || otherTrimmed.length > 0);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      set(
        "interests",
        picked.filter((x) => x !== id),
      );
      // 기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 초안에 남기지 않는다
      if (id === OTHER_INTEREST) {
        set("interestOther", "");
        setCommitted("");
      }
      return;
    }
    // 넷째부터는 눌러도 켜지지 않는다 — 경고를 미리 띄우지 않는다 (06.md · 06-c.md)
    if (picked.length >= MAX_INTERESTS) return;
    set("interests", [...picked, id]);
  };

  /**
   * 기타 값 확정 — `[확인]` · 키보드 `완료` · `[다음]` 이 여기를 지난다.
   * **입력 줄 밖 탭(blur)은 더 이상 확정이 아니다** — 확정 버튼을 둔 이상
   * 「눌러야 확정된다」가 하나여야 한다(`DESIGN.md` §7).
   * 공백뿐이면 확정하지 않고 기타 선택을 취소한다 — 빈 칩을 만들지 않는다(`06-c.md`).
   * 확정한 값은 **칩의 이름이 된다**(`withOtherLabel`).
   */
  const commitOther = () => {
    if (otherTrimmed.length === 0) {
      set(
        "interests",
        picked.filter((x) => x !== OTHER_INTEREST),
      );
      set("interestOther", "");
      setCommitted("");
      return;
    }
    set("interestOther", otherTrimmed);
    setCommitted(otherTrimmed);
  };

  const goNext = () => {
    if (etcOn) commitOther();
    router.push("/rest");
  };

  return (
    <OnboardingChat
      step="interests"
      onBack={() => router.back()}
      inline={
        <View style={styles.replies}>
          <QuickReplies
            items={withOtherLabel(items, OTHER_INTEREST, committed)}
            selected={picked}
            onToggle={toggle}
            full={picked.length >= MAX_INTERESTS}
          />
          {etcEditing ? (
            <OtherReplyInput
              value={other}
              onChangeText={(v) => set("interestOther", v)}
              onCommit={commitOther}
            />
          ) : null}
        </View>
      }
    >
      <Text variant="caption1" color={labelColor.alternative} style={styles.hint}>
        {choiceHint(picked.length, etcOn, etcPending)}
      </Text>
      <Button label="다음" fill disabled={!ready} onPress={goNext} />
    </OnboardingChat>
  );
}

const styles = StyleSheet.create({
  replies: { alignSelf: "stretch", gap: space.md },
  hint: { textAlign: "center" },
});
