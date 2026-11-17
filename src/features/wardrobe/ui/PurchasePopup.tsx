import { Pressable, StyleSheet, View } from "react-native";

import { Icon, Text } from "@/components/ds";
import { homeV2, space, wardrobe } from "@/design/ds";
import { REFLECTION_LABEL, ReflectionButton } from "@/features/home/ui/v2/HeroCard";
import { Rug, RUG_ASPECT } from "@/features/home/ui/v2/Rug";

import type { Outfit, WardrobeItem, WardrobeItemArt } from "../model/types";
import { BabaFigure } from "./BabaFigure";
import { TangerineIcon } from "./Tangerine";
import { WardrobePopup } from "./WardrobePopup";

const P = wardrobe.popup;
/** 3:4 캔버스에서 바바 발이 닿는 높이(아래에서) — 러그를 발밑에 깐다 */
const FEET_FROM_BOTTOM = 0.17;

/**
 * 안 가진 아이템을 누르면 뜬다 — 러그 위에 앉아 그 아이템을 써 본 바바 · 이름 · 「잠금 해제 · 귤 · 값」(홈과 같은 천 라벨).
 * 이 버튼이 되돌릴 수 없는 사기의 확인이다(따로 묻지 않는다). 귤이 모자라면 버튼이 바래고 한 줄로 알린 뒤
 * 귤 모으는 곳으로 안내한다.
 */
export function PurchasePopup({
  art,
  item,
  outfit,
  tangerines,
  busy,
  onBuy,
  onGather,
  onDismiss,
}: {
  art: WardrobeItemArt;
  item: WardrobeItem;
  outfit: Outfit;
  tangerines: number;
  busy: boolean;
  onBuy: () => void;
  onGather: () => void;
  onDismiss: () => void;
}) {
  const affordable = item.price <= tangerines;
  const babaHeight = (P.baba * 4) / 3;
  return (
    <WardrobePopup
      testID="purchase-popup"
      accessibilityLabel={`${art.name}, 귤 ${item.price}개`}
      onDismiss={onDismiss}
    >
      <View style={{ width: P.rug, height: babaHeight }}>
        <View
          style={[
            styles.rug,
            {
              width: P.rug,
              height: P.rug * RUG_ASPECT,
              bottom: babaHeight * FEET_FROM_BOTTOM - (P.rug * RUG_ASPECT) / 2,
            },
          ]}
        >
          <Rug />
        </View>
        <View style={styles.baba}>
          <BabaFigure outfit={{ ...outfit, [art.slot]: art.id }} width={P.baba} />
        </View>
      </View>
      <Text variant="title3Hand" color={homeV2.color.ink}>
        {art.name}
      </Text>
      {affordable ? null : (
        <Text style={styles.note} color={homeV2.color.muted}>
          귤이 모자라요
        </Text>
      )}
      <ReflectionButton
        testID="wardrobe-unlock"
        label="잠금 해제"
        accessibilityLabel={`잠금 해제, 귤 ${item.price}개`}
        trailing={
          <View style={styles.price}>
            <TangerineIcon size={wardrobe.buttonIcon + 4} />
            <Text style={REFLECTION_LABEL} color={homeV2.color.white}>
              {String(item.price)}
            </Text>
          </View>
        }
        disabled={!affordable || busy}
        onPress={onBuy}
        style={styles.button}
      />
      {affordable ? null : (
        <Pressable
          onPress={onGather}
          accessibilityRole="button"
          hitSlop={space.sm}
          style={styles.gather}
        >
          <Text style={styles.note} color={homeV2.color.ink}>
            귤 모으러 가기
          </Text>
          <Icon name="chevron-right" size={16} color={homeV2.color.ink} />
        </Pressable>
      )}
    </WardrobePopup>
  );
}

const styles = StyleSheet.create({
  rug: { position: "absolute", left: 0 },
  baba: { position: "absolute", left: (P.rug - P.baba) / 2, top: 0 },
  note: { fontFamily: homeV2.font.regular, ...homeV2.type.note },
  price: { flexDirection: "row", alignItems: "center", gap: space.xs },
  // 팝업이 이미 좌우 여백을 준다 — 천 라벨의 바깥 여백은 뺀다
  button: { alignSelf: "stretch", marginTop: space.xs, marginHorizontal: 0 },
  gather: { flexDirection: "row", alignItems: "center", gap: space.xs2, paddingTop: space.xs },
});
