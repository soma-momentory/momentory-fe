# 남의 브랜드 자산

**우리가 그린 것이 아니다.** 각 사가 배포하는 원본을 **그대로** 담는다 —
색·비율·모양을 고치면 그 회사의 브랜드 가이드를 어기게 된다.

여기 있는 것은 [`src/components/ds/SocialButton.tsx`](../../src/components/ds/SocialButton.tsx)
한 곳에서만 쓴다.

## `google-g.png`

구글 로그인 버튼의 「G」 마크.

|         |                                                                    |
| ------- | ------------------------------------------------------------------ |
| 받은 곳 | <https://developers.google.com/static/identity/images/g-logo.png>  |
| 받은 날 | 2026-08-24                                                         |
| 크기    | 200×204 (RGBA · 투명 배경)                                         |
| sha256  | `d1ce9c2af0b10a7333abc99bc706f9a6a199e5b65bf3e3009624f076b8638e6a` |

### 왜 PNG 인가 — 벡터로 못 그린다

2026-08-24 이전에는 4색 플랫 「G」를 `react-native-svg` 로 그렸다. **구글이 2025년에
마크를 그라디언트로 바꿨고**, 지금 공식 SVG(`signin-assets.zip`)는 **conic gradient**
위에 가우시안 블러 타원 여섯을 얹고 「G」 모양으로 마스킹한 것이다.
`react-native-svg` 에는 conic gradient 가 없다 — 재현할 방법이 없어서 구글이 렌더한
래스터를 그대로 쓴다.

### 지켜야 하는 것

- **크기·색을 바꾸지 않는다** — tint 를 받지 않게 컴포넌트가 막아 두었다
- **비율을 바꾸지 않는다** — 200×204 라 정사각으로 그리면 2% 눌린다.
  `GoogleMark` 가 높이만 받고 폭은 비율에서 계산한다
- 마크만 따로 다른 곳에 쓰지 않는다 — 허용 범위는 「구글 계정으로 로그인」 버튼이다

전문: <https://developers.google.com/identity/branding-guidelines?hl=ko>

## 여기 없는 것

- **카카오 심볼**은 `src/components/ds/icons/paths.ts` 의 벡터 글리프로 그린다 —
  카카오가 배포하는 것은 PNG·PSD 뿐이라 벡터 원본이 없다(`Icon`)
- **애플 로고**는 담지 않는다 — 로그인 버튼은 시스템 버튼(`ASAuthorizationAppleIDButton`)을
  원으로 두고, 폭이 좁으면 시스템이 로고만 그린다(2026-10-13 · `SocialButton`).
  예전의 완성형 버튼 그림(`appleid_button.png`)과 구글 라벨용 Roboto 는 버튼에서 글자를
  뺄 때 함께 지웠다(`docs/DESIGN.md` 「로그인」)
