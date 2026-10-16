import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { currentUserId, useAuth } from "@/features/auth/model/auth";
import { onForeground } from "@/lib/appState";
import { onDayChange } from "@/lib/dayChange";
import {
  getLocationPermission,
  isLocationServiceEnabled,
  locateRounded,
  requestLocationPermission,
} from "@/lib/location";

import { fetchCurrentWeather } from "../data/weatherApi";
import { markWeatherIntroSeen, readWeatherIntroSeen } from "../data/weatherIntroMemory";
import { isWeatherFresh, type HomeWeather } from "./weather";

/**
 * 홈 날씨 스티커의 상태 — 계획 `docs/redesign/HOME_V2_ROLLOUT_PLAN.md` §4.6 (HW-3 · HW-4 · MF-2 · MF-2A · MF-2B).
 *
 * 조회 경로는 BE `dev` d77d023에 있다. 운영 배포는 미확인이고 이 훅을 부르는 화면은 아직 없다.
 *
 * | 상태     | 화면                                                                       |
 * | -------- | -------------------------------------------------------------------------- |
 * | `hidden` | 스티커 없음 · 문구 없음(거부 · 꺼짐 · 실패 · 그림 없음이 전부 같다 — HW-4) |
 * | `intro`  | 첫 안내 시트를 띄울 차례(0.6초 지연 · 다른 시트와의 순서는 화면 몫)        |
 * | `ready`  | `weather` 가 있다                                                          |
 *
 * ## 언제 다시 보나
 *
 * 홈 **포커스** · **포그라운드 복귀** · **하루 전환** 때마다, TTL 과 무관하게 권한과 위치 서비스를 다시
 * 읽는다(둘 다 **묻지 않는다**). 막혀 있으면 조회 없이 그 자리에서 이전 값을 버린다. 둘 다 통과하면
 * 마지막 **시도**에서 30분이 지났을 때만 다시 조회한다 — 실패한 시도도 같은 30분을 기다린다(결정 D2).
 * 권한 · 서비스 · 로그아웃으로 버린 뒤 되돌아오면 30분이 남았어도 곧장 다시 조회한다.
 * 하루가 바뀌면 화면을 새로 고치려고 30분과 무관하게 다시 조회한다(§4.2 — 날씨는 04:00 과 무관하다).
 * 단 마지막 시도가 **실패**였으면(또는 아직 진행 중이면) 하루 전환도 그 30분을 지우지 않는다 —
 * 결정 D2 는 모든 실패에 공통이다. 하루 전환이 지우는 것은 성공한 값의 TTL 뿐이다.
 *
 * ## 늦은 응답 버리기 — 조회 세대(`fetchGen`)
 *
 * 조회는 시작할 때의 세대 번호와 사용자를 들고 간다. 권한 철회 · 서비스 꺼짐 · 로그아웃 · 사용자 변경을
 * 확인한 순간 번호를 올리므로, 그 전에 떠난 조회가 **뒤에 성공으로 와도** 스티커를 되살리지 못한다.
 * 같은 세대의 조회가 진행 중이면 새로 떠나지 않는다 — 무효화된 조회는 진행 중으로 치지 않는다.
 * 위치를 얻은 뒤 서버로 보내기 **직전에도** 사용자와 인증 상태를 다시 대조한다 — 응답을 받은 뒤의
 * 대조만으로는 이전 사용자의 조회가 새 세션 토큰으로 나가는 것을 막지 못한다.
 *
 * 경과 시간은 실제 시계(`Date.now()`)로 잰다 — 04:00 하루와 무관한 「지난 시간」이라서다
 * (`auth.ts` 의 `nowMs` 와 같은 이유). 좌표는 이 훅이 들고 있지 않는다.
 */
export type HomeWeatherStatus = "hidden" | "intro" | "ready";

export type UseHomeWeather = {
  status: HomeWeatherStatus;
  weather: HomeWeather | null;
  /** 안내의 「위치 허용하기」 — 기록을 남기고 OS 권한 창을 띄운다 */
  acceptIntro: () => Promise<void>;
  /** 안내를 닫는 길 전부(✕ · 바깥 · 쓸어내리기 · 「다음에」) — 기록을 남기고 숨긴다 */
  dismissIntro: () => Promise<void>;
};

type View = { status: HomeWeatherStatus; weather: HomeWeather | null };

const HIDDEN: View = { status: "hidden", weather: null };

export function useHomeWeather(): UseHomeWeather {
  const [view, setView] = useState<View>(HIDDEN);
  const authStatus = useAuth((s) => s.status);

  const mounted = useRef(true);
  const focused = useRef(false);
  /** 조회 세대 — 올리면 그 전에 떠난 조회의 결과(성공 · 실패)를 모두 버린다 */
  const fetchGen = useRef(0);
  /** 진행 중인 조회의 세대. 지금 세대와 같을 때만 「진행 중」이다 */
  const inflightGen = useRef<number | null>(null);
  /** 마지막 조회 시도 시각 — 비어 있으면 다음 점검에서 곧장 조회한다 */
  const lastAttemptAt = useRef<number | null>(null);
  /** 마지막 시도가 성공으로 끝났나 — 하루 전환은 성공한 값의 TTL 만 지운다(결정 D2) */
  const lastSucceeded = useRef(false);
  /** 지금 화면 값의 주인 */
  const ownerId = useRef<number | null>(null);
  /** 점검 순번 — 늦게 끝난 점검이 뒤의 판단을 덮지 않게 마지막 점검만 결과를 낸다 */
  const checkSeq = useRef(0);

  const show = useCallback((next: View) => {
    if (mounted.current) setView(next);
  }, []);

  /** 이전 값을 버리고 진행 중 조회를 무효화한다. 다음에 허용되면 TTL 과 무관하게 다시 조회한다 */
  const invalidate = useCallback(() => {
    fetchGen.current += 1;
    inflightGen.current = null;
    lastAttemptAt.current = null;
    lastSucceeded.current = false;
    show(HIDDEN);
  }, [show]);

  const fetchWeather = useCallback(
    async (userId: number) => {
      if (inflightGen.current === fetchGen.current) return;
      if (lastAttemptAt.current != null && isWeatherFresh(lastAttemptAt.current, Date.now())) {
        return; // TTL 안 — 그대로 둔다(성공이면 스티커 · 실패였으면 숨김)
      }
      const gen = fetchGen.current;
      inflightGen.current = gen;
      lastAttemptAt.current = Date.now();
      lastSucceeded.current = false;
      // 진행 중에는 이전 스티커를 둔다 — 깜빡이지 않는다

      const position = await locateRounded();
      if (!mounted.current || gen !== fetchGen.current) return;
      if (position.kind === "located") {
        // 보내기 직전에 사용자를 다시 본다 — 위치를 기다리는 사이 계정이 바뀌었으면
        // 이전 사용자의 조회가 새 세션 토큰으로 나가지 않게 요청 없이 버린다
        const sender = await currentUserId();
        if (!mounted.current || gen !== fetchGen.current) return;
        if (sender !== userId || useAuth.getState().status !== "authenticated") {
          invalidate();
          return;
        }
      }
      const result =
        position.kind === "located"
          ? await fetchCurrentWeather(position)
          : ({ kind: "unavailable" } as const);
      const nowUser = await currentUserId();
      if (!mounted.current || gen !== fetchGen.current) return;
      inflightGen.current = null;
      if (nowUser !== userId) {
        invalidate();
        return;
      }
      lastSucceeded.current = result.kind === "ready";
      // 실패는 TTL 안이어도 이전 값을 버린다(MF-2) — 이전 스티커는 실패한 조회 뒤에 남지 않는다
      show(result.kind === "ready" ? { status: "ready", weather: result.weather } : HIDDEN);
    },
    [invalidate, show],
  );

  const check = useCallback(async () => {
    const seq = ++checkSeq.current;
    const stale = () => !mounted.current || seq !== checkSeq.current;

    const permission = await getLocationPermission();
    if (stale()) return;
    const userId = await currentUserId();
    if (stale()) return;

    if (userId == null || useAuth.getState().status !== "authenticated") {
      ownerId.current = null;
      invalidate();
      return;
    }
    if (ownerId.current !== userId) {
      // 다른 사용자의 값 · 진행 중 조회 · 쿨다운을 넘겨받지 않는다
      invalidate();
      ownerId.current = userId;
    }

    if (permission === "denied") {
      invalidate();
      return;
    }
    if (permission === "undetermined") {
      invalidate();
      const seen = await readWeatherIntroSeen(userId);
      if (stale()) return;
      show(seen ? HIDDEN : { status: "intro", weather: null });
      return;
    }

    const serviceOn = await isLocationServiceEnabled();
    if (stale()) return;
    if (!serviceOn) {
      invalidate();
      return;
    }
    await fetchWeather(userId);
  }, [fetchWeather, invalidate, show]);

  // 마운트 수명 — 언마운트하면 세대를 올려 진행 중 조회를 버린다
  useEffect(() => {
    mounted.current = true;
    const stopForeground = onForeground(() => {
      if (focused.current) void check();
    });
    const stopDay = onDayChange(() => {
      // 성공한 값이면 TTL 과 무관하게 새로 묻는다 — 보이지 않을 때 넘어갔으면 다음 포커스에서.
      // 실패한(또는 진행 중인) 시도의 30분은 그대로 둔다(결정 D2)
      if (lastSucceeded.current) lastAttemptAt.current = null;
      if (focused.current) void check();
    });
    return () => {
      mounted.current = false;
      fetchGen.current += 1;
      inflightGen.current = null;
      checkSeq.current += 1;
      stopForeground();
      stopDay();
    };
  }, [check]);

  // 로그아웃 · 세션 만료 — 비운다. 다시 들어오면(다른 사람일 수 있다) 점검이 사용자를 다시 확인한다
  useEffect(() => {
    if (authStatus !== "authenticated") {
      checkSeq.current += 1;
      ownerId.current = null;
      invalidate();
      return;
    }
    if (focused.current) void check();
  }, [authStatus, check, invalidate]);

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void check();
      return () => {
        focused.current = false;
      };
    }, [check]),
  );

  /** 렌더된 안내의 주인 — 오래된 버튼 콜백이 다음 계정의 안내를 조작하지 못하게 묶는다 */
  const introUserId = ownerId.current;
  /** 안내가 떠 있던 사용자가 이 화면의 인증된 사용자일 때만 기록·권한 요청을 한다 */
  const introOwner = useCallback(async (expectedUserId: number | null): Promise<number | null> => {
    const userId = await currentUserId();
    if (
      !mounted.current ||
      !focused.current ||
      useAuth.getState().status !== "authenticated" ||
      expectedUserId == null ||
      userId == null ||
      userId !== expectedUserId ||
      userId !== ownerId.current
    )
      return null;
    return userId;
  }, []);

  const acceptIntro = useCallback(async () => {
    const userId = await introOwner(introUserId);
    if (userId == null) return;
    show(HIDDEN);
    await markWeatherIntroSeen(userId);
    // 기록을 기다리는 동안 계정·화면이 바뀌었으면 새 사용자의 권한 창을 열지 않는다.
    if ((await introOwner(introUserId)) !== userId) return;
    const permission = await requestLocationPermission();
    if ((await introOwner(introUserId)) !== userId) return;
    if (permission === "granted") await check();
  }, [check, introOwner, introUserId, show]);

  const dismissIntro = useCallback(async () => {
    const userId = await introOwner(introUserId);
    if (userId == null) return;
    show(HIDDEN);
    await markWeatherIntroSeen(userId);
  }, [introOwner, introUserId, show]);

  return { status: view.status, weather: view.weather, acceptIntro, dismissIntro };
}
