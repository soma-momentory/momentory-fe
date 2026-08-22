import { StyleSheet, View } from "react-native";

import { Button, Text, TextField } from "@/components/ds";
import { label as labelColor, space } from "@/design/ds";
import { MAX_OTHER_LENGTH } from "@/features/onboarding/model/draft";

/**
 * 「기타」 인라인 입력 — `06-b` · `07` 이 같은 줄을 나눠 쓴다.
 *
 * ⚠ **시안에 이 흐름은 없다.** 반입 패키지가 스스로 적어 뒀다:
 * 「`기타` 선택 시 답장 입력을 여는 흐름은 아직 없어요」(`Onboarding.dc.html`).
 * 그런데 **서버가 `OTHER` 와 함께 직접 입력 값을 요구한다** — 없으면 온보딩 제출이
 * 400 이다(`DISCUSSION.md` §1-7). 디자인이 미룬 자리라 부딪히는 것이 아니고,
 * **모양은 `DESIGN.md` 를 그대로 따랐다**(2026-08-20 결정).
 *
 * ## 확정은 `[확인]` 하나다
 *
 * `DESIGN.md` §7: **「전송/확인 — 값이 비면 비활성」.** 눌러서 열고, 적고,
 * `[확인]` 을 눌러 확정한다. 키보드 `완료` 는 같은 동작이다 — 엄지로 끝낼 수 있어야 한다.
 *
 * **확정하면 이 줄은 사라진다** — 화면이 그렇게 그린다(`etcEditing`). 답은 칩이
 * 들고 있으므로(`withOtherLabel`) 같은 답을 두 자리에 두지 않는다(`06-c.md`
 * 「완료를 누르면 칩이 됩니다」). 고쳐 적으려면 기타를 껐다 다시 켠다.
 *
 * **입력 줄 밖을 눌렀다고 확정하지 않는다.** 옛 화면은 blur 로도 확정했는데,
 * 확정 버튼을 둔 이상 「눌러야 확정된다」가 하나여야 한다 — 스크롤하다 초점이
 * 빠지는 것과 확정하겠다는 뜻은 다르다.
 *
 * **별도 화면·시트로 보내지 않는다**(`06-b.md`) — 고른 칩들을 보면서 적어야
 * 무엇을 더할지 판단할 수 있다. 그래서 칩 바로 아래, 대화 영역 안이다.
 *
 * 상한에 닿으면 더 입력되지 않고 **오류 문구 없이 카운터 색만** 바뀐다(`06-c.md`).
 * 비어 있을 때의 한 줄은 **오류가 아니라** 무엇이 남았는지를 말한다.
 */
type Props = {
  value: string;
  onChangeText: (value: string) => void;
  /** `[확인]` · 키보드 `완료` 가 부른다. 확정 규칙(공백이면 취소)은 화면이 쥔다 */
  onCommit: () => void;
};

export function OtherReplyInput({ value, onChangeText, onCommit }: Props) {
  const empty = value.trim().length === 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <View style={styles.field}>
          <TextField
            variant="pill"
            value={value}
            onChangeText={onChangeText}
            onSubmitEditing={onCommit}
            placeholder="직접 입력"
            maxLength={MAX_OTHER_LENGTH}
            showCounter
            returnKeyType="done"
            accessibilityLabel="기타 직접 입력"
            onClear={() => onChangeText("")}
            clearLabel="기타 지우기"
          />
        </View>
        {/* 값이 비면 비활성 (`DESIGN.md` §7) — 빈 답을 확정할 수 없다 */}
        <Button label="확인" size="medium" disabled={empty} onPress={onCommit} />
      </View>

      {empty ? (
        <Text variant="caption1" color={labelColor.alternative}>
          기타에 무엇을 적을지 알려주세요.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // 칩과 같은 폭으로 붙는다 — 대화 영역 안이라 왼쪽 정렬이다
  wrap: { alignSelf: "stretch", gap: space.sm },
  // 카운터가 입력 아래에 붙으므로 위쪽 정렬 — 버튼이 카운터까지 늘어나지 않게
  row: { flexDirection: "row", alignItems: "flex-start", gap: space.sm },
  field: { flex: 1 },
});
