import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { Button, Text } from "@/components/ds";
import { OnboardingChat } from "@/components/onboarding/OnboardingChat";
import { OtherReplyInput } from "@/components/onboarding/OtherReplyInput";
import { QuickReplies } from "@/components/onboarding/QuickReplies";
import { label as labelColor, space } from "@/design/ds";
import { OTHER_REST_METHOD, useDraft } from "@/features/onboarding/model/draft";
import { choiceHint, useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `07` · 쉬는 방법 (필수 · 복수)
 *
 * **MVP 에서 이 답이 쓰이는 화면은 없다. 그래도 묻는다** — 답은
 * `User.restMethods` 로 저장만 하고 쉼터가 열릴 때 추천의 근거가 된다.
 * 나중에 다시 물으면 사용자는 같은 질문을 두 번 받는다(`07.md`).
 *
 * - **"쉬고 싶을 때"가 아니라 "지치거나 스트레스를 받을 때"** — 앞의 말은
 *   상황이 아니라 성향을 묻는 것으로 읽힌다
 * - **선택지 15개를 다 보인다.** "더 보기"로 접으면 뒤쪽은 사실상 선택되지 않는다.
 *   새 디자인에서는 칩을 좁히지 않고 **대화 영역이 스크롤된다** — 칩 크기를 줄여
 *   억지로 한 화면에 밀어 넣던 옛 방식(13.5 · gap 7)이 사라졌다
 * - `[그때마다 달라요]` 는 회피가 아니라 유효한 답이고, `[멍하니 쉬기]` 도
 *   하나의 방법이다
 * - 복수 선택 · **상한 없음** · 다시 누르면 취소
 *
 * **칩 목록은 서버가 준다.** ⚠ 서버 라벨에는 이모지가 없다(`PRODUCT.md` 9번).
 * ⚠ `[기타]` 입력 줄은 시안에 없다 — 서버 요구라 남긴다(`OtherReplyInput` 참조).
 */
export default function Rest() {
  const items = useOnboardingOptions((s) => s.restMethods);
  const picked = useDraft((s) => s.restMethods);
  const other = useDraft((s) => s.restMethodOther);
  const set = useDraft((s) => s.set);

  const etcOn = picked.includes(OTHER_REST_METHOD);
  const otherTrimmed = other.trim();
  // 기타를 켠 채 비워 두면 잠긴다 — 06-b 와 같은 규칙이다
  const ready = picked.length > 0 && (!etcOn || otherTrimmed.length > 0);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      set(
        "restMethods",
        picked.filter((x) => x !== id),
      );
      // 기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 초안에 남기지 않는다
      if (id === OTHER_REST_METHOD) set("restMethodOther", "");
      return;
    }
    set("restMethods", [...picked, id]);
  };

  /**
   * 기타 값 확정 — `[확인]` · 키보드 `완료` · `[다음]` 이 여기를 지난다.
   * **밖 탭(blur)은 확정이 아니다**(`design.md` §7). 공백뿐이면 확정하지 않고
   * 기타 선택을 취소한다(`06-c.md`).
   */
  const commitOther = () => {
    if (otherTrimmed.length === 0) {
      set(
        "restMethods",
        picked.filter((x) => x !== OTHER_REST_METHOD),
      );
      set("restMethodOther", "");
      return;
    }
    set("restMethodOther", otherTrimmed);
  };

  const goNext = () => {
    if (etcOn) commitOther();
    router.push("/retro-time");
  };

  return (
    <OnboardingChat
      step="rest"
      onBack={() => router.back()}
      inline={
        <View style={styles.replies}>
          <QuickReplies items={items} selected={picked} onToggle={toggle} />
          {etcOn ? (
            <OtherReplyInput
              value={other}
              onChangeText={(v) => set("restMethodOther", v)}
              onCommit={commitOther}
            />
          ) : null}
        </View>
      }
    >
      <Text variant="caption1" color={labelColor.alternative} style={styles.hint}>
        {choiceHint(picked.length, etcOn, otherTrimmed.length > 0)}
      </Text>
      <Button label="다음" fill disabled={!ready} onPress={goNext} />
    </OnboardingChat>
  );
}

const styles = StyleSheet.create({
  replies: { alignSelf: "stretch", gap: space.md },
  hint: { textAlign: "center" },
});
