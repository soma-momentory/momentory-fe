import { useEffect, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { Text } from "@/components/ds";
import { BasicInfoEditor } from "@/components/my/BasicInfoEditor";
import { OtherReplyInput } from "@/components/onboarding/OtherReplyInput";
import { QuickReplies } from "@/components/onboarding/QuickReplies";
import { label as labelColor, space } from "@/design/ds";
import { sameChoices } from "@/features/my/model/basicInfo";
import { useProfile } from "@/features/my/model/settings";
import { OTHER_REST_METHOD } from "@/features/onboarding/model/draft";
import { choiceHint, useOnboardingOptions } from "@/features/onboarding/model/options";

/**
 * `M8` · 쉬는 방법 수정
 *
 * `M7` 과 같은 구조다 — **목록이 길어(15개) 칩 영역만 스크롤된다**
 * (`My.dc.html` 「판단이 필요한 부분」). 저장 버튼은 늘 바닥에 있다.
 *
 * - **상한이 없다.** 온보딩 `07` 과 같은 규칙이고, 「그때마다 달라요」·「멍하니 쉬기」도
 *   회피가 아니라 유효한 답이다
 * - **접지 않는다.** 옛 화면은 대표 6개만 보이고 `[＋ 더 고르기]` 로 폈는데,
 *   접으면 뒤쪽은 사실상 선택되지 않는다(`07.md`) — 스크롤로 전부 보인다
 * - 「기타」는 서버가 `OTHER` 와 함께 요구하는 값이라 여기 있다(`DISCUSSION.md` §1-7)
 */
export default function RestEdit() {
  const savedPicked = useProfile((s) => s.restMethods);
  const savedOther = useProfile((s) => s.restMethodOther);
  const items = useOnboardingOptions((s) => s.restMethods);

  const [picked, setPicked] = useState<string[]>(savedPicked);
  const [other, setOther] = useState(savedOther);

  useEffect(() => {
    void useOnboardingOptions.getState().load();
  }, []);

  const etcOn = picked.includes(OTHER_REST_METHOD);
  const otherTrimmed = other.trim();
  const changed = !sameChoices(picked, savedPicked) || otherTrimmed !== savedOther;
  const ready = picked.length > 0 && (!etcOn || otherTrimmed.length > 0);

  const toggle = (id: string) => {
    if (picked.includes(id)) {
      setPicked(picked.filter((x) => x !== id));
      // 기타를 끄면 적던 값도 함께 비운다 — 꺼진 답을 남기지 않는다
      if (id === OTHER_REST_METHOD) setOther("");
      return;
    }
    setPicked([...picked, id]);
  };

  /** 「기타」 확정 — 공백뿐이면 확정하지 않고 기타 선택을 취소한다(`06-c.md`) */
  const commitOther = () => {
    if (otherTrimmed.length === 0) {
      setPicked(picked.filter((x) => x !== OTHER_REST_METHOD));
      setOther("");
      return;
    }
    setOther(otherTrimmed);
  };

  return (
    <BasicInfoEditor
      title="쉬는 방법"
      changed={changed}
      ready={ready}
      patch={{ restMethods: picked, restMethodOther: etcOn ? otherTrimmed : "" }}
    >
      {/* 칩만 스크롤된다 — 저장은 늘 바닥에 있어야 한다 */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.chips}
        showsVerticalScrollIndicator={false}
      >
        <QuickReplies items={items} selected={picked} onToggle={toggle} />

        {etcOn ? (
          <OtherReplyInput value={other} onChangeText={setOther} onCommit={commitOther} />
        ) : null}
      </ScrollView>

      <Text variant="caption1" color={labelColor.alternative}>
        {choiceHint(picked.length, etcOn, otherTrimmed.length > 0)}
      </Text>
    </BasicInfoEditor>
  );
}

const styles = StyleSheet.create({
  // 남은 높이 안에서만 구른다 — flex 를 주지 않으면 내용만큼 늘어나 헬퍼 줄을 밀어낸다
  scroll: { flex: 1, minHeight: 0 },
  chips: { gap: space.md, paddingBottom: space.sm },
});
