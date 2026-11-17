/**
 * Momentory DS — **바바 꾸미기(옷장)** 크기 (2026-11-17).
 *
 * 색은 글로벌 토큰(`label` · `line` · `background` · `primary`)을 그대로 쓴다. 여기에는 이 화면에만 있는 크기만 둔다.
 */
export const wardrobe = {
  /** 미리보기 바바 폭 — 3:4 캔버스라 높이는 4/3 배 */
  previewWidth: 168,
  /** 아이템 칸 수 — 작은 화면(SE)에서도 이름이 두 줄 안에 든다 */
  columns: 3,
  /** 아이템 카드 그림(정사각) */
  itemImage: 80,
  /** 갈아입을 때 위의 바바가 톡 커지는 배수 — 입고 벗기는 자주 하니 작게, 잠금 해제는 크게 */
  bounce: { wear: 1.06, unlock: 1.12 },
  /** 안 가진 아이템 그림의 불투명도 — 아래 귤 값과 함께 가진 것과 가른다 */
  lockedOpacity: 0.5,
  /** 아이템 카드 테두리 — 입은 것은 굵어진다(색만으로 가르지 않는다) */
  itemBorder: { normal: 1, selected: 2 },
  /** 귤 칩(상단 오른쪽 잔액) — 아이콘 · 숫자 · 「+」(귤 모으기로 간다는 표시)를 한 알약에 담는다 */
  chip: { height: 32, icon: 20, gap: 4, plus: 24 },
  /** 「잠금 해제 · 귤 · 값」 버튼 안의 귤 */
  buttonIcon: 20,
  /** 아이템 카드 아래 값 옆의 귤 */
  cellIcon: 16,
  /**
   * 사기 · 첫 선물 팝업 — 홈 말풍선과 같은 종이색 · 외곽선의 둥근 카드.
   * 안의 바바 폭 · 첫 선물의 큰 귤 · 귤 뒤 노란 빛 · 바바 발밑 러그 폭 · 카드 반경
   */
  popup: {
    baba: 144,
    gift: 80,
    glow: 116,
    rug: 150,
    /** 닫기(X)를 종이 모서리에서 안쪽으로 들인 거리 — 끝에 붙으면 오린 종이 밖으로 삐져 보였다 */
    closeInset: 16,
    radius: 24,
  },
  /** 출석한 칸의 연두 면 — 체크는 홈 일정과 같은 `homeV2.color.green` */
  attendanceDone: "#E4ECD9",
  /** 출석 이레 칸 — 칸 높이 · 귤 · 이레째 큰 귤 · 지난 칸 체크 */
  attendance: { cellHeight: 76, icon: 24, bigIcon: 44, check: 28 },
  /** 오늘의 미션 카드 — 왼쪽 아이콘 자리 · 오른쪽 귤 알약 높이 */
  mission: { iconBox: 44, pill: 32 },
  /**
   * 미션 귤 카드(옷장 팝업과 같은 창) — 귤 · 귤 뒤 노란 빛 · 튀는 빛 알갱이 · 튀는 거리
   */
  burst: { center: 80, glow: 116, sparkle: 7, spread: 74 },
} as const;
