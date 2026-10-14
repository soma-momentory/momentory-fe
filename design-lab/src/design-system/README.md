# Design Lab · 디자인 시스템 v0.2 연결

이 폴더는 디자인 시스템 v0.2 「다꾸 메모」를 Design Lab 에 잇는다. **이 저장소만으로 빌드된다.**

## 반입본 (`v0.2/`)

원본은 저장소 밖 `~/Momentory/design-proposals/components/` 의 참조 구현이다. 깨끗한 clone 에서도
빌드되도록 텍스트 두 장만 반입했다. **직접 고치지 않는다** — 원본이 바뀌면 다시 반입하고 아래 해시를 갱신한다.
반입본은 루트 `format:check` 대상이라 Prettier 서식으로 펼쳐져 있다 — 선언과 값은 원본과 같다.

| 반입본                | 원본                        | 원본 sha256                                                        | 바꾼 것                                          |
| --------------------- | --------------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| `v0.2/tokens.css`     | `components/tokens.css`     | `8a9d32c29dd141663fd168843da2b2f6dbbe65c33d9bd7f996427d402a7d4dba` | 머리 주석 · `@font-face` 경로 셋(아래 표의 파일) |
| `v0.2/components.css` | `components/components.css` | `20b709d58a3935437f2462927507712616d4071f6ecf0facbcd2b177c6275c1c` | 머리 주석만                                      |

반입 날짜: 2026-10-13 (원본 `DIARY_DESIGN_SYSTEM.md` v0.2 · 같은 날 공식 기준)

## 그림 · 서체 — 복사하지 않는다

v0.2 시안(`diary-home-rest/assets/`)이 쓴 파일은 **이 저장소 `assets/` 에 바이트가 같은 파일로 이미 있다**(sha256 대조).
`source.ts` 가 그쪽을 상대 경로로 import 하고, `vite.config.ts` 가 dev 서버에 `../assets` 읽기만 허용한다.

| 시안 파일        | 저장소 파일                                |
| ---------------- | ------------------------------------------ |
| `pre-400.otf`    | `assets/fonts/Pretendard-Regular.otf`      |
| `pre-600.otf`    | `assets/fonts/Pretendard-SemiBold.otf`     |
| `hand.ttf`       | `assets/fonts/KyoboHandwriting2025lyb.ttf` |
| `capy-wave.png`  | `assets/home/capybara-wave.png`            |
| `capy-calm.webp` | `assets/body-release/capybara-calm.webp`   |
| `memo-lemon.png` | `assets/diary/memo-paper-lemon@2x.png`     |
| `peb-<감정>.png` | `assets/emotion-pebble/<감정>.png`         |

교보손글씨는 수정 · 변환 · 재배포가 금지다(`assets/fonts/README.md`). 앱이 이미 담고 있는 그 파일을 그대로
가리키므로 새 사본이 생기지 않는다.
