/**
 * 서버에 저장된 회고 일기 조회 — **store 와 서버 사이의 경계다.**
 *
 * `GET /api/v1/retrospect/{id}/diary` 는 완료된 회고의 일기 본문과 (있으면) 행동
 * 카드를 돌려준다. 회고로 저장된 일기(`Diary.retrospectId != null`)는 이걸로 서버
 * 저장분을 되불러올 수 있다 — 보관함·「같은 상황의 이전 카드」가 붙는 자리이기도 하다.
 *
 * 서버 응답을 **런타임에 검사한다** — `fetch` 는 형태를 보장하지 않는다(`retroApi`
 * 와 같은 방침). 어떤 실패든(네트워크·404·형태 어긋남) `null` 로 접어, 화면은
 * 「서버 카드가 없다」와 똑같이 다룬다(로컬 카드로 떨어진다).
 */
import { authedRequest } from "@/lib/http";

/** 서버가 돌려주는 행동 카드 — `done`·`reflection` 은 「해봤어요」 이후에만 채워진다 */
export type FetchedActionCard = {
  /** 서버 카드 id(문자열화) */
  id: string;
  situation: string;
  targetAction: string;
  detail: string | null;
  /** `yyyy-MM-dd` — 서버가 ISO 로 준다 */
  createdDate: string | null;
  done: boolean;
  reflection: string | null;
};

/** 완료된 회고 한 벌 — 일기 본문 + (있으면) 리프레임 일기 + 행동 카드 */
export type FetchedDiary = {
  body: string;
  reframedDiary: string | null;
  actionCard: FetchedActionCard | null;
};

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

const asString = (v: unknown): string | null => (typeof v === "string" ? v : null);

const toActionCard = (v: unknown): FetchedActionCard | null => {
  if (!isObject(v)) return null;
  const id = v.id;
  const situation = asString(v.situation);
  const targetAction = asString(v.targetAction);
  // 필수가 어긋나면 카드 없음으로 접는다 — 반쪽 카드를 화면에 올리지 않는다
  if (id == null || situation == null || targetAction == null) return null;
  return {
    id: String(id),
    situation,
    targetAction,
    detail: asString(v.detail),
    createdDate: asString(v.createdDate),
    done: v.done === true,
    reflection: asString(v.reflection),
  };
};

const toDiary = (v: unknown): FetchedDiary | null => {
  if (!isObject(v)) return null;
  const body = asString(v.diary);
  if (body == null) return null;
  return {
    body,
    reframedDiary: asString(v.reframedDiary),
    actionCard: v.actionCard === undefined ? null : toActionCard(v.actionCard),
  };
};

/**
 * 서버에 저장된 회고 일기를 불러온다. 실패는 전부 `null` — 호출부는 「없음」으로 다룬다.
 *
 * @param retrospectId 서버 회고 세션 id(`Diary.retrospectId`)
 */
export async function fetchRetrospectDiary(
  retrospectId: string,
  options?: { signal?: AbortSignal },
): Promise<FetchedDiary | null> {
  const result = await authedRequest<unknown>(
    "GET",
    `/api/v1/retrospect/${retrospectId}/diary`,
    undefined,
    options,
  );
  if (!result.ok) return null;
  return toDiary(result.data);
}
