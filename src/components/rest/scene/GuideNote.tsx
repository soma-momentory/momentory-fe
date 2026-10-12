import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";

import { Text } from "@/components/ds";
import { label as labelColor, restMoodMotion, restScene } from "@/design/ds";
import { REST_GUIDE_CLOSE, REST_GUIDES } from "@/features/rest/model/restGuide";
import type { RestRecordContent } from "@/features/rest/model/restRecord";

import { CapybaraNote } from "./CapybaraNote";
import { ScenePillButton } from "./SceneChrome";

/**
 * 쉼터 **설명 쪽지** (2026-10-12 · 사용자와 정함) — 처음 들어간 쉼터에서 저절로, 그 뒤로는 뒤로가기 원
 * 옆 「?」 원으로 뜬다(`useRestGuide`). 나갈 때 기분 쪽지와 같은 쪽지다(`CapybaraNote`).
 *
 * 손글씨로 크게 「왜」 한 줄, 그 아래 「어떻게」. 닫는 알약은 쪽지가 다 내려앉은 **뒤에** 붙는다 —
 * 먼저 뜨면 어색했다(`DESIGN.md` 「쉼 콘텐츠 공통 규칙」 4).
 */
export function GuideNote({
  content,
  onClose,
}: {
  content: RestRecordContent;
  onClose: () => void;
}) {
  const guide = REST_GUIDES[content];
  const [landed, setLanded] = useState(false);

  useEffect(() => {
    // 다 내려앉은 때는 시계가 말한다 — 네이티브 드라이버의 완료 콜백은 테스트에 오지 않는다
    const t = setTimeout(() => setLanded(true), restMoodMotion.land);
    return () => clearTimeout(t);
  }, []);

  return (
    <CapybaraNote
      testID="rest-guide-note"
      footer={
        landed ? <ScenePillButton tone="accent" label={REST_GUIDE_CLOSE} onPress={onClose} /> : null
      }
    >
      <Text variant="title3Hand" color={restScene.ink} style={styles.mid}>
        {guide.why}
      </Text>
      <Text variant="body1ReadingHandLg" color={labelColor.normal} style={styles.mid}>
        {guide.how}
      </Text>
    </CapybaraNote>
  );
}

const styles = StyleSheet.create({
  mid: { textAlign: "center" },
});
