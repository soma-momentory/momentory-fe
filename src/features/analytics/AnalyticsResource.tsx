import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";

import { isAnalyticsEnabled, track } from "./index";

type Props =
  | { kind: "diary"; id: string | null }
  | { kind: "wish_card"; id: string | null; source: "cards" | "trail" }
  | { kind: "report"; id: string | null; isReady: () => boolean };

/** 실제 데이터가 보이는 화면 안에 둔다. 목록 프리페치/빈 상태는 조회로 세지 않는다. */
export function AnalyticsResource(props: Props) {
  return isAnalyticsEnabled ? <ActiveResource {...props} /> : null;
}

function ActiveResource(props: Props) {
  const latest = useRef(props);
  const focused = useRef(false);
  const seen = useRef<string | null>(null);

  const record = useCallback(() => {
    const value = latest.current;
    if (!focused.current || value.id == null) return;
    if (value.kind === "report" && !value.isReady()) return;
    const key = value.kind + ":" + value.id;
    if (seen.current === key) return;
    seen.current = key;
    if (value.kind === "diary") track("diary_viewed", { diary_id: value.id });
    else if (value.kind === "wish_card")
      track("wish_card_viewed", { wish_card_id: value.id, source: value.source });
    else track("weekly_report_viewed", { week_start: value.id });
  }, []);

  useEffect(() => {
    latest.current = props;
    // StrictMode의 setup-cleanup-setup 뒤에 한 번 기록한다.
    void Promise.resolve()
      .then(record)
      .catch(() => {});
  });

  useFocusEffect(
    useCallback(() => {
      focused.current = true;
      void Promise.resolve()
        .then(record)
        .catch(() => {});
      return () => {
        focused.current = false;
        seen.current = null;
      };
    }, [record]),
  );
  return null;
}
