import type { ReactNode } from "react";

import type { Schedule } from "@/features/home/model/types";
import type { WeekDay } from "@/features/report/model/report";

/**
 * 홈 v2 공유 뷰의 계약 (계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §6 P2).
 *
 * 옛 `HomeView` 의 계약(`../HomeView.tsx`)에 날씨 · 편지 자리를 더했다. Lab에서는
 * 빈 값도 그릴 수 있고, 운영 홈은 P4·P5의 상태를 넘긴다.
 */

/**
 * 홈 날씨 스티커가 **그리는 데 필요한 것만** — 표시용 최소 타입.
 *
 * ⚠ `features/home/model/types.ts` 의 `Weather`(스키마 필드 · 「아무도 만들지 않는 타입」)와
 * **다른 타입이다.** 그것을 import 하지도 고치지도 않는다(계획 MF-5). 도메인 타입(`HomeWeather`)은
 * P4 가 `model/weather.ts` 에 만들고, 화면은 이 모양으로 받는다.
 */
export type HomeWeatherView = {
  /** 「맑음」 — 접근성 이름에 쓴다 */
  label: string;
  /** 섭씨 · 정수 */
  temperatureC: number | null;
  /** 그림 열쇠(P4 의 `StickerKey`) — 그림이 없는 조건은 화면에 오기 전에 걸러진다 */
  stickerKey: string;
};

/** 표시할 값만 받는다. 오늘 · 일기 · 설정 · 날씨 · 편지의 공급처는 호출자가 정한다 */
export type HomeV2ViewModel = {
  today: string;
  schedules: Schedule[];
  /** `weekDays()` 결과 — 기록이 없는 주도 **일곱 칸**이다 */
  week: readonly WeekDay[];
  /** 알림을 켰고 시각이 있을 때만 값이 있다(`"21:30"`) */
  retroReminderTime: string | null;
  /** 권한 거부·조회 실패·미매핑이면 `null` — 스티커 자리를 그리지 않는다 */
  weather: HomeWeatherView | null;
  /** 열 수 있는 새 편지를 아직 안 열었을 때만 `true` — 서버 편지 목록의 첫 칸(바바의 편지 PRD 4-1) */
  hasUnreadLetter: boolean;
};

/** 모든 부작용은 호출자가 처리한다. 이 뷰는 store · API · 라우터 · 계측을 모른다 */
export type HomeV2ViewActions = {
  onToggleDone: (id: string) => void;
  onMove: (id: string, direction: "up" | "down") => void;
  onReorder: (id: string, toIndex: number) => void;
  onHideCalendarSchedule: (id: string) => void;
  onDeleteManualSchedule: (id: string) => void;
  onEditManualSchedule: (id: string) => void;
  onAddSchedule: () => void;
  onStartReflection: () => void;
  /** 편지 아이콘 — 알림함 종이 있던 자리다(2026-10-27). 어느 편지를 열지는 호출자가 정한다 */
  onOpenLetter: () => void;
  /** 알림 설정 이동 */
  onOpenNotificationSettings: () => void;
  /** 날씨 스티커를 누르면 출처 · 갱신 시각(HW-5 · P4) */
  onOpenWeatherInfo: () => void;
};

export type HomeV2ViewProps = {
  model: HomeV2ViewModel;
  actions: HomeV2ViewActions;
  /** 앱은 `TabScreen`, Lab 은 가상 폰 프레임. 오버레이(메뉴 · 모달 · 토스트)는 화면 밖에 둔다 */
  renderFrame: (body: ReactNode, overlay: ReactNode) => ReactNode;
  /** pageY 를 프레임의 오버레이 좌표로 바꾼다. Safe Area 는 호출자가 책임진다 */
  menuTopFromPageY: (pageY: number) => number | Promise<number>;
  /** 메뉴가 탭바 · 홈 인디케이터를 덮지 않도록 비워 둘 하단 높이 — 도크는 뷰가 더한다 */
  menuBottomInset?: number;
  /** 잰 일정 한 칸 — P3 의 배치 판정(LY-1)이 이 값을 쓴다 */
  onRowPitch?: (pitch: number) => void;
  /** 첫 위치 안내. 내부 일정 메뉴가 열렸으면 표시를 미룬다. */
  weatherIntroSheet?: ReactNode;
};
