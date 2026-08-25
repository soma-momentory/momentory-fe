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

## `GoogleSans-Medium.ttf`

구글 로그인 버튼 레이블의 공식 서체. Google 브랜딩 가이드가 2026-07-07 개정에서
기존 Roboto Medium 대신 **Google Sans Medium 14/20**을 지정해 교체했다.

|         |                                                                                   |
| ------- | --------------------------------------------------------------------------------- |
| 받은 곳 | Google Fonts CSS API (`Google Sans Flex`, `opsz=18`, `weight=500`)                  |
| 받은 날 | 2026-08-25                                                                        |
| 내부 이름 | `Google Sans Flex Medium` / typographic subfamily `Medium`                       |
| sha256  | `57d61bba609846324d21608a356efe817b02cfaf724dd6b1c42d35f6169f9e6a`                |

- Google 버튼 한 줄에서만 사용한다.
- Google이 제공한 정적 500 TTF를 수정하거나 다시 인스턴싱하지 않는다.
- Google Fonts가 배포하는 원본이며, 앱에는 원본 파일의 라이선스 메타데이터가 포함된다.

## Apple 로고 — 파일이 아니라 `AppleMark.tsx` 안에 있다

애플 로고도 **애플 공식 아트워크**다. 다만 여기 파일로 두지 않고 경로 데이터를
[`src/components/ds/icons/AppleMark.tsx`](../../src/components/ds/icons/AppleMark.tsx)
안에 둔다 — 이 저장소에 `react-native-svg-transformer` 가 없어서 `.svg` 파일을
컴포넌트로 불러올 수 없기 때문이다. **경로는 한 글자도 고치지 않았다.**

|             |                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------- |
| 받은 곳     | `https://devimages-cdn.apple.com/design/resources/download/Logo-Sign-in-with-Apple.dmg`        |
| 받은 날     | 2026-08-24                                                                                     |
| 쓴 파일     | `Sign in with Apple - Left Aligned/SVG/Logo - SIWA - Left-aligned - White - Small.svg` (24×44) |
| sha256(dmg) | `99fba5c8a294a86653294b3766d7ce21dde47cc75a77367659c45ea168699af6`                             |

### 라이선스 — **임베딩이 허용된다. 단 조건이 붙는다**

dmg 를 열 때 동의하는 `Apple Inc. Developer Artwork License Agreement for Sign in
with Apple` §2A 가 **앱 UI 안에서의 사용**을 허용한다:

> use the Developer Artwork **in the user interface of your software applications**
> that run on Apple's iOS … (**and corresponding web-based or other versions** of
> your software applications that have the same title and substantially equivalent
> features and functionality …)

- 괄호 안의 「other versions」가 **우리 안드로이드 빌드**를 덮는다 — 같은 제목·같은
  기능의 대응 버전이다
- ⚠ **「only if you are an Apple Developer Program member」** 가 붙는다 — 멤버십이
  끊기면 이 아트워크를 쓸 근거도 끊긴다
- ⚠ `modify` · `create derivative works` 금지 — **좌표를 손대지 않는다**
- ⚠ dmg 볼륨 안의 `Apple Design Resources License.rtf` 는 **다른 문서다**(「mock-up
  전용 · 소프트웨어 임베드 금지」인 범용 라이선스). 이 아트워크에 적용되는 것은
  위의 SIWA 전용 계약이다 — 둘을 헷갈리면 반대 결론이 나온다

### 원본 다시 받기

```
curl -LO https://devimages-cdn.apple.com/design/resources/download/Logo-Sign-in-with-Apple.dmg
yes | PAGER=cat hdiutil attach -nobrowse -readonly Logo-Sign-in-with-Apple.dmg
```

⚠ `yes |` 는 **라이선스 동의**를 자동으로 누르는 것이다. 회사·조직을 구속하는
계약이므로 (§ 「on behalf of your company or organization」) 무엇에 동의하는지 알고
누른다.

## 여기 없는 것

- **카카오 심볼**은 `src/components/ds/icons/paths.ts` 의 벡터 글리프로 그린다 —
  카카오가 배포하는 것은 PNG·PSD 뿐이라 벡터 원본이 없다(`Icon`)
- **버튼 이미지 전체**(카카오 `kakao_login_*.png` · 애플 버튼 API · 구글 버튼 SVG)는
  담지 않는다. 전체 폭 버튼이라 고정 크기 이미지가 맞지 않고, 문구도 각 사 목록에서
  우리가 고른 것이다. **규격 수치를 실측하는 데에만 썼다**(`docs/DESIGN.md` 「로그인」)
