import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Animated, Image, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Chip, TabScreen, Text } from "@/components/ds";
import { layout, background, label, line, radius, space, wardrobe as size } from "@/design/ds";
import { track } from "@/features/analytics";
import { ART_BY_ID } from "@/features/wardrobe/model/figure";
import type { WardrobeSlot } from "@/features/wardrobe/model/types";
import {
  shopItems,
  SLOT_LABEL,
  SLOTS,
  useWardrobe,
  wearToggled,
  type ShopFilter,
} from "@/features/wardrobe/model/wardrobe";
import { BabaFigure } from "@/features/wardrobe/ui/BabaFigure";
import { PurchasePopup } from "@/features/wardrobe/ui/PurchasePopup";
import { TangerineChip, TangerineIcon } from "@/features/wardrobe/ui/Tangerine";
import { TangerineMissionSheet } from "@/features/wardrobe/ui/TangerineMissionSheet";
import { WelcomePopup } from "@/features/wardrobe/ui/WelcomePopup";
import { showToast } from "@/lib/toast";

const FILTERS: readonly ShopFilter[] = ["all", ...SLOTS];
const FILTER_LABEL: Record<ShopFilter, string> = { all: "전체", ...SLOT_LABEL };
/**
 * 칸 폭 — 목록 폭에서 칸 사이 틈을 빼고 칸 수로 나눈다. 예전에는 30% 셋 + 틈으로 두어 오른쪽에 약 20pt 가 남아
 * 칸들이 왼쪽으로 쏠려 보였다(2026-11-17). 폭을 재기 전 첫 그림만 비율로 그린다
 */
const cellWidth = (listWidth: number) =>
  listWidth > 0
    ? (listWidth - space.sm * (size.columns - 1)) / size.columns
    : (`${Math.floor(100 / size.columns) - 3}%` as const);

/**
 * 바바 꾸미기(옷장 겸 상점 · 2026-11-17) — 탭바의 「꾸미기」 탭이다(리포트 자리였다). 첫 선물을 아직 안 받았으면 열자마자 선물 팝업이 뜬다.
 *
 * 위의 바바는 **지금 입은 모습**이다. 가진 아이템은 누르는 즉시 입고, 입은 것을 다시 누르면 벗는다(되돌릴 수 있어 묻지 않는다).
 * 안 가진 아이템은 팝업으로 씌워 보여 주고, 팝업의 「잠금 해제」가 사기의 확인이다. 귤 지급 · 값 · 가진 것의 정본은 서버다.
 */
export default function WardrobeScreen() {
  const loaded = useWardrobe((s) => s.loaded);
  const failed = useWardrobe((s) => s.failed);
  const tangerines = useWardrobe((s) => s.tangerines);
  const outfit = useWardrobe((s) => s.outfit);
  const items = useWardrobe((s) => s.items);
  const todayRewards = useWardrobe((s) => s.todayRewards);
  const attendanceDay = useWardrobe((s) => s.attendanceDay);
  const attendanceRewards = useWardrobe((s) => s.attendanceRewards);
  const welcomed = useWardrobe((s) => s.welcomed);
  /** 첫 선물 팝업을 닫았다 — 이번에 연 동안은 다시 띄우지 않는다(받지 않았으면 다음에 열 때 또 뜬다) */
  const [welcomeClosed, setWelcomeClosed] = useState(false);
  const [filter, setFilter] = useState<ShopFilter>("all");
  /** 사기 팝업에 띄운 아이템 id */
  const [buying, setBuying] = useState<string | null>(null);
  const [missions, setMissions] = useState(false);
  const [busy, setBusy] = useState(false);
  const [listWidth, setListWidth] = useState(0);
  /** 갈아입는 순간 위의 바바가 톡 튄다(`bounce`) */
  const [pop] = useState(() => new Animated.Value(1));

  // 탭이라 화면이 남아 있다 — 다시 올 때마다 귤 · 가진 것을 새로 받는다(미션에서 받은 귤이 칩에 바로 보이게)
  useFocusEffect(
    useCallback(() => {
      track("wardrobe_opened", { tangerines: useWardrobe.getState().tangerines });
      void useWardrobe.getState().load();
    }, []),
  );

  const acceptWelcome = async () => {
    setBusy(true);
    const amount = await useWardrobe.getState().welcome();
    setBusy(false);
    if (amount == null) {
      showToast("지금은 선물을 받지 못했어요");
      return;
    }
    setWelcomeClosed(true);
    if (amount > 0) showToast(`귤 ${amount}개를 받았어요`, "positive");
  };

  /** 위의 바바가 톡 튄다 — 입고 벗을 때는 작게, 잠금 해제해 입힐 때는 크게 */
  const bounce = (scale: number) => {
    pop.stopAnimation();
    pop.setValue(1);
    Animated.sequence([
      Animated.timing(pop, { toValue: scale, duration: 140, useNativeDriver: true }),
      Animated.spring(pop, { toValue: 1, stiffness: 260, damping: 10, useNativeDriver: true }),
    ]).start();
  };

  const toggleWear = async (slot: WardrobeSlot, id: string) => {
    bounce(size.bounce.wear);
    const ok = await useWardrobe.getState().wear(wearToggled(outfit, slot, id));
    if (!ok) showToast("지금은 갈아입지 못했어요");
  };

  const buyAndWear = async (slot: WardrobeSlot, id: string) => {
    setBusy(true);
    const outcome = await useWardrobe.getState().purchase(id);
    if (outcome !== "bought") {
      setBusy(false);
      showToast(outcome === "not_enough" ? "귤이 모자라요" : "지금은 잠금 해제하지 못했어요");
      return;
    }
    // 산 것을 입히기까지 팝업을 열어 두고 버튼을 막는다 — 그 틈에 두 번 눌리지 않게
    const worn = await useWardrobe
      .getState()
      .wear({ ...useWardrobe.getState().outfit, [slot]: id });
    setBusy(false);
    setBuying(null);
    if (worn) bounce(size.bounce.unlock);
    showToast(worn ? "바바가 갈아입었어요" : "잠금 해제했어요", worn ? "positive" : undefined);
  };

  const slots = filter === "all" ? SLOTS : [filter];
  const buyingArt = buying == null ? undefined : ART_BY_ID.get(buying);
  const buyingItem = items.find((item) => item.id === buying);

  return (
    <TabScreen
      active="꾸미기"
      overlay={
        <>
          {buyingArt != null && buyingItem != null ? (
            <PurchasePopup
              art={buyingArt}
              item={buyingItem}
              outfit={outfit}
              tangerines={tangerines}
              busy={busy}
              onBuy={() => void buyAndWear(buyingArt.slot, buyingArt.id)}
              onGather={() => {
                setBuying(null);
                setMissions(true);
              }}
              onDismiss={() => (busy ? undefined : setBuying(null))}
            />
          ) : null}
          {loaded && !welcomed && !welcomeClosed ? (
            <WelcomePopup
              busy={busy}
              onAccept={() => void acceptWelcome()}
              onDismiss={() => (busy ? undefined : setWelcomeClosed(true))}
            />
          ) : null}
          {missions ? (
            <TangerineMissionSheet
              todayRewards={todayRewards}
              attendanceDay={attendanceDay}
              attendanceRewards={attendanceRewards}
              onDismiss={() => setMissions(false)}
            />
          ) : null}
        </>
      }
    >
      {/*
        제목은 화면 가운데에 고정하고 귤 칩은 오른쪽에 띄운다. 상단 내비(`TopNavigation`)는 좌우 칸을 같은 폭(44)으로
        잡는데 귤 칩이 그보다 넓어 제목이 왼쪽으로 밀렸다(2026-11-17 사용자)
      */}
      <View style={styles.header}>
        <Text variant="title3Hand" color={label.strong} accessibilityRole="header">
          바바 꾸미기
        </Text>
        {/* 받기 전에는 귤 수를 모른다 — 0 을 먼저 보였다가 바꾸지 않는다 */}
        {loaded ? (
          <View style={styles.headerChip}>
            <TangerineChip count={tangerines} onPress={() => setMissions(true)} />
          </View>
        ) : null}
      </View>

      <Animated.View style={[styles.preview, { transform: [{ scale: pop }] }]}>
        <BabaFigure outfit={outfit} width={size.previewWidth} />
      </Animated.View>

      <View style={styles.tabs} accessibilityRole="tablist">
        {FILTERS.map((f) => (
          <Chip
            key={f}
            label={FILTER_LABEL[f]}
            selected={filter === f}
            onPress={() => setFilter(f)}
          />
        ))}
      </View>

      {!loaded && failed ? (
        <Text variant="body2" color={label.alternative} style={styles.failed}>
          옷장을 불러오지 못했어요
        </Text>
      ) : null}

      <ScrollView
        testID="wardrobe-list"
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onLayout={(e) => setListWidth(e.nativeEvent.layout.width)}
      >
        {loaded
          ? slots.map((slot) => (
              <View key={slot} style={styles.section}>
                {filter === "all" ? (
                  <Text variant="label1" color={label.neutral}>
                    {SLOT_LABEL[slot]}
                  </Text>
                ) : null}
                <View style={styles.grid}>
                  {shopItems(items, slot).map(({ art, item }) => {
                    const worn = outfit[slot] === art.id;
                    const locked = !item.owned;
                    const note = worn ? "착용 중" : locked ? `귤 ${item.price}개` : null;
                    return (
                      <Pressable
                        key={art.id}
                        testID={`wardrobe-item-${art.id}`}
                        onPress={() => (locked ? setBuying(art.id) : void toggleWear(slot, art.id))}
                        accessibilityRole="button"
                        accessibilityState={{ selected: worn }}
                        accessibilityLabel={[art.name, note].filter(Boolean).join(", ")}
                        style={[
                          styles.cell,
                          {
                            width: cellWidth(listWidth),
                            borderWidth: worn ? size.itemBorder.selected : size.itemBorder.normal,
                            borderColor: worn ? label.normal : line.neutral,
                          },
                        ]}
                      >
                        <Image source={art.shop} style={styles.itemImage} resizeMode="contain" />
                        <Text
                          variant="caption1"
                          color={label.normal}
                          numberOfLines={2}
                          style={styles.name}
                        >
                          {art.name}
                        </Text>
                        {worn ? (
                          <View style={styles.worn}>
                            <Text variant="caption2" color={label.onFill}>
                              착용 중
                            </Text>
                          </View>
                        ) : locked ? (
                          <View style={styles.price}>
                            <TangerineIcon size={size.cellIcon} />
                            <Text variant="caption2" color={label.neutral}>
                              {item.price}
                            </Text>
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          : null}
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  header: { minHeight: layout.minTouch + space.md, alignItems: "center", justifyContent: "center" },
  headerChip: { position: "absolute", right: 0 },
  preview: { alignItems: "center", paddingVertical: space.md },
  tabs: { flexDirection: "row", justifyContent: "center", gap: space.sm, paddingBottom: space.md },
  list: { gap: space.xl, paddingBottom: space.xl },
  section: { gap: space.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: space.sm },
  cell: {
    alignItems: "center",
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.sm,
    paddingHorizontal: space.xs,
    borderRadius: radius.large,
    backgroundColor: background.elevated,
  },
  itemImage: { width: size.itemImage, height: size.itemImage },
  lockedImage: { opacity: size.lockedOpacity },
  name: { textAlign: "center" },
  failed: { textAlign: "center", paddingVertical: space.lg },
  price: { flexDirection: "row", alignItems: "center", gap: space.xs2 },
  worn: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs2,
    borderRadius: radius.full,
    backgroundColor: label.normal,
  },
});
