/**
 * Expo Lab 「전 화면」 작업의 **공유 계약**. 세 갈래(앱 프레임 · 가짜 서버 · 셸)가 서로 맞물리는
 * 이름과 모양은 여기 하나에만 둔다. 바꾸려면 세 갈래를 같이 고친다.
 *
 * 구조:
 *   셸(브라우저 최상위 창) ── <iframe name={encodeFrameConfig(config)} src="/<라우트>">
 *     └ 프레임 = 실제 앱(expo-router 전체)을 웹으로 띄운 것 한 벌
 *         · 부트스트랩이 window.name 에서 LabFrameConfig 를 읽는다
 *         · installFakeServer(config) — fetch 가로채기, 데이터 세트
 *         · 그다음 ExpoRoot 를 그린다
 */

/** 가짜 서버가 받는 주소. 프레임의 `getApiBaseUrl()` 이 이 값을 돌려준다(expo-lab/app.config.ts extra). */
export const LAB_API_BASE_URL = "https://lab.momentory.invalid";

/** 프레임 한 벌의 설정. 셸이 iframe `name` 에 JSON 으로 싣는다 — 새로고침해도 유지된다. */
export type LabFrameConfig = {
  /** 셸 안에서 프레임을 가리키는 id. postMessage 응답에 실린다 */
  frameId: string;
  /** 가짜 서버 데이터 세트 id (`fake-server` 의 `datasets`) */
  datasetId: string;
  /** 흉내 낼 플랫폼. 프레임 부트스트랩이 `Platform.OS`·`Platform.select` 를 이 값으로 맞춘다 */
  platform: LabPlatform;
  /** 기기 id (`lab-devices.ts`). 프레임은 이 기기의 안전 영역 여백을 앱에 준다 */
  deviceId: string;
  /** 고정 시각(ISO, 예: "2026-11-02T21:30:00+09:00"). 없으면 실제 시각 */
  now?: string | null;
  /** 시작 시 세션을 심을지. false 면 로그인 전(소개·로그인 화면)부터 */
  signedIn?: boolean;
  /** 가짜 서버 지연(ms). 0 이면 즉시 */
  latencyMs?: number;
  /** 실패시킬 엔드포인트 접두사 목록(예: ["/api/v1/reports"]) — 그 요청은 500 */
  failPaths?: readonly string[];
  /**
   * 「오늘 다시 쓰기」 — 켜면(기본) 오늘 이미 썼어도 회고 시작·직접 쓰기를 막지 않는다(409 없음).
   * 새로 쓴 일기는 오늘 일기를 **덮어쓴다**(회고면 딸린 바람카드도) — 하루에 일기 하나라는 앱의 가정은 지킨다.
   * 끄면 실제 서버처럼 하루 1회 제한(일기 409 · 회고 ALREADY_RETROSPECTED_TODAY).
   */
  repeatToday?: boolean;
  /**
   * 글씨 배율 모의(1 · 1.3 · 1.5). 프레임이 앱의 `PreviewFontScaleContext`(`src/components/ds/Text.tsx`)로
   * 넘긴다 — 1.5 는 앱 상한(`maxFontScale` 1.3)을 넘겨 배치를 점검하는 값이다. 실제 OS 설정을 대신하지 않는다
   */
  textScale?: number;
  /**
   * 셸 창의 출처(`location.origin`). 프레임이 다른 서버(작업 공간의 「AI 수정 결과」 미리보기 · 다른 포트)에서
   * 뜰 때 셸에 메시지를 보낼 곳이고, 셸이 보낸 메시지를 믿는 기준이다. 없으면 프레임 자신의 출처(같은 서버)
   */
  shellOrigin?: string;
  /**
   * 오늘 쓴 일기가 있는 상태로 연다 — 일기를 쓴 날에만 뜨는 쉼 추천 시트를 볼 때 쓴다. 이 값이 켜진 프레임은
   * **가짜 DB 를 따로 쓰므로**(저장 키 끝의 `:today-diary`) 같은 데이터 세트의 다른 화면에는 그 일기가 보이지 않는다
   */
  todayDiary?: boolean;
};

export type LabPlatform = "ios" | "android";

/**
 * 데이터 세트 id — 가짜 서버(`src/fake-server`)가 채우고, 셸의 라우트 프리셋이 이 이름으로 고른다.
 * - new-user  : 서버상 온보딩 전(`onboardingRequired: true`) · 기록 없음. 로그인 전 화면·온보딩에 쓴다
 * - empty     : 온보딩 끝 · 기록 0
 * - normal    : 2주치 일기·일정·바람카드·편지·쉼 기록
 * - many      : 3개월치 · 하루 일정 10개 이상 · 감정 12종 전부
 * - long-copy : 긴 닉네임·제목·본문·요약
 */
export const DATASET_IDS = ["new-user", "empty", "normal", "many", "long-copy"] as const;
export type DatasetId = (typeof DATASET_IDS)[number];

export const DEFAULT_FRAME_CONFIG: LabFrameConfig = {
  frameId: "solo",
  datasetId: "normal",
  platform: "ios",
  deviceId: "iphone-16",
  now: null,
  signedIn: true,
  latencyMs: 0,
  failPaths: [],
  repeatToday: true,
};

export const encodeFrameConfig = (config: LabFrameConfig): string =>
  `momentory-lab:${JSON.stringify(config)}`;

export const decodeFrameConfig = (name: string | null | undefined): LabFrameConfig | null => {
  if (!name || !name.startsWith("momentory-lab:")) return null;
  try {
    const parsed = JSON.parse(name.slice("momentory-lab:".length)) as Partial<LabFrameConfig>;
    if (typeof parsed.frameId !== "string" || typeof parsed.datasetId !== "string") return null;
    return { ...DEFAULT_FRAME_CONFIG, ...parsed } as LabFrameConfig;
  } catch {
    return null;
  }
};

/** 프레임 → 셸 메시지. 프레임은 라우트가 바뀔 때마다 `lab:route` 를 보낸다 */
export type FrameToShellMessage =
  | { type: "lab:ready"; frameId: string; pathname: string }
  | { type: "lab:route"; frameId: string; pathname: string }
  | { type: "lab:request"; frameId: string; method: string; path: string; status: number }
  /** 앱이 `expo-status-bar` 로 정한 상태바 글자색 — 셸이 그리는 기기 상태바가 따른다 */
  | { type: "lab:statusBar"; frameId: string; style: "light" | "dark" }
  /**
   * 화면 키보드가 열리고 닫힐 때마다(애니메이션이 **시작하는** 순간). `height` 는 화면 바닥에서
   * 키보드 윗변까지(pt/dp) · 닫히면 0. 셸의 「키보드 올리기 / 내리기」가 눌림 상태로 따른다
   */
  | { type: "lab:keyboardState"; frameId: string; open: boolean; height: number };

/** 셸 → 프레임 메시지 */
export type ShellToFrameMessage =
  /**
   * 주소를 옮긴다. 기본은 `replace`. 홈 위 시트(`/home/schedule/*`)처럼 **뒤 화면 위에 얹혀야** 하는
   * 목적지는 `push` — replace 면 뒤의 홈이 사라져 빈 배경이 된다
   */
  | { type: "lab:navigate"; pathname: string; mode?: "replace" | "push" }
  | { type: "lab:reload" }
  /** 이 프레임의 가짜 DB 를 데이터 세트 초기값으로 되돌리고 다시 불러온다 */
  | { type: "lab:resetData" }
  /**
   * 입력칸을 누르지 않고 화면 키보드를 연다(`true`) · 닫는다(`false`). 셸이 연 키보드는 포커스가
   * 빠져도 닫히지 않는다 — `false` 나 앱의 `Keyboard.dismiss()` 로 닫힌다
   */
  | { type: "lab:keyboard"; open: boolean };

/** 프레임 → 셸 메시지 중 키보드 상태 하나 */
export type LabKeyboardStateMessage = Extract<FrameToShellMessage, { type: "lab:keyboardState" }>;
/** 셸 → 프레임 메시지 중 키보드 열고 닫기 하나 */
export type LabKeyboardMessage = Extract<ShellToFrameMessage, { type: "lab:keyboard" }>;

/**
 * 가짜 DB 는 프레임마다 localStorage 에 남는다(새로고침해도 유지).
 * 키 = `${FAKE_DB_STORAGE_PREFIX}${frameId}:${datasetId}`(`todayDiary` 면 끝에 `:today-diary`). 초기화는 `lab:resetData`.
 * 세션(SecureStore 대체) 키도 프레임마다 따로다 = `${FRAME_STORAGE_PREFIX}${frameId}:<키>`.
 */
export const FAKE_DB_STORAGE_PREFIX = "momentory.lab.db:";
export const FRAME_STORAGE_PREFIX = "momentory.lab.frame:";

/** 동적 라우트를 열 때 쓸 값 — 데이터 세트마다 실제로 있는 id 를 가짜 서버가 알려 준다 */
export type SampleParams = { diaryId?: number; letterDate?: string; scheduleId?: number };

/** 데이터 세트 목록의 한 줄 — 가짜 서버가 채운다 */
export type DatasetInfo = { id: string; label: string; description: string };
