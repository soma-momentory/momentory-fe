import { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ListRenderItem,
  type ViewToken,
} from "react-native";

import { IconButton, Spinner, Text } from "@/components/ds";
import {
  background,
  elevation,
  hairline,
  homeV2,
  label as labelColor,
  line,
  overlay,
  radius,
  size,
  space,
  zIndex,
} from "@/design/ds";
import type { InboxNotification } from "@/features/notifications/data/inboxApi";
import type { InboxStatus } from "@/features/notifications/model/inbox";
import { formatKoreanDateShort } from "@/lib/day";

/**
 * 알림 팝오버 — 종 아래에 붙는 작은 카드(계획 §5.4 · `DESIGN.md` 「알림 모달(P5 목표)」).
 *
 * **표시 전용이다** — store · API · 라우터 · 계측을 모른다(`HomeV2View` 와 같은 원칙). 무엇을 읽음으로
 * 보낼지 · 어디로 갈지는 호출자가 콜백으로 정한다. 그래서 `HomeV2View` 안에 넣지 않고 따로 둔다 —
 * 운영 홈은 이것을 공유 뷰의 `overlay` 슬롯에 꽂는다.
 *
 * ## 화면이 아니다
 *
 * 라우트도 스택도 없다 — 글로벌 `Menu` 처럼 **화면 전체를 덮는 투명 레이어** 위에 카드 하나를 띄우고,
 * 바깥을 누르면 닫힌다. Android 뒤로가기도 닫기다(라우트가 아니라 하드웨어 뒤로를 직접 받는다).
 * 세로 자리는 호출자가 잰 `top`(종 바로 아래) 하나만 받는다 — 여기서 재지 않는다(결정 D3).
 *
 * ## 「본」 것만 알린다 (MF-1A)
 *
 * `onViewableItemsChanged`(면적 50% 이상 · 0.5초 이상)로 **실제로 나타난 항목**의 ID 만 `onSeen` 에
 * 넘긴다. 받았지만 카드 높이 밖에 있던 항목은 넘기지 않는다 — 그것이 읽음으로 가면 사용자가 보지
 * 않은 공지가 사라진다.
 *
 * ## 규칙
 *
 * - **숫자를 그리지 않는다** — 개수 · 배지 없음. 읽지 않음은 점 하나와 낭독 이름이다(`RULES.md` 4)
 * - **색만으로 말하지 않는다** — 읽지 않음은 점(모양) + 글자색 + 낭독 이름 「읽지 않음」.
 *   ⚠ 앱 서체가 교보손글씨 한 파일이라 굵기로는 위계가 서지 않는다(`typography.ts` 머리말) —
 *   계획의 「점 + 굵게」 대신 이 셋으로 둔다(결정 H2)
 * - **실패 · 빈 목록은 한 줄** — 재시도 버튼 · 경고 아이콘 없음
 */
type Props = {
  items: readonly InboxNotification[];
  status: InboxStatus;
  /** 이번에 연 동안 「읽지 않음」으로 그릴 ID — store 의 `unreadAtOpen` */
  unreadIds: readonly string[];
  /** 다음 쪽이 있다 — 끝에 닿으면 `onEndReached` */
  hasMore: boolean;
  /** 다음 쪽을 받는 중 — 목록 끝에 `Spinner` */
  loadingMore?: boolean;
  /** 카드 위쪽 y — 종 바로 아래. 호출자가 잰다 */
  top: number;
  onDismiss: () => void;
  onOpenSettings: () => void;
  /** 항목을 눌렀다 — `link` 가 있으면 이동, 없으면 펼침. 둘 다 호출자가 읽음을 보낼 기회다 */
  onPressItem: (item: InboxNotification) => void;
  onEndReached: () => void;
  onSeen: (ids: string[]) => void;
};

/** 카드 상한 — 계획 §5.4 「폭 = 화면 − 32 · 최대 360 · 최대 높이 = 화면의 60%」 */
const POPOVER_MAX_WIDTH = 360;
const POPOVER_MAX_HEIGHT_RATIO = 0.6;
/** 좌우 여백 — 32 를 둘로 나눈 것 */
const POPOVER_SIDE = space.lg;

/** 「본」 것의 문턱(MF-1A) — 렌더마다 새로 만들면 `FlatList` 가 거부한다 */
const VIEWABILITY = { itemVisiblePercentThreshold: 50, minimumViewTime: 500 } as const;

export const INBOX_EMPTY_MESSAGE = "아직 도착한 소식이 없어요";
export const INBOX_FAILED_MESSAGE = "알림을 불러오지 못했어요";
/**
 * 빈 · 실패 문안은 계획 §5.4 그대로 · `CRITICAL_NOTICE` 이름표는 「중요」(결정 D4).
 * 최종 문안이 아니다 — CP-1 검토 뒤 바꾼다(결정 H3)
 */
export const INBOX_CRITICAL_LABEL = "중요";

const pad = (n: number) => String(n).padStart(2, "0");

/** ISO 발행 시각 → 「10월 15일」 — 기기 달력 기준. 표기는 `lib/day.ts` 의 것을 쓴다 */
export function formatInboxDate(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  return formatKoreanDateShort(
    `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
  );
}

export function InboxPopover({
  items,
  status,
  unreadIds,
  hasMore,
  loadingMore = false,
  top,
  onDismiss,
  onOpenSettings,
  onPressItem,
  onEndReached,
  onSeen,
}: Props) {
  const window = useWindowDimensions();
  const width = Math.min(window.width - POPOVER_SIDE * 2, POPOVER_MAX_WIDTH);
  const maxHeight = window.height * POPOVER_MAX_HEIGHT_RATIO;

  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());

  // `FlatList` 는 viewability 콜백이 바뀌는 것을 허락하지 않는다 — 최신 콜백은 ref 로 건넨다
  const onSeenRef = useRef(onSeen);
  useEffect(() => {
    onSeenRef.current = onSeen;
  }, [onSeen]);
  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      const ids = viewableItems
        .filter((token) => token.isViewable)
        .map((token) => (token.item as InboxNotification | undefined)?.id)
        .filter((id): id is string => typeof id === "string");
      if (ids.length > 0) onSeenRef.current(ids);
    },
    [],
  );

  // Android 뒤로 = 닫기. 라우트가 아니라서 스택이 이것을 대신 받지 않는다
  const onDismissRef = useRef(onDismiss);
  useEffect(() => {
    onDismissRef.current = onDismiss;
  }, [onDismiss]);
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onDismissRef.current();
      return true;
    });
    return () => subscription.remove();
  }, []);

  const unread = new Set(unreadIds);

  const press = useCallback(
    (item: InboxNotification) => {
      if (item.link == null) {
        setExpanded((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) next.delete(item.id);
          else next.add(item.id);
          return next;
        });
      }
      onPressItem(item);
    },
    [onPressItem],
  );

  const renderItem: ListRenderItem<InboxNotification> = ({ item }) => (
    <InboxRow
      item={item}
      unread={unread.has(item.id)}
      expanded={expanded.has(item.id)}
      onPress={press}
    />
  );

  return (
    <View testID="inbox-popover-overlay" style={styles.root}>
      {/* 딤이 없다 — 뒤가 보여야 종에서 열린 것임을 잃지 않는다(`Menu` 와 같다) */}
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityRole="button"
        accessibilityLabel="알림 닫기"
        onPress={onDismiss}
      />
      {/* `accessibilityViewIsModal` 을 두지 않는다 — 낭독기 사용자도 「알림 닫기」(바깥)에 닿아야 한다 */}
      <View testID="inbox-popover-panel" style={[styles.panel, { top, width, maxHeight }]}>
        <View style={styles.header}>
          <Text variant="headline1" color={labelColor.strong} accessibilityRole="header">
            알림
          </Text>
          {/* 시간 의미의 임시 시계를 설정 조절 글리프로 바꾼다. 색·크기·히트는 DS를 따른다. */}
          <IconButton
            name="settings"
            size={size.icon.md}
            accessibilityLabel="알림 설정"
            color={labelColor.neutral}
            onPress={onOpenSettings}
          />
        </View>

        {status === "ready" && items.length > 0 ? (
          <FlatList
            testID="inbox-popover-list"
            data={items}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            extraData={[unreadIds, expanded]}
            onEndReached={hasMore ? onEndReached : undefined}
            onEndReachedThreshold={0.5}
            viewabilityConfig={VIEWABILITY}
            onViewableItemsChanged={onViewableItemsChanged}
            ItemSeparatorComponent={Separator}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footer}>
                  <Spinner />
                </View>
              ) : null
            }
          />
        ) : (
          <View testID={`inbox-popover-${status}`} style={styles.state}>
            {status === "ready" ? (
              <Text variant="body2" color={labelColor.alternative}>
                {INBOX_EMPTY_MESSAGE}
              </Text>
            ) : status === "failed" ? (
              <Text variant="body2" color={labelColor.alternative}>
                {INBOX_FAILED_MESSAGE}
              </Text>
            ) : (
              <Spinner />
            )}
          </View>
        )}
      </View>
    </View>
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

type RowProps = {
  item: InboxNotification;
  unread: boolean;
  expanded: boolean;
  onPress: (item: InboxNotification) => void;
};

function InboxRow({ item, unread, expanded, onPress }: RowProps) {
  const critical = item.kind === "critical";
  const date = formatInboxDate(item.createdAt);
  // 행이 낭독기 요소 하나로 묶여 자식 글자는 따로 읽히지 않는다 — 본문은 이름에 싣는다.
  // 펼치는 행은 펼쳤을 때만(접힌 동안은 제목만 듣고 고른다) · 링크 행은 펼침이 없어 늘 싣는다
  const spokenBody = item.body.length > 0 && (expanded || item.link != null) ? item.body : null;
  const name = [
    unread ? "읽지 않음" : null,
    critical ? INBOX_CRITICAL_LABEL : null,
    item.title,
    spokenBody,
    date,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Pressable
      testID={`inbox-item-${item.id}`}
      accessibilityRole={item.link != null ? "link" : "button"}
      accessibilityLabel={name}
      accessibilityState={item.link == null ? { expanded } : undefined}
      onPress={() => onPress(item)}
      style={styles.row}
    >
      {({ pressed }) => (
        <>
          <View style={styles.titleLine}>
            {unread ? <View testID={`inbox-unread-dot-${item.id}`} style={styles.dot} /> : null}
            {critical ? (
              <View style={styles.badge}>
                <Text variant="caption2" color={labelColor.neutral}>
                  {INBOX_CRITICAL_LABEL}
                </Text>
              </View>
            ) : null}
            <Text
              variant="body1"
              color={unread ? labelColor.strong : labelColor.normal}
              style={styles.title}
              numberOfLines={expanded ? undefined : 1}
            >
              {item.title}
            </Text>
          </View>
          {item.body.length > 0 ? (
            <Text
              variant="body2Reading"
              color={labelColor.neutral}
              numberOfLines={expanded ? undefined : 2}
            >
              {item.body}
            </Text>
          ) : null}
          <Text variant="caption1" color={labelColor.alternative}>
            {date}
          </Text>
          {pressed ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.scrim]} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0, zIndex: zIndex.overlay },
  panel: {
    position: "absolute",
    right: POPOVER_SIDE,
    paddingBottom: space.xs,
    backgroundColor: background.elevated,
    borderRadius: radius.large,
    ...hairline.neutral,
    ...elevation.overlay,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: space.lg,
    paddingRight: space.xs,
    paddingTop: space.xs,
  },
  state: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
    paddingVertical: space.xl2,
  },
  row: { gap: space.xs, paddingHorizontal: space.lg, paddingVertical: space.md },
  titleLine: { flexDirection: "row", alignItems: "center", gap: space.sm },
  title: { flexShrink: 1 },
  dot: {
    width: homeV2.size.bell.dot,
    height: homeV2.size.bell.dot,
    borderRadius: radius.full,
    backgroundColor: homeV2.color.alert,
  },
  badge: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs2,
    borderRadius: radius.full,
    ...hairline.normal,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: space.lg,
    backgroundColor: line.alternative,
  },
  footer: { paddingVertical: space.md, alignItems: "center" },
  scrim: { backgroundColor: overlay.pressLight },
});
