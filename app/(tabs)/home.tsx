import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  PixelRatio,
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  Button,
  Card,
  Icon,
  IconButton,
  Menu,
  Modal,
  SectionHeader,
  TabScreen,
  Text,
  Toast,
  type MenuAction,
} from "@/components/ds";
import {
  iosVariant,
  label as labelColor,
  layout,
  maxFontScale,
  size,
  space,
  status,
  text,
} from "@/design/ds";
import { useDiary } from "@/features/diary/model/diary";
import {
  MAX_VISIBLE_SCHEDULES,
  remainingLabel,
  useDay,
  useTodayContext,
  visibleSchedules,
  weekStartOf,
} from "@/features/home/model/day";
import { HomeCapybara } from "@/features/home/ui/HomeCapybara";
import { GrassButton } from "@/features/home/ui/GrassButton";
import { ScheduleList } from "@/features/home/ui/ScheduleList";
import { WeekEmotionStrip } from "@/features/home/ui/WeekEmotionStrip";
import { useSettings } from "@/features/my/model/settings";
import { weekDays, weekEnd } from "@/features/report/model/report";
import { formatKoreanDateShort, koreanWeekday } from "@/lib/day";
import { formatKoreanTime } from "@/lib/time";

/**
 * `12` · 홈 · 일정을 가져온 상태 + `12-b` · 일정이 없는 경우
 *
 * ## 새 디자인 (2026-08-20 · `PLAN.md` A Phase 4)
 *
 * 날씨 씬(하늘·언덕·카피바라·병아리)이 **전부 사라지고** 네 칸이 남았다
 * (`Home Sample.dc.html` · `DESIGN.md` 「홈」):
 * **날짜 + 알림 → 하루 돌아보기 CTA → 이번 주 감정 → 오늘 일정.**
 *
 * 2세대에서 뺐던 「하루 돌아보기」가 **되돌아왔다** — 이번엔 줄이 아니라 카드 안의
 * Solid Primary CTA 이고, **화면에서 유일한 solid 버튼**이다(`DESIGN.md` §6).
 * 회고를 여는 병아리가 없어졌으니 문이 다시 글자로 돌아온 셈이다.
 *
 * ## 카피바라가 그 카드에 앉았다 (2026-09-10 · 사용자 시안)
 *
 * 씬 전체가 사라졌던 자리에 **캐릭터 하나가 돌아왔다** — 하늘도 언덕도 없이,
 * 「하루 돌아보기」 카드의 오른쪽 아래에 앉는다(`HomeCapybara`). 카드가 **두 칸**이
 * 되면서 CTA 는 **왼쪽 칸을 가로로 다 쓰고**, 오른쪽 칸이 그림 자리다.
 *
 * ⚠ **「일러스트를 두지 않는다」와 부딪히지 않는다.** 그 규칙은 아래 `12-b`,
 * 즉 **비어 있는 자리를 달래는 그림**을 겨냥한 것이고 거기는 지금도 글자뿐이다.
 * 카피바라는 빈칸이 아니라 **말을 거는 카드**에 앉아 있다.
 *
 * ## 지키는 규칙
 *
 * - **`12-b` 는 별도 레이아웃이 아니다** — 머리도 `＋ 추가`도 자리를 지키고
 *   **목록 슬롯의 줄만 초대 문구로 바뀐다**
 * - **빈 자리에 안내 그림을 두지 않는다** — 비어 있는 것은 문제가 아니라 시작이다
 *   (⚠ 카드의 카피바라는 빈 자리가 아니다 — 위 「카피바라가 그 카드에 앉았다」)
 * - **진행률·연속 배지·점수를 두지 않는다.** 「N개 남음」은 **남은 수**이지
 *   달성률이 아니다(`DESIGN.md` 「홈」이 「2/4 마침」을 이 말로 바꿨다)
 * - **완료에 감정을 묻지 않는다**(N7 · `PLAN.md` A-8). 체크박스 한 번으로 끝나고
 *   마친 줄은 **취소선 + `label.neutral`** 로 목록에 남는다
 * - 일정 순서는 **꾹 눌러 끈다**(`ScheduleList`), 수정·삭제는 **⋮ 메뉴**(시안 4-2)
 *
 * ## 메뉴·모달·토스트는 상태이고, 입력 바는 라우트다
 *
 * 고르면 사라지는 것(⋮ 메뉴 · 확인 모달 · 토스트)은 이력에 남을 것이 없어 화면이
 * 상태로 든다. 반대로 **입력 바(`12-c`·`12-e`)는 라우트**다 — 뒤로가기가 닫기여야
 * 하기 때문이다(`PLAN.md` A-4).
 */
/**
 * 날짜 단 — **화면에서 가장 큰 글자**이자 손글씨다(32/42 · `DESIGN.md` §2).
 *
 * 원래 `title3`(다른 탭의 화면 제목과 같은 단)였는데 2026-08-22 에 두 단 올리고
 * **서체도 손글씨로 갈았다** — 홈에는 화면 제목이 따로 없고 날짜가 그 자리를
 * 대신한다. `DESIGN.md` §2 표와 §10 「제목」 줄을 함께 고쳤다(이 저장소가 그
 * 문서를 소유한다 — `PLAN.md` A-18).
 *
 * 정렬 계산(`datePaddingTop` · `weekdayIndent`)이 같은 값을 봐야 해서 이름으로 묶어 둔다.
 */
const DATE_VARIANT = "title1Hand" as const;

/**
 * 손글씨가 글자칸 **위쪽**에 붙는 정도 — 행간 대비 비율.
 *
 * 고딕과 달리 글자가 칸 가운데에 앉지 않아서, 수치상 중심을 맞추면 눈에는 높이
 * 떠 보인다. **고정 dp 가 아니라 비율인 이유**는 이 뜨는 양이 글자 크기에
 * 비례하기 때문이다 — 단을 키우거나(28→32) 기기의 글꼴 배율이 커지면 어긋난
 * 양도 같은 비율로 커진다. 한 기기에서 맞춰 둔 4dp 는 다른 기기에서 다시 어긋난다.
 */
const HAND_TOP_BEARING = 0.1;

/**
 * 손글씨 첫 획이 글자칸 **왼쪽**에서 뜨는 정도 — 글자 크기 대비 비율.
 *
 * 날짜(큰 글자)와 요일(작은 글자)은 같은 서체라도 뜨는 폭이 달라서 왼쪽 끝이
 * 안 맞아 보인다. 그 **차이만큼** 요일을 들여쓰면 둘의 첫 획이 한 줄에 선다.
 */
const HAND_LEFT_BEARING = 0.22;

/**
 * 카피바라가 카드 안쪽 패딩으로 파고드는 양 — 카드 패딩(`padding="loose"` · 22)보다
 * 작아야 **카드 안에 머문다.** 오른쪽·아래에 같은 값으로 걸리므로 **이 값을 줄이면
 * 그림이 왼쪽 위로 함께 옮겨 간다.**
 *
 * 16 이었는데 8 로 줄였다(2026-09-10 · 사용자 요청) — 모서리에 너무 붙어 있었다.
 * 이제 카드 안쪽 가장자리에서 14 를 띄우고 앉는다.
 *
 * ⚠ 2026-09-11 에 아래쪽만 2 로 줄여 캐릭터를 6dp 올려 봤다(그림자 아래끝을 잔디 버튼 아래끝에
 * 맞추려고). 실기기에서 보니 **원래 자리가 더 나아** 되돌렸다 — 발이 버튼 아래끝보다 살짝 내려앉은
 * 지금 모습이 카드에 앉아 있는 느낌을 준다.
 */
const CHAR_BLEED = 8;

/**
 * CTA 를 글자 덩어리에서 더 떨어뜨리는 양 — **아주 조금**이다
 * (2026-09-10 · 사용자 요청). 카드가 그만큼 높아진다 — 버튼만 내려앉을 자리가
 * 카드 안에 따로 없어서, 왼쪽 칸이 길어지고 카드가 따라 늘어난다.
 */
const CTA_DROP = 6;

/**
 * CTA 의 크기 — 기본 버튼(48 · 글자 칸 전체)보다 **조금 작게** 둔다(2026-09-11 · 사용자 요청).
 * 높이는 44, 폭은 글자 칸의 90% 다. 글자 크기는 그대로다 — 줄이는 것은 잔디 면뿐이다.
 *
 * ⚠ **왼쪽 끝은 제목 「오늘 하루는 어땠어요?」의 「오」와 같은 선이다**(같은 날 요청). 왼쪽으로
 * 빼던 값을 지웠다 — 잔디의 가장 넓은 줄이 상자 왼쪽 끝에 닿아, 밀지 않으면 제목 첫 획과
 * 정확히 맞는다(실기기에서 둘 다 x=130px 로 쟀다).
 */
const CTA_HEIGHT = 44;
const CTA_WIDTH = "90%";

export default function Home() {
  const schedules = useDay((s) => s.schedules);
  const toggleDone = useDay((s) => s.toggleDone);
  const moveSchedule = useDay((s) => s.moveSchedule);
  const reorderSchedule = useDay((s) => s.reorderSchedule);
  const hide = useDay((s) => s.hide);
  const remove = useDay((s) => s.remove);
  const load = useDay((s) => s.load);
  const diaries = useDiary((s) => s.diaries);
  const insets = useSafeAreaInsets();
  /**
   * 기기의 글꼴 배율. **`useWindowDimensions` 로 받는 이유**는 설정에서 글꼴
   * 크기를 바꾸면 앱이 살아 있는 채로 값이 바뀌고, 그때 다시 그려야 하기
   * 때문이다(`PixelRatio.getFontScale()` 은 한 번 읽고 끝이라 안 따라온다).
   * 천장은 `Text` 가 실제로 적용하는 것과 같은 값을 본다.
   */
  const { fontScale } = useWindowDimensions();

  /**
   * 날짜 칸의 위 여백 · 요일 들여쓰기 — **기기마다 다르게 계산된다.**
   *
   * `StyleSheet` 에 고정 dp 로 박으면 글꼴 배율이 큰 기기에서 어긋난다: 글자는
   * 배율만큼 커지는데 여백은 그대로라, 종과 맞춰 둔 중심선이 밀린다. 그래서
   * **글자 높이에서 계산하고 배율을 곱한다.**
   *
   * - 위 여백 = 종(44) 한가운데에 날짜 줄을 맞추고(`(44 − 줄높이) / 2`),
   *   손글씨가 칸 위에 붙는 만큼 더 내린다
   * - 들여쓰기 = 날짜와 요일의 **글자 크기 차이**에 왼쪽 뜨는 비율을 곱한다
   *
   * 반올림은 기기 픽셀 격자에 맞춘다 — 소수 여백은 글자 가장자리를 흐리게 만든다.
   */
  const scale = Math.min(fontScale, maxFontScale);
  const dateLine = text[DATE_VARIANT].lineHeight * scale;
  const datePaddingTop = PixelRatio.roundToNearestPixel(
    Math.max((layout.minTouch - dateLine) / 2, 0) + HAND_TOP_BEARING * dateLine,
  );
  const weekdayIndent = PixelRatio.roundToNearestPixel(
    HAND_LEFT_BEARING * (text[DATE_VARIANT].fontSize - text.label1Hand.fontSize) * scale,
  );

  const [dragging, setDragging] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menu, setMenu] = useState<{ id: string; top: number } | null>(null);
  const [asking, setAsking] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { date: today } = useTodayContext();
  // 알림 설정(M3)과 같은 store 를 본다 — 홈이 다른 시각을 말하면 안 된다
  const retroNotify = useSettings((s) => s.notify.retro);

  // 일정은 서버가 정본이다 — 홈이 뜰 때 받아온다. **못 받아도 화면은 그대로
  // 그린다**(빈 목록 = `12-b`) — 로딩 표시도 안내도 두지 않는다(`RULES.md` 4)
  useEffect(() => {
    void load();
  }, [load]);

  const shown = visibleSchedules(schedules);
  const empty = shown.length === 0;
  const folded = !expanded && shown.length > MAX_VISIBLE_SCHEDULES;
  const rows = folded ? shown.slice(0, MAX_VISIBLE_SCHEDULES) : shown;
  const allDone = !empty && shown.every((s) => s.done);

  // 이번 주(일~토)의 감정 — 일기가 남긴 값을 리포트와 **같은 계산**으로 본다.
  // 두 화면이 같은 주를 다르게 세면 어느 쪽이 맞는지 알 수 없게 된다
  const week = useMemo(() => {
    const start = weekStartOf(today);
    return weekDays(diaries, start, weekEnd(start));
  }, [diaries, today]);

  const target = schedules.find((s) => s.id === menu?.id) ?? null;
  const actions: MenuAction[] =
    target == null
      ? []
      : target.source === "manual"
        ? [
            {
              label: "수정하기",
              icon: "pencil",
              onPress: () => {
                setMenu(null);
                router.push(`/home/schedule/${target.id}`);
              },
            },
            {
              label: "삭제하기",
              icon: "trash",
              negative: true,
              onPress: () => {
                setMenu(null);
                setAsking(target.id);
              },
            },
          ]
        : [
            /**
             * 가져온 일정도 **「삭제하기」라고 말한다**(2026-08-22 · 사용자 요청 ·
             * `PRODUCT.md` 상류와 차이 27). 스펙은 「홈에서 숨기기」였다 —
             * 캘린더 원본이 지워졌다고 오해할까 봐 이름을 갈라 뒀던 자리다.
             *
             * **하는 일은 그대로 `hidden` 플래그 하나다** — 기기 캘린더는 읽기만
             * 하므로(`lib/calendar.ts`) 원본은 건드리지 않는다. 이름만 같아졌으니
             * **그 사실은 토스트 한 줄이 말한다.**
             *
             * ⚠ **확인 모달은 두지 않는다**(결정 2026-08-22). 직접 추가한 일정과
             * 이름은 같지만 **지워지는 것이 없다** — 캘린더 원본도 서버 레코드도
             * 남고 플래그만 켜진다. 모달은 되돌릴 수 없는 행동에만 쓴다
             * (`DESIGN.md` N2). 다시 켜는 화면이 MVP 에 없다는 반론이 있었고,
             * 그 자리에는 마찰 대신 토스트의 안심 한 줄을 두기로 했다.
             */
            {
              label: "삭제하기",
              icon: "trash",
              negative: true,
              onPress: () => {
                setMenu(null);
                hide(target.id);
                setToast("일정을 삭제했어요 · 캘린더 원본은 그대로 있어요");
              },
            },
          ];

  return (
    <TabScreen
      active="홈"
      overlay={
        <>
          {menu != null && actions.length > 0 ? (
            <Menu actions={actions} top={menu.top} onDismiss={() => setMenu(null)} />
          ) : null}

          {asking != null ? (
            <Modal
              title="이 일정을 삭제할까요?"
              description="삭제한 일정은 되돌릴 수 없어요."
              cancelLabel="취소"
              confirmLabel="삭제"
              destructive
              onCancel={() => setAsking(null)}
              onConfirm={() => {
                remove(asking);
                setAsking(null);
                setToast("일정을 삭제했어요.");
              }}
            />
          ) : null}

          {toast != null ? (
            <Toast message={toast} variant="positive" onDismiss={() => setToast(null)} />
          ) : null}
        </>
      }
    >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        // 줄을 끄는 동안에는 스크롤을 멈춘다 — 손가락 하나가 두 일을 하지 않게
        scrollEnabled={!dragging}
      >
        <View style={styles.head}>
          {/* 날짜 줄이 종과 같은 높이에 선다 — 값은 위에서 배율까지 넣어 계산한다 */}
          <View style={{ paddingTop: datePaddingTop }}>
            <Text variant={DATE_VARIANT} color={labelColor.strong}>
              {formatKoreanDateShort(today)}
            </Text>
            {/* 요일도 날짜와 같은 손글씨 — 둘이 한 덩어리로 읽힌다 */}
            <Text
              variant="label1Hand"
              color={labelColor.alternative}
              style={{ paddingLeft: weekdayIndent }}
            >
              {`${koreanWeekday(today)}요일`}
            </Text>
          </View>
          {/* 알림 **목록** 화면은 MVP 에 없다 — 종은 알림을 정하는 곳으로 보낸다.
              갈 곳 없는 줄을 만들지 않는다(`CLAUDE.md` 「마이의 편집 경로」).
              ⚠ 옛 `/my/notify` 는 마이 이관에서 사라지고 **시트가 됐다**(A-11) —
              그 시트를 여는 곳이 `M1` 이라 여기서는 마이로 보낸다 */}
          <IconButton
            name="bell"
            accessibilityLabel="알림 설정"
            color={labelColor.normal}
            onPress={() => router.push("/my")}
            style={styles.bell}
          />
        </View>

        <Card padding="loose" style={styles.cta}>
          <View style={styles.ctaBody}>
            <View style={styles.ctaText}>
              {/* 카드가 말을 거는 한 줄 — `body1`(16/24)에서 **한 단 올렸다**
                  (2026-09-10 · 사용자 요청). 옆줄(`body2Reading` 15)과 크기가 거의
                  같아 어느 쪽이 묻는 말인지 흐렸다. `DESIGN.md` §2 의 단을 그대로
                  쓰므로 18/26 에는 600 이 딸려 온다 — 새 단을 만들지 않는다 */}
              <Text variant="headline1" color={labelColor.normal}>
                오늘 하루는 어땠어요?
              </Text>
              {/*
                **한 줄로 붙든다** (2026-09-13 · 사용자 요청 · iOS 한정).
                iOS 타입 보정(1.2)이 들어가면서 `body2Reading` 이 18 이 됐는데, 이 줄의
                글자 칸은 188 뿐이다(390 기기 — 화면패딩 20×2 · 카드패딩 22×2 · 간격 8 ·
                카피바라 118−8). 가장 긴 문안 「오전 11시엔 제가 먼저 말 걸어요」가 18 에서
                198.6 이라 두 줄로 접혔다 — 폰트 파일에서 잰 값이다.
                16(`label2`)이면 176.5 로 들어간다: **한 줄에 맞는 가장 큰 단**이다.
                ⚠ SE·13 mini(375)는 칸이 173 이라 16 으로도 4 가 모자란다. 거기서 잘리지
                않게 `adjustsFontSizeToFit` 을 함께 건다 — 좁은 기기에서만 한 뼘 줄어든다.
                줄바꿈이 아니라 축소를 고르는 이유는 카드 높이가 흔들리지 않아서다.
              */}
              <Text
                variant={iosVariant("label2", "body2Reading")}
                color={labelColor.alternative}
                {...(Platform.OS === "ios"
                  ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.85 }
                  : null)}
              >
                {/* 알림을 켜지 않은 사람에게 정하지 않은 시각을 말하지 않는다 (12.md) */}
                {retroNotify.enabled && retroNotify.time != null
                  ? `${formatKoreanTime(retroNotify.time)}엔 제가 먼저 말 걸어요`
                  : "편할 때 언제든 돌아볼 수 있어요"}
              </Text>
            </View>
            {/* 이 화면의 유일한 Solid Primary — 하루의 주 행동이다 (`DESIGN.md` §6).
             ⚠ **DS 버튼이 아니라 홈 전용 잔디 모양이다**(`GrassButton`) — 규격
             (높이·면 색·누름 스크림)은 §6 그대로이고 모양만 다르다.
             폭은 **글자 칸의 90%**이고 왼쪽 끝은 제목 「오」와 맞춘다 — 카피바라 자리는 이 칸 밖이라 겹치지 않는다 */}
            <GrassButton
              label="지금 하루 돌아보기"
              onPress={() => router.push("/retro/confirm")}
              style={styles.ctaButton}
            />
          </View>
          <View style={styles.ctaChar}>
            <HomeCapybara />
          </View>
        </Card>

        <View style={styles.section}>
          <WeekEmotionStrip days={week} today={today} />
        </View>

        <View style={styles.section}>
          <SectionHeader
            title="오늘 일정"
            description={empty ? undefined : remainingLabel(schedules)}
            trailing={
              // 추가는 3순위가 아니라 **머리의 행동**이다 — 면을 채우지 않는 Text Button.
              // 글리프(＋)는 문안에 이미 있으므로 아이콘을 겹쳐 붙이지 않는다
              <Button
                label="＋ 추가"
                variant="text"
                size="small"
                onPress={() => router.push("/home/schedule/new")}
              />
            }
          />

          {empty ? (
            // 12-b — 목록 슬롯의 줄만 초대 문구로 바뀐다
            <View style={styles.invite}>
              <Text variant="body1" color={labelColor.normal} style={styles.centered}>
                오늘 하루를 차곡차곡 담아볼까요?
              </Text>
              <Text variant="caption1" color={labelColor.alternative} style={styles.centered}>
                일정을 추가하면 하루를 돌아볼 때 더 풍부한 대화를 나눌 수 있어요.
              </Text>
            </View>
          ) : (
            <ScheduleList
              schedules={rows}
              onToggleDone={toggleDone}
              // 누른 지점(창 기준) → 메뉴가 사는 레이어(상단 inset 아래) 기준으로
              // 옮긴다. 안 그러면 상태바 높이만큼 아래에 뜬다
              onMore={(id, atY) => setMenu({ id, top: atY - insets.top + space.md })}
              onMove={moveSchedule}
              onReorder={reorderSchedule}
              onDragStateChange={setDragging}
            />
          )}

          {folded ? (
            // 5개까지 펼치고 나머지는 접는다 (12.md) — 누르면 실제로 펼쳐진다
            <Button
              label={`${shown.length - MAX_VISIBLE_SCHEDULES}개 더 보기`}
              variant="text"
              size="small"
              onPress={() => setExpanded(true)}
              style={styles.more}
            />
          ) : null}

          {allDone ? (
            <View style={styles.done}>
              <Icon name="circle-check" size={size.icon.md} color={status.positive} />
              <Text variant="label1" color={status.positive}>
                오늘 일정을 모두 마쳤어요.
              </Text>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </TabScreen>
  );
}

const styles = StyleSheet.create({
  // 좌우 20 은 `TabScreen` 이 잡는다 — 여기서 또 잡으면 두 겹이 된다
  content: {
    // 스크롤 리스트 하단 클리어런스 — 탭바 56 + 20 (`DESIGN.md` §3)
    paddingBottom: layout.scrollClearance,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.md,
    paddingBottom: space.md,
  },
  /**
   * ⚠ **날짜 칸의 위 여백과 요일 들여쓰기는 여기 없다** — 기기의 글꼴 배율이
   * 들어가야 해서 컴포넌트 안에서 계산한다(`datePaddingTop` · `weekdayIndent`).
   * `StyleSheet` 는 배율을 모른다.
   *
   * 눈이 짝지어 보는 것은 **큰 글씨 한 줄과 종**이라 그 둘의 중심을 맞추고,
   * 요일은 그 아래에 딸려 간다. 바닥 정렬이던 시절에는 종이 10 아래에 있었다.
   */
  // 44 히트는 지키되 날짜 줄의 높이를 밀지 않게 오른쪽으로 당긴다
  bell: { marginRight: -space.md },
  /**
   * 「하루 돌아보기」 카드는 **두 칸이다**(2026-09-10 · 사용자 시안) — 글자·버튼이
   * 왼쪽에 서고 카피바라가 오른쪽 아래에 앉는다. 바닥을 맞추는 이유는 카피바라가
   * **앉아 있는 그림**이라서다: 가운데 정렬하면 공중에 뜬다.
   */
  cta: { flexDirection: "row", alignItems: "flex-end", gap: space.sm },
  ctaBody: { flex: 1, gap: 22 },
  // 폭은 그대로 두고 왼쪽으로만 조금 — 오른쪽에서 같은 값을 되돌려 준다
  // 제목과 같은 시작선 · 조금 작은 크기 — 세로 칸의 기본(stretch)을 끄고 폭을 직접 준다
  ctaButton: { marginTop: CTA_DROP, alignSelf: "flex-start", width: CTA_WIDTH, height: CTA_HEIGHT },
  ctaText: { gap: space.sm },
  /**
   * 카피바라가 카드 안쪽 패딩(22)으로 파고드는 양. **카드 밖으로는 나가지 않는다** —
   * `overflow` 가 기기마다 다르게 잘리는 자리를 만들지 않는다.
   */
  ctaChar: { marginRight: -CHAR_BLEED, marginBottom: -CHAR_BLEED },
  // 섹션 ↔ 섹션 (`DESIGN.md` §3 — 20~28)
  section: { paddingTop: space.xl },
  invite: { paddingVertical: space.xl, gap: space.sm },
  centered: { textAlign: "center" },
  more: { alignSelf: "flex-start", paddingHorizontal: 0 },
  done: { flexDirection: "row", alignItems: "center", gap: space.sm, paddingTop: space.md },
});
