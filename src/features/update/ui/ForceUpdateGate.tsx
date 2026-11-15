import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Screen, Text } from "@/components/ds";
import { label, space } from "@/design/ds";
import { Baba } from "@/features/home/ui/v2/Baba";
import { openAppStore } from "@/lib/links";

import { checkMustUpdate } from "../model/forceUpdate";

/**
 * 앱 전체를 감싸 **필수 업데이트보다 낮은 버전이면 화면을 막는다**(`model/forceUpdate.ts`).
 *
 * 판정하는 동안은 앱을 그대로 보여 준다 — 대부분은 통과이므로 시작을 붙잡지 않는다.
 * 막아야 하면 그때 바꿔 그린다. 판정은 시작할 때 한 번이다: 스토어에 다녀와도
 * 업데이트하지 않았다면 그대로 막혀 있어야 하고, 업데이트했다면 앱이 새로 뜬다.
 *
 * 한 장에 그림 · 문장 · 버튼 하나 — 갈 곳은 스토어 하나뿐이다.
 */
export function ForceUpdateGate({ children }: { children: ReactNode }) {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    let alive = true;
    void checkMustUpdate().then((must) => {
      if (alive && must) setBlocked(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!blocked) return children;

  return (
    <Screen>
      <View style={styles.body}>
        <Baba />
        <Text variant="title3Hand" color={label.normal} style={styles.message}>
          새 버전으로 업데이트하고 다시 만나요
        </Text>
      </View>
      <View style={styles.footer}>
        <Button label="업데이트하기" fill onPress={() => void openAppStore()} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: space.xl2 },
  message: { textAlign: "center" },
  footer: { paddingBottom: space.lg },
});
