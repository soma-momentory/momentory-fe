import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import { onForeground } from "@/lib/appState";
import {
  canAskLocationAgain,
  getLocationPermission,
  openLocationSettings,
  requestLocationPermission,
  type LocationPermission,
} from "@/lib/location";

const ROW: Record<LocationPermission, { value: string; accessibilityLabel: string }> = {
  granted: {
    value: "허용됨",
    accessibilityLabel: "위치 사용, 허용됨. 누르면 기기 설정으로 이동해요",
  },
  denied: {
    value: "허용 안 함",
    accessibilityLabel: "위치 사용, 허용 안 함. 누르면 위치를 허용할 수 있어요",
  },
  undetermined: {
    value: "선택 전",
    accessibilityLabel: "위치 사용, 선택 전. 누르면 위치 허용 여부를 물어봐요",
  },
};

const OPEN_FAILED = "지금은 위치 설정을 열지 못했어요. 기기 설정 앱에서 바꿀 수 있어요.";

/**
 * 마이 「위치 사용」 줄. 아직 묻지 않았거나 거절했어도 OS 가 다시 물어 주면(Android 의 첫 거절)
 * 권한 창을 띄운다. 다시 물을 수 없는 거절과 허용을 끄는 일은 기기 설정으로 보낸다.
 *
 * 탭은 마운트된 채 남고 홈과 일기도 권한을 물으므로 포커스마다 다시 읽는다. 기기 설정에서 돌아올
 * 때는 포그라운드 복귀로 읽고, iOS 가 권한 변경으로 앱을 종료했다면 새 마운트가 읽는다.
 */
export function useLocationSetting() {
  /** `null` 은 아직 모르는 상태다. 그동안 줄은 눌리지 않는다 */
  const [permission, setPermission] = useState<LocationPermission | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const readSeq = useRef(0);
  const opening = useRef(false);

  const read = useCallback(async () => {
    const seq = ++readSeq.current;
    const next = await getLocationPermission();
    // 늦게 끝난 앞선 읽기가 나중 읽기의 결과를 덮지 못하게 한다
    if (seq === readSeq.current) setPermission(next);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void read();
    }, [read]),
  );
  useEffect(() => onForeground(() => void read()), [read]);

  const open = useCallback(async () => {
    // 두 번 눌러 권한 창을 겹쳐 띄우지 않는다
    if (opening.current) return;
    opening.current = true;
    setNote(null);
    const canAsk =
      permission === "undetermined" || (permission === "denied" && (await canAskLocationAgain()));
    if (canAsk) {
      const result = await requestLocationPermission();
      if (result === "unavailable") setNote(OPEN_FAILED);
      await read();
    } else if (!(await openLocationSettings())) {
      setNote(OPEN_FAILED);
    }
    opening.current = false;
  }, [permission, read]);

  return { row: permission == null ? null : ROW[permission], note, open };
}
