import { useEffect, useRef, useState } from "react";

import { isServerId } from "@/features/diary/data/diaryApi";
import { useDiary } from "./diary";
import type { Diary, DiaryEmotionSelection } from "./types";

/** 화면별 조회·편집 상태. 다른 일기나 세션으로 바뀐 뒤 도착한 응답은 표시하지 않는다. */
export function useDiaryEmotions(id: string | null | undefined) {
  const [result, setResult] = useState<{ id: string; diary: Diary | null } | null>(null);
  const [opening, setOpening] = useState(false);
  const [editing, setEditing] = useState(false);
  const attempt = useRef(0);
  const available = id != null && isServerId(id);
  useEffect(() => {
    const ticket = ++attempt.current;
    if (id != null && isServerId(id)) {
      void useDiary
        .getState()
        .loadEmotions(id)
        .then((diary) => {
          if (attempt.current === ticket) setResult({ id, diary });
        });
    }
    return () => {
      attempt.current += 1;
    };
  }, [id]);
  const stored = useDiary((state) => state.diaries.find((diary) => diary.id === id));
  const current = result?.id === id ? result : null;
  const loading = available && current == null;
  const diary = stored?.emotionSelection != null ? stored : (current?.diary ?? null);
  const open = async () => {
    if (!available || opening || loading || id == null) return;
    if (diary != null) {
      setEditing(true);
      return;
    }
    setOpening(true);
    const ticket = ++attempt.current;
    const refreshed = await useDiary.getState().loadEmotions(id);
    if (attempt.current !== ticket) return;
    setOpening(false);
    setResult({ id, diary: refreshed });
    if (refreshed != null) setEditing(true);
  };
  const save = async (selection: DiaryEmotionSelection): Promise<boolean> => {
    if (id == null) return false;
    const ticket = ++attempt.current;
    const saved = await useDiary.getState().saveEmotions(id, selection);
    if (ticket !== attempt.current || saved == null) return false;
    setResult({ id, diary: saved });
    return true;
  };
  return {
    diary,
    available,
    loading: loading || opening,
    failed: current?.diary === null && diary == null,
    editing,
    open,
    close: () => setEditing(false),
    save,
  };
}
