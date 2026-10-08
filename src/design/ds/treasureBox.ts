/**
 * Momentory DS — 오늘의 보물함 장면의 자리 · 크기 · 시간 (2026-10-05).
 * 색은 `color.ts` 의 `treasureBox`. 쓰는 곳은 `components/rest/treasure/` 와 `app/rest/treasure-box.tsx`.
 *
 * 배경(노을빛 풀밭)과 보물함 세 장은 생성 그림이다(`scripts/keyout-treasure-box.py`). 자리는
 * 390×844 로 합성해 쟀다 — 땅 0.36 에서 카피바라와 보물함이 풀밭 빈터에 앉고 카피바라 몸 한가운데가
 * 화면 54% 에 온다(`DESIGN.md` 「쉼 콘텐츠 공통 규칙」 1). 카피바라 포즈는 걱정상자 것을 그대로 쓰므로
 * 손 자리(`holdNote` · `putPaw`)와 비율은 걱정상자에서 잰 값이다.
 */
export const treasureBoxLayout = {
  /** 땅(카피바라 발밑 · 보물함 바닥)의 높이 — 화면 아래에서의 비율 */
  ground: 0.36,
  /**
   * 카피바라가 앉은 자리(가로 비율) — **처음부터 보물함 곁이고 옮기지 않는다**. 앉은 채 통통
   * 뛰어 옮겨 가던 것이 튀어 보였다(2026-10-08 · 실기기 피드백). 넣는 손끝이 보물함 입구에
   * 들어가고, 쉬는 포즈의 손이 보물함 왼쪽에 얹히는 자리다(390×844 합성)
   */
  capybaraX: 0.42,
  chestX: 0.7,
  /** 입력하던 카드가 떠나는 높이(화면 아래에서의 비율) */
  cardFrom: 0.26,
  /** 걱정상자에서 잰 손 자리 — 같은 포즈라 그대로다(`worryBoxLayout`) */
  holdNote: { x: 0, y: 0.36 },
  putPaw: { x: 0.4, y: 0.28 },
  capybaraAspect: 560 / 600,
} as const;

export const treasureBoxSize = {
  capybara: 160,
  /** 보물함 폭 — 카피바라 몸통(그림 폭의 72%)과 비슷하다 */
  chest: 120,
  /**
   * 보물함 그림에서 잰 비율(상자 460×480 · 바닥 기준) — 상자 높이 ÷ 폭 · 앞판 윗변(=열린 입구)의
   * 높이 · 닫힌 보물함 뚜껑 꼭대기의 높이. 빛은 입구에서, 반짝임은 닫힌 뚜껑 위에서 핀다
   */
  chestAspect: 480 / 460,
  frontTop: 195 / 480,
  closedTop: 353 / 480,
  /** 입력에서 변하는 보물 카드 · 카피바라가 넣는 작은 카드 */
  card: { width: 250, radius: 14 },
  note: 30,
  mark: 18,
  shadow: { width: 0.62, chest: 0.92, height: 14, opacity: 0.28 },
  sink: 6,
  /** 오른쪽 위 「지난 보물」 원 — 뒤로가기 원과 같은 지름(`restSceneSize.back`) */
  corner: 40,
} as const;

export const treasureBoxMotion = {
  /** 입력 자리의 카드가 카피바라 손으로 */
  fly: 1500,
  /** 받아 들고 잠시 읽는다(걱정상자의 읽기와 같은 결) */
  hold: 1600,
  /** 뚜껑이 열리고 빛이 번진다 */
  open: 900,
  /** 카드가 손끝에서 둥실 떠올라 한 바퀴 돌며 보물함 안으로 */
  put: 1300,
  /** 입구(앞판 윗변) 위로 들리는 높이(dp) · 손에서 떠날 때 기우는 각도 — 날아가지 않고 넣는다 */
  lift: 22,
  tilt: 8,
  /** 뚜껑이 닫히며 톡 · 반짝임이 핀다 · 잠시 쉼 */
  close: 600,
  bump: 1.06,
  settle: 1200,
  poseSwap: 500,
} as const;

export const treasureBoxFinish = {
  /** 열린 보물함 안에서 번지는 빛 — 보물함 위쪽 가운데가 중심 */
  glow: { size: 200 },
  /** 닫힐 때의 네 갈래 반짝임 — 보물함 위쪽 가운데 기준(dp · y 는 아래가 +) */
  sparkle: { duration: 1100, stagger: 110 },
  sparkles: [
    { x: -52, y: -18, size: 16 },
    { x: 44, y: -34, size: 20 },
    { x: -14, y: -58, size: 12 },
    { x: 60, y: 4, size: 12 },
    { x: -66, y: -48, size: 10 },
    { x: 16, y: -72, size: 14 },
  ],
  /** 끝난 뒤 보물함 둘레에서 떠오르는 빛 알갱이 */
  mote: { duration: 3000, stagger: 150 },
  motes: [
    { x: -40, y: -10, rise: 120, drift: -8, size: 6 },
    { x: 36, y: -6, rise: 140, drift: 10, size: 7 },
    { x: -8, y: -30, rise: 160, drift: 6, size: 5 },
    { x: 52, y: -28, rise: 110, drift: -6, size: 5 },
    { x: -56, y: -40, rise: 100, drift: 8, size: 5 },
    { x: 12, y: -18, rise: 150, drift: -10, size: 6 },
  ],
  /** 「오늘의 보물」에 방금 것이 떠오르는 시간 · 그 뒤 돌아가는 버튼까지 */
  rowRise: 900,
  cta: 1100,
} as const;
