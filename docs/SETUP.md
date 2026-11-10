# 개발 환경 셋업

처음 오는 사람이 **앱을 화면에 띄우기까지**. 30분쯤 걸리고, 대부분은 네이티브 빌드 대기 시간이다.

> 막히면 아래 「자주 막히는 곳」부터 본다. 여기 적힌 여덟 개는 전부 실제로 겪은 것이다.

---

## 0. 먼저 알아야 할 것 — Expo Go 로는 못 돈다

**앱 스토어의 Expo Go 앱으로는 이 프로젝트를 열 수 없다.** 두 가지 이유가 겹친다.

1. Expo Go 는 보통 최신 SDK 하나만 담는다. 기기의 Expo Go 가 낡으면 `Project is incompatible with this version of Expo Go` 가 뜬다.
2. 더 근본적으로, **카카오·구글 로그인 · 캘린더 · 알림 · 위치(날씨) · 음성 입력 같은 네이티브 모듈이 들어 있다**(목록은 `package.json` · `app.config.ts` 의 `plugins`). Expo Go 에 없는 것들이라 어차피 못 돈다.

그래서 처음부터 **dev client**(우리 네이티브 모듈이 들어간 개발용 앱)를 빌드해서 쓴다.
한 번 빌드해두면 JS 변경은 그대로 리로드되므로, 네이티브 의존성을 추가할 때만 다시 빌드한다.

---

## 1. 공통

|      | 버전                  | 확인            |
| ---- | --------------------- | --------------- |
| Node | **22.14** (`.nvmrc`)  | `node -v`       |
| npm  | 11 이상               | `npm -v`        |
| Git  | 2.4x                  | `git --version` |
| JDK  | **17 이상** (21 권장) | `java -version` |

```bash
git clone https://github.com/soma-momentory/momentory-fe.git
cd momentory-fe
nvm use          # 또는 fnm use
npm ci
cp .env.example .env
```

`.env` 값은 팀의 빌드 환경 변수에서 받는다. **비어 있어도 앱은 뜨지만** 서버 호출이 전부
실패로 닫혀 로그인부터 막힌다(`.env.example`). 값의 성격은 [`CONTRIBUTING.md` 「값을 다루는 세 등급」](CONTRIBUTING.md) 참조.

### 이 저장소만 있으면 된다

화면 스펙·값·상태 기계는 [`docs/spec/`](spec/SNAPSHOT.md)에 반입돼 있고, 토큰과 폰트는
커밋돼 있다 — **설계 상류 폴더는 개발·검증 어디에도 필요 없다.**
~~유일한 예외는 `npm run sync:theme`(토큰 재생성)와 스펙 재반입인데, 둘 다 상류 로컬
저장소를 가진 담당자 전용이다.~~ → **예외가 없어졌다** — `sync:theme`·`check:theme` 은
3세대 이관과 함께 삭제됐고(`PLAN.md` A-16 · `CONTRIBUTING.md` 「생성물」),
`docs/spec/**` 는 동결 스냅샷으로만 유지한다([`docs/spec/SNAPSHOT.md`](spec/SNAPSHOT.md)).

**상류 대신 필요한 것은 서버 하나다** — `npm run sync:api` 가 개발 서버의
`/v3/api-docs` 를 받아 [`docs/api/openapi.json`](api/README.md) 을 갱신한다.
그 경로는 **인증 없이 열려 있어**(BE `PUBLIC_PATHS`) 토큰이 필요 없고,
서버가 꺼져 있으면 커밋된 스냅샷을 그대로 읽으면 된다.

---

## 2. Android — Windows · Mac 공통

Windows 에서 개발한다면 이쪽이 유일한 경로다. Mac 이어도 Android 는 확인해야 한다.

### 설치

**Android Studio** 를 깔고 SDK Manager 에서:

- SDK Platforms — **Android 16 (API 36)**
- SDK Tools — **Build-Tools 36**, **Platform-Tools**, **Emulator**, **NDK 27.1**, **CMake 3.22.1**

NDK 와 CMake 는 안 깔아도 첫 빌드가 자동으로 받는다(각 1GB 안팎, 시간이 걸릴 뿐이다).

### 환경 변수

`ANDROID_HOME` 이 없으면 Gradle 이 SDK 를 못 찾는다.

```bash
# Windows (Git Bash) — 영구 설정은 시스템 환경 변수에
export ANDROID_HOME="C:/Users/<사용자>/AppData/Local/Android/Sdk"
export ANDROID_SDK_ROOT="$ANDROID_HOME"

# macOS
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

### 에뮬레이터 + 빌드

```bash
# 에뮬레이터를 먼저 띄운다 (Android Studio > Device Manager 로 만들어도 된다)
$ANDROID_HOME/emulator/emulator -list-avds
$ANDROID_HOME/emulator/emulator -avd <이름> &

# 부팅 확인
adb wait-for-device shell 'while [ "$(getprop sys.boot_completed)" != "1" ]; do sleep 2; done; echo OK'

npm run android      # prebuild → Gradle 빌드 → 설치 → 실행
```

**첫 빌드는 15~25분**이다 (Gradle 배포본·NDK·CMake 최초 1회 다운로드 포함).
그 다음부터는 1~3분이고, **JS 만 고칠 때는 다시 빌드하지 않는다** — Metro 가 리로드한다.

---

## 3. iOS — Mac 만

```bash
# Xcode + Command Line Tools 설치 후
sudo gem install cocoapods    # 또는 brew install cocoapods
npm run ios
```

첫 빌드는 10~20분. 시뮬레이터가 자동으로 뜬다.

---

## 4. 매일 쓰는 것

```bash
npm start              # Metro 만 띄운다 (이미 dev client 가 설치돼 있을 때)
npm run typecheck      # Lab 까지 보려면 npm run typecheck:expo-lab
npm run lint           # 경고도 실패다 (--max-warnings 0)
npm run format:check   # Prettier 검사 (고치려면 npm run format)
npm run test           # 감시 모드는 npm run test:watch
npm run sync:api       # 서버 API 계약 재반입 — docs/api/README.md (서버가 떠 있을 때만)
npm run lab:web        # Expo Lab — 웹에서 실제 앱 전 화면을 가짜 서버로 (8085 · expo-lab/README.md)
```

⚠ `check:theme` 은 **더 이상 없다**(3세대 이관 때 삭제 · `CONTRIBUTING.md` 「생성물」).

PR 전에 전부 통과해야 한다 — 기준은 [`CONTRIBUTING.md` 「품질 게이트」](CONTRIBUTING.md)가 정본이다.

**다시 빌드해야 하는 때** — 네이티브 의존성 추가, `app.config.ts` 변경, config plugin 추가.
그 외에는 `npm start` 로 충분하다.

---

## 5. 자주 막히는 곳

### `Project is incompatible with this version of Expo Go`

Expo Go 를 쓰려 한 것이다. §0 을 읽고 `npm run android` / `npm run ios` 로 dev client 를 빌드한다.

### `Port 8081 is being used by another process`

Metro 가 이미 떠 있다. 그대로 쓰면 되므로 새로 띄울 필요가 없다.
정리하려면 그 프로세스를 끝낸다.

```bash
# Windows
netstat -ano | grep ":8081.*LISTENING"     # PID 확인 후
powershell -Command "Stop-Process -Id <PID>"
# macOS
lsof -ti:8081 | xargs kill
```

### `npm install` 이 `ERESOLVE` 로 실패

`.npmrc` 의 `legacy-peer-deps=true` 가 있으면 안 나야 정상이다. 안 나면 `npm ci` 로 다시 받는다.

⚠ **이 플래그는 진짜 충돌도 숨긴다.** 새 패키지를 넣은 뒤에는 반드시 `npm run lint` 와
`npm run typecheck` 를 돌린다. 실제로 이 플래그 때문에 ESLint 10 이 조용히 설치돼
린트가 통째로 터진 적이 있다. 제거 조건은 [`CONTRIBUTING.md` 「의존성」](CONTRIBUTING.md) 참조.

### `npm run check:theme` / `sync:theme` 이 "그런 스크립트가 없다"로 실패

**맞다 — 둘 다 삭제됐다**(3세대 이관 · `PLAN.md` A-16). `theme.ts`·`tokens.mvp.ts`·
`paper.ts` 와 함께 사라졌고, 지금 토큰 정본은 [`src/design/ds/`](../src/design/ds/index.ts) 하나다.
값을 바꾸는 일은 상류가 아니라 **이 저장소**에서 시작한다 — `docs/DESIGN.md` 가 SSOT 다.
옛 문서·주석에 남은 이름은 출처 표시일 뿐이다.

### `npm run typecheck` 이 새로 만든 라우트를 모른다고 한다

```
error TS2345: Argument of type '"/rest/sense-pond"' is not assignable to parameter of type
  '"/" | "/home" | "/rest" | ... '
```

**코드가 아니라 생성물이 낡은 것이다.** expo-router 의 **타입 있는 라우트**는
`.expo/types/router.d.ts` 에서 오고, 그 파일은 **개발 서버가 뜰 때 다시 만들어진다.**
새 라우트 파일을 추가한 뒤 `npm start` 를 한 번도 돌리지 않으면 타입에 그 경로가 없다.

```bash
npm start   # 잠깐 띄웠다 끄면 .expo/types 가 갱신된다
```

`.expo/` 는 커밋하지 않으므로 **CI 는 매번 새로 만든다** — 이 오류는 로컬에서만 난다.

### `npm run sync:api` 가 실패

주소를 못 찾았거나 서버가 꺼져 있다. `.env` 의 `EXPO_PUBLIC_API_BASE_URL` 을 채우거나
직접 준다 — `MOMENTORY_API=http://127.0.0.1:8080 npm run sync:api`.
**받지 못해도 개발은 막히지 않는다** — `docs/api/openapi.json` 이 커밋돼 있다.

### 글자가 손글씨가 아닌 것 같다

> **앱 서체는 교보손글씨 하나다**(`KyoboHandwriting2025lyb.ttf` · 로그인 포함 · `assets/fonts/README.md`).
> Pretendard 는 2026-11-09 에 지웠다 — 시스템 고딕이 보이면 폰트가 안 실린 것이다.

서체는 **파일 이름**으로 지정한다(보통은 `Text` 의 variant 가 넣어 준다). 굵기는 하나뿐이라 `fontWeight` 를 줘도 달라지지 않는다.

```tsx
{
  fontFamily: "KyoboHandwriting2025lyb";
} // ○
```

폰트 자체가 안 실렸는지 확인하려면 `adb logcat | grep -i "unrecognized font"` —
아무것도 안 나오면 정상 해석된 것이다.

### Gradle 빌드가 SDK 를 못 찾는다

`ANDROID_HOME` 이 셸에 없다. §2 를 다시 본다. `android/local.properties` 에
`sdk.dir` 을 직접 적어도 되지만, 그 파일은 생성물이라 `prebuild` 때 날아간다.

---

## 6. 앱 식별자와 외부 등록

### 식별자 — 2026-08-24 개정

```
kr.momentory.app         # iOS bundleIdentifier · Android package 동일
momentory                # URL scheme (회고 알림 딥링크)
```

**등록한 뒤에는 바꿀 수 없다.** 스토어는 한 번 쓴 ID 를 재사용하지 못하고,
카카오·구글 콘솔의 플랫폼 설정도 이 값에 묶인다.

> ⚠ **옛 값 `com.momentory.app`(2026-08-05 확정)은 버렸다** — 애플에 등록할 수 없다.
>
> Sign in with Apple 을 붙이려고 App ID 를 만들려니
> `An App ID with Identifier 'com.momentory.app' is not available` 로 거부됐다.
> 그런데 우리 팀 Identifiers 목록은 **통째로 비어 있었다.**
>
> 원인은 **무료 개인 계정(Personal Team)**이다. 팀원이 Xcode 로 실기기에 앱을 올릴 때
> Xcode 가 그 번들 ID 를 조용히 등록하는데, Personal Team 의 등록은
> `developer.apple.com` 의 Identifiers 목록에 **나타나지 않으면서** 문자열은 전역으로
> 점유한다(애플의 번들 ID 는 전 세계에서 유일해야 한다). 그래서 「목록은 비었는데
> 그 이름만 안 되는」 증상이 나온다. 지울 화면이 없으므로 애플 지원 티켓 말고는
> 되찾을 방법이 없고, 응답이 1~3일 걸리며 거절될 수도 있어 이름을 바꿨다.
>
> **계정이 문제인지 문자열이 문제인지 가르는 법** — 아무 의미 없는 값
> (`kr.momentory.tempcheck` 같은)으로 App ID 를 하나 만들어 본다. 그게 되면 계정은
> 멀쩡하고 그 문자열만 점유된 것이다(확인 뒤 지운다).
>
> **마지막 조각으로 흔한 단어를 쓰지 않는다** — `app` 이 정확히 그래서 겹쳤다.
> `kr.` 접두사는 `com.` 네임스페이스 경쟁을 피하고, 나중에 `momentory.kr` 을 사면
> 역-DNS 규칙과도 맞는다.
>
> 바꿀 때 **한 곳만 고치면 안 된다** — `app.config.ts`(iOS·Android 둘 다) ·
> 아래 카카오 콘솔 표 · `docs/CALENDAR-PROBE.md` 의 딥링크 명령 · `npx expo prebuild --clean`.
> 스토어 앱 레코드도 구글 OAuth 클라이언트도 아직 없어서 이 시점의 변경 비용이 가장 쌌다.

### 지문 — 개발용(debug)

Android 는 **서명 인증서 지문**으로 앱을 식별한다. **어느 키스토어로 서명하는지가
먼저다** — 이 프로젝트에는 debug 키스토어가 둘 있고 값이 서로 다르다.

| 언제                                   | 키스토어                     | 성격                                           |
| -------------------------------------- | ---------------------------- | ---------------------------------------------- |
| **`npm run android`** (공식 개발 경로) | `android/app/debug.keystore` | **팀 공용** — prebuild 가 Expo 템플릿에서 복사 |
| Android Studio 로 직접 빌드            | `~/.android/debug.keystore`  | **개인 기기 산출물** — 사람마다 다르다         |

`android/app/build.gradle` 의 debug `signingConfig` 가 **프로젝트 안의 파일**을
가리킨다. 그래서 `npm run android` 로 만든 빌드는 누가 돌려도 같은 키로 서명되고,
**카카오 콘솔에 넣을 값도 팀에 하나뿐이다**:

```
키 해시  Xo8WBi6jzSxKDVR4drqm84yr9iU=
SHA-1    5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
```

> **이 값은 적어 둔다.** 「지문을 문서에 적지 않는다」는 **개인 기기 산출물**에 대한
> 규칙이다 — 남의 값은 쓸모가 없고 문서만 낡기 때문이다. 위 값은 템플릿이 배포하는
> **공개 상수**(2014-01-01 생성, 전 세계 RN 프로젝트가 같은 파일)라 그 이유가 없고,
> 적어 두지 않으면 팀원마다 없는 값을 찾아 헤맨다. `android/` 는 생성물이지만
> prebuild 를 다시 해도 같은 파일이 온다.

**개인 키스토어 값도 함께 등록해 두면 좋다** — 카카오는 키 해시를 여러 개 받고,
누군가 Android Studio 에서 직접 돌리면 그때 필요하다. 등록 비용이 없다.
**개인 값은 각자 뽑아 콘솔에만 넣고 문서·저장소에는 적지 않는다.**

<details>
<summary>직접 뽑는 법 — 공용 값 검증 · 개인 값 추출 (Windows PowerShell)</summary>

`$ks` 만 바꿔 같은 명령을 쓴다 — 공용은 `android\app\debug.keystore`(prebuild 뒤에
생긴다), 개인은 `$env:USERPROFILE\.android\debug.keystore`.

```powershell
# keytool 은 JDK 또는 Android Studio 동봉 JBR 에 있다 (예: <JDK 설치 경로>\bin\keytool.exe,
# <Android Studio 설치 경로>\jbr\bin\keytool.exe). JAVA_HOME 이 잡혀 있으면 그냥 keytool 로 부른다.
$kt = "keytool"
$ks = "android\app\debug.keystore"   # 개인 값은 "$env:USERPROFILE\.android\debug.keystore"

# SHA-1 — 구글 OAuth 용
& $kt -list -v -keystore $ks -alias androiddebugkey -storepass android | Select-String "SHA1:"

# 카카오 키 해시 — SHA-1 을 base64 로
$tmp = "$env:TEMP\dbg.der"
& $kt -exportcert -alias androiddebugkey -keystore $ks -storepass android -file $tmp
[Convert]::ToBase64String([System.Security.Cryptography.SHA1]::Create().ComputeHash([IO.File]::ReadAllBytes($tmp)))
```

macOS / Linux:

```bash
ks=android/app/debug.keystore   # 개인 값은 ~/.android/debug.keystore
keytool -list -v -keystore "$ks" -alias androiddebugkey -storepass android | grep SHA1
keytool -exportcert -alias androiddebugkey -keystore "$ks" -storepass android \
  | openssl sha1 -binary | openssl base64
```

</details>

> ✅ **출시용 지문이 생겼다 (2026-08-26).** EAS 는 쓰지 않는다 — 로컬 키스토어로
> 서명하고, 그 설정은 `plugins/withReleaseSigning.ts` 가 넣는다.
> **지문은 셋이고 각각 콘솔 등록이 따로 필요하다** — §8 「Android 출시」의 표를 본다.
> 빼먹으면 개발 중엔 되던 로그인이 **그 키로 서명된 빌드에서만** 실패한다.

### 등록 체크리스트

| 공급자     | 해야 할 것                                                                                                              | 얻는 값                                                  | 비고                                                          |
| ---------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| **카카오** | 앱 등록 → 플랫폼에 패키지명 + 키 해시 → 카카오 로그인 ON → 동의항목 설정                                                | 네이티브 앱 키 → `EXPO_PUBLIC_KAKAO_APP_KEY`             | 당일·무료                                                     |
| **구글**   | Cloud Console OAuth 클라이언트 — Android(패키지명 + SHA-1) · iOS(번들 ID) · **Web** → **동의 화면을 프로덕션으로 게시** | Web/iOS 클라이언트 ID → `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | 당일·무료. ✅ **연결됨 2026-08-25** — 아래 「구글 콘솔에」 절 |
| **애플**   | Developer Program 가입 → **App ID 등록**(Explicit) → 그 App ID 에 Sign In with Apple 체크 → Key 발급                    | `.p8` · Key ID · Team ID → **백엔드로**                  | **$99/년 · 심사 1~2일**. App ID 는 2026-08-24 등록            |

**애플은 지금 미룰 수 있다.** iOS 전용이고 Android 빌드에는 필요 없다.
다만 App Store 심사 규정(4.8)상 다른 소셜 로그인을 제공하는 iOS 앱은 Sign in with Apple 이
**필수**이므로, iOS 빌드를 만들기 전에는 반드시 끝나 있어야 한다.

> **2026-08-24 — FE 는 붙었다.** `expo-apple-authentication` 이 설치됐고 `S1` 의
> 애플 줄이 실제 시트를 연다(`TASKS.md` 「2026-08-24 · 애플 로그인」).
> **네이티브라 dev client 재빌드가 필요하다** — `npx expo prebuild` → `npm run ios`.
> Android 빌드에는 아무 영향이 없다(플러그인이 iOS 만 건드린다).
>
> **`.env` 에 넣을 값은 없다.** 카카오·구글과 달리 **앱이 드는 키가 하나도 없고**,
> 애플은 번들 ID(`kr.momentory.app`)로 앱을 알아본다. `.p8` · Key ID · Team ID 는
> 전부 **백엔드가** 쓴다.
>
> ✅ **로그인이 끝까지 간다** (2026-08-24). 서버가 `POST /api/v1/auth/apple` 을 냈고
> FE 가 `appleAuthApi.ts` 로 붙였다([`DISCUSSION.md`](DISCUSSION.md) §1-10) —
> 시트 → 인가 → 모멘토리 세션까지 카카오와 같은 길이다.
> **릴리스 잠금도 지웠다**(옛 `login.tsx` 의 `isAppleLineOpen`): 서버가 이메일을
> identity token 안에서 읽으므로 「첫 인가 한 번」을 태울 일이 없어졌다.
>
> ⛔ **서버 쪽에 `APPLE_CLIENT_ID` 가 있어야 앱이 뜬다.** `application.yml` 의
> `apple.auth.client-id` 는 기본값이 없고 `@NotBlank` 라, 없으면 **BE 가 부팅
> 자체를 못 한다.** 값은 **번들 ID `kr.momentory.app`** 이다(애플이 앱을 알아보는
> 이름 · 비밀이 아니다). 운영은 SSM `/momentory/prod/APPLE_CLIENT_ID` 를 읽는다
> (`ecs-task-definition.json`). ⚠ 이 값이 번들 ID 와 어긋나면 로그인이
> `401 APPLE_CLIENT_ID_MISMATCH` 로 떨어진다.
>
> ✅ **`nonce` 도 붙었다** — 앱이 해시를 애플에, 원문을 서버에 보내고 서버가 대조한다.
>
> ⛔ **남은 것 하나 — 탈퇴 시 애플 `revoke`.** App Store 심사 규정이 요구하고,
> 서버가 `.p8` 로 서명해야 한다(§1-10 「정할 것 넷」4). `.p8` · Key ID · Team ID 는
> **아직 발급 전이다.**

<details>
<summary>애플 콘솔에서 정확히 무엇을 하는가 (2026-08-24)</summary>

App ID 를 만들 때 **입력 칸이 둘이고 규칙이 정반대다** — 여기서 대부분 막힌다.

| 칸                       | 값                 | 규칙                                                |
| ------------------------ | ------------------ | --------------------------------------------------- |
| Description              | `Momentory`        | **영문·숫자·공백만.** 마침표를 넣으면 거부된다      |
| Bundle ID (**Explicit**) | `kr.momentory.app` | Wildcard 를 고르면 Sign in with Apple 을 켤 수 없다 |

1. Identifiers → + → App IDs → App → 위 표대로 채우고, 같은 화면의 Capabilities 에서
   **Sign In with Apple** 을 체크한다.
2. **이걸 안 켜면 Key 를 만들 때 Primary App ID 드롭다운에 이 App ID 가 아예 안 뜬다.**
   「번들 ID 가 목록에 없다」의 두 번째 흔한 원인이다.
3. Keys → + → Sign in with Apple → Configure → Primary App ID = `kr.momentory.app`.
   **`.p8` 은 한 번만 받을 수 있다.**
4. `.p8` · Key ID · Team ID 를 백엔드에 넘긴다 — 서버가 identity token 의 `aud` 가
   `kr.momentory.app` 인지 검증한다(카카오와 같은 형태 · [`DISCUSSION.md`](DISCUSSION.md) §1-6 부근).

> **Services ID 는 만들지 않는다.** 네이티브 iOS 앱만 붙이므로 Services ID + Return URL
> 은 웹·안드로이드용이라 해당 없다.
>
> ⚠ **`.p8` 파일과 그 내용은 저장소·문서에 적지 않는다**
> ([`CONTRIBUTING.md` 「값을 다루는 세 등급」](CONTRIBUTING.md) ②③). Key ID·Team ID 는
> 공개 식별자지만 `.p8` 은 서명 키다.

</details>

받은 값은 `.env` 에 넣는다 — 커밋하지 않는다.
성격은 [`CONTRIBUTING.md` 「값을 다루는 세 등급」](CONTRIBUTING.md) 참조(이 값들은 ①번, 공개 식별자다).

### 카카오 콘솔에 정확히 무엇을 넣는가 (2026-08-07 · 카카오 로그인 연결)

| 콘솔 자리                   | 값                                                                             |
| --------------------------- | ------------------------------------------------------------------------------ |
| 플랫폼 › Android › 패키지명 | `kr.momentory.app` ← ⚠ 2026-08-24 변경                                         |
| 플랫폼 › Android › 키 해시  | **`Xo8WBi6jzSxKDVR4drqm84yr9iU=`** (팀 공용 debug — 위 「지문」 절)            |
| 플랫폼 › iOS › 번들 ID      | `kr.momentory.app` ← ⚠ 2026-08-24 변경                                         |
| 카카오 로그인 › 활성화      | ON                                                                             |
| 카카오 로그인 › 동의항목    | MVP 가 쓰는 것만 — **닉네임·프로필 사진은 온보딩에서 직접 받으므로 필수 없음** |
| 앱 키                       | **네이티브 앱 키** → `EXPO_PUBLIC_KAKAO_APP_KEY` (REST·JavaScript 키가 아니다) |

- ⚠ **2026-08-24 에 패키지명·번들 ID 가 바뀌었다**(위 「식별자」 절). 카카오 콘솔의
  두 칸을 `kr.momentory.app` 으로 고치기 전까지 **카카오 로그인이 실패한다** —
  Android 는 `AUTHORIZATION_FAILED` 로 닫힌다. **키 해시는 그대로다**(서명 인증서에서
  나오는 값이라 패키지명과 무관하다).
- **Redirect URI 를 따로 등록하지 않는다.** 네이티브 SDK 는 `kakao{네이티브앱키}://oauth`
  스킴으로 돌아오고, 그 스킴은 `app.config.ts` 의 플러그인이 매니페스트·Info.plist 에
  넣는다(`plugins` 의 `@react-native-seoul/kakao-login`).
- **iOS URL scheme** 은 `kakao` + 네이티브 앱 키다. 손으로 적지 않는다 — 같은 플러그인이 쓴다.
- 키 해시가 빠지면 로그인은 `AUTHORIZATION_FAILED: invalid android_key_hash` 로 실패한다.
  **`npm run android` 경로는 위 공용 값 하나로 팀 전원이 덮인다** — 팀원이 늘어도
  다시 넣을 것이 없다. Android Studio 로 직접 빌드하는 사람만 자기 값을 더한다.
- ✅ **release 키 해시 둘도 등록됐다 (2026-08-26)** — 업로드 키와 Play 앱 서명 키.
  카카오는 키 해시를 여러 줄 받으므로 셋을 한 칸에 줄바꿈으로 넣는다. 값은 §8 표.

### 구글 콘솔에 정확히 무엇을 넣는가 (2026-08-25 · 구글 로그인 연결)

[Google Cloud Console](https://console.cloud.google.com) → **API 및 서비스 → 사용자 인증 정보**.
**클라이언트를 셋 만든다** — 하나로 되지 않는다.

| 클라이언트 종류 | 넣는 값                                 | 쓰이는 곳                                             |
| --------------- | --------------------------------------- | ----------------------------------------------------- |
| **웹**          | (없음)                                  | **서버 검증의 중심** · Android 의 `serverClientId`    |
| **Android**     | 패키지명 `kr.momentory.app` + **SHA-1** | 구글이 앱을 알아보는 근거 — 앱은 이 ID 를 들지 않는다 |
| **iOS**         | 번들 ID `kr.momentory.app`              | `iosClientId` + 역순 스킴                             |

받은 값이 가는 자리:

```
웹 클라이언트 ID    → .env EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID  +  BE GOOGLE_ALLOWED_AUDIENCES
iOS 클라이언트 ID   → .env EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID  +  BE GOOGLE_ALLOWED_AUDIENCES
Android 클라이언트 ID →                     (앱은 안 든다)      BE GOOGLE_ALLOWED_AUDIENCES
```

- ⚠ **웹 클라이언트 ID 가 Android 에서도 필요하다.** 그것이 `serverClientId` 로 가서
  **ID token 의 `aud`** 가 된다 — 비어 있으면 로그인 시트는 뜨는데 **토큰이 오지 않는다.**
  이름 때문에 「웹은 우리와 무관」으로 읽히기 쉬운 자리다.
- **역순 클라이언트 ID(`com.googleusercontent.apps.…`)를 `.env` 에 두지 않는다** —
  iOS 클라이언트 ID 에서 `app.config.ts` 가 만들어 플러그인에 넘긴다. 손으로 적으면
  한쪽만 고쳐지고, 그 어긋남은 **시트는 뜨는데 앱으로 돌아오지 않는** 모양으로만 드러난다.
- **Android 클라이언트 ID 를 앱에 넣지 않는다** — 라이브러리가 `androidClientId` 를 받으면
  개발 빌드에서 오류를 찍는다. 구글은 Android 앱을 **패키지명 + 지문**으로 알아본다.
- 서버는 셋을 **전부 받아들인다**(`GOOGLE_ALLOWED_AUDIENCES` 는 목록이다) — 플랫폼마다
  `aud` 에 앉는 값이 다르기 때문이다. 값은 `application.yml` 에 기본값으로 있어서
  **환경변수 없이도 뜬다**(공개 식별자 · 애플 `client-id` 와 같은 등급).

#### ⛔ 출시 전에 반드시 닫아야 하는 둘

1. **OAuth 동의 화면을 「프로덕션」으로 게시한다.** 「테스트」 상태로 두면 테스트
   사용자로 등록한 계정(최대 100개)만 로그인된다 — **스토어에 올려도 대부분의
   사용자가 로그인하지 못한다.** 우리 스코프는 `openid`·`email`·`profile`(비민감)이라
   **구글 심사 없이 즉시 게시된다.**
   ⚠ 단 **커스텀 로고를 올리면 브랜드 검증 심사**가 붙어 수일이 걸린다 — 급하면
   로고 없이 먼저 게시한다. 개인정보 처리방침·서비스 약관 URL 은 필수다
   (`src/lib/links.ts` 가 여는 그 문서).
2. **릴리스 SHA-1 과 Play 앱 서명 SHA-1 을 Android 클라이언트로 추가한다.**
   지문 하나당 클라이언트 하나이므로 **Android 클라이언트가 셋이 된다**
   (debug · release · Play 앱 서명). 카카오 키 해시와 같은 함정이고, 빠지면
   **스토어 설치본에서만** 로그인이 실패한다(위 「지문」 절 ⚠).
   서버는 `GOOGLE_CLIENT_ID_MISMATCH` 로 답하고 앱은 「Google 로그인 정보가
   만료됐어요」를 띄운다 — 실기기에서 이 조합이 보이면 **구글이 거절한 것이 아니라
   지문이 빠진 것**이다(`googleAuthApi.ts` 의 `google_client_mismatch`).

> **네이티브라 dev client 재빌드가 필요하다** — `npx expo prebuild` → `npm run android`
> (iOS 는 `npm run ios`). `@react-native-google-signin/google-signin` 이 Android 는
> Credential Manager 를, iOS 는 URL 스킴을 건드린다.
>
> **개발 통로가 옮겨 갔다.** Google 줄은 SDK 가 없는 동안 `signInDev` 로 가짜 세션을
> 만드는 자리였는데, 이제 실제 로그인이다. 로컬에서 세션이 필요하면
> **로그인 화면의 워드마크(「모멘토리」)를 길게 누른다** — 개발 빌드에서만 열린다.

### API 서버 — ✅ HTTPS 다 (2026-08-25)

```
EXPO_PUBLIC_API_BASE_URL=https://api.momentory.co.kr
```

Xcode로 App Store 배포용 iOS 프로젝트를 만들 때는 운영 검증을 명시적으로 켠다.
이 값이 `production`이면 API 주소·카카오 키·Google iOS/Web 클라이언트 ID가 모두
있는지, API 주소가 **`https://api.momentory.co.kr` 인지** `app.config.ts`가 prebuild 전에 검사한다.

> ⚠ **출시 빌드는 운영 주소가 아니면 실패한다** (2026-10-05). App Store iOS 1.1.0 이
> `.env` 의 `dev.momentory.co.kr` 를 품고 나가, 그 기간 iOS 신규 가입이 전부 **개발 DB** 로
> 갔다(그 전 검사는 https 인지만 봤다). 이제 검사가 셋 중 하나에서 켜진다 —
> `MOMENTORY_BUILD_ENV=production` · Xcode 의 **Release 빌드 · 아카이브**(`CONFIGURATION=Release`) ·
> Android 의 **`bundleRelease` · `assembleRelease`**(`plugins/withReleaseSigning.ts` 가 Gradle 에
> 심는다). prebuild 때 켜는 것을 잊어도 아카이브 · AAB 단계에서 걸린다.
> **출시 빌드 전에 `.env` 를 `EXPO_PUBLIC_API_BASE_URL=https://api.momentory.co.kr` 로 바꾸고,
> 끝나면 개발 주소로 되돌린다.**

```bash
MOMENTORY_BUILD_ENV=production npx expo prebuild --platform ios --clean
npm run check:ios-release   # 운영 introspect + 생성된 ios/app/Info.plist 의 권한 검사 — 아래
```

개발 빌드는 `.env`의 `MOMENTORY_BUILD_ENV=development`를 그대로 사용한다.

> ⚠ **출시 prebuild 뒤에는 `npm run check:ios-release` 를 돌린다** (2026-11-08 · 1.4.0 Build 8).
> `scripts/check-ios-release-plist.mjs` 가 운영 설정으로 `expo config --type introspect` 를 돌리고,
> 생성된 `ios/app/Info.plist` 가 있으면 그것도 본다 — Expo Dev Launcher 의 로컬 네트워크 문구 ·
> `_expo._tcp` · 위치 Always · Reminders · Face ID 가 **없고**, 위치 「사용 중」 · 마이크 ·
> 음성 인식 · 캘린더 · 사진 · Motion(아래) 이 **있고**, 그 밖의 `*UsageDescription` 이 없고, 번들 ID 와
> 운영 API 호스트가 맞는지. 버전 · 빌드 번호는 찍어 준다.
>
> 왜 생겼나 — 1.4.0 Build 8 prebuild 의 `Info.plist` 에 dev launcher 문구와 `expo-location` 의 영문 기본
> 문구(Always · Motion)가 남아 있었다. 원인 둘: ① config-plugins 는 mod 를 **등록 역순**으로 돌려서
> `plugins` 배열 **맨 뒤**에 둔 `withoutDevLauncherNetwork` 가 `expo-dev-client` 보다 먼저 돌았다(지운 자리에
> 다시 넣었다 — 플러그인이 `nextMod` 를 먼저 돌린 뒤 지우도록 고쳤다 · `plugins/withoutDevLauncherNetwork.ts`
> 머리말) ② `expo-location` 플러그인은 `locationAlwaysPermission` · `locationAlwaysAndWhenInUsePermission` ·
> `motionUsagePermission` 을 **`false` 로 명시하지 않으면** 기본 문구를 넣는다(`app.config.ts`). 둘 다 자동
> 심사가 Reminders 때 걸었던 「쓰지 않는 자원의 일반 문구」와 같은 종류다.
>
> **`NSMotionUsageDescription` 은 예외다 — 빼면 안 된다** (2026-11-09). Motion 까지 뺀 Build 8 이
> App Store Connect 업로드에서 **ITMS-90683(purpose string 누락)** 으로 막혔다. 앱은 움직임 정보를 쓰지
> 않지만 `expo-location` 네이티브 모듈이 `CMMotionActivityManager` 를 참조해(`LocationModule.swift` ·
> `Providers/MotionActivityStreamer.swift` · `Requesters/MotionActivityPermissionRequester.swift`) 바이너리에
> CoreMotion 이 링크되고, 애플은 **참조만으로** 문구를 요구한다. 그래서 `app.config.ts` 의
> `motionUsagePermission` 에 **거짓 목적이 아니라 사실**(「움직임 정보를 수집하지 않는다 · 구성 요소에 포함된
> 항목이라 표시될 뿐 · 실제로 요청하지 않는다」)을 적는다 — 부르는 코드가 없어 사용자에게 이 창은 뜨지 않는다.
> 참조 자체를 없애는 길은 pod 소스 패치뿐이다(`patch-package` 로 위 Swift 셋과 `LocationModule.swift` 의
> motion 등록부를 들어내기) — SDK 를 올릴 때마다 다시 맞춰야 하고 모듈 정의 본체를 건드려서 **출시 직전에는
> 하지 않는다.** 위치 Always 둘은 그대로 `false` 다 — 그쪽은 참조가 아니라 요청 코드가 있어야 걸린다.
>
> **`NSPhotoLibraryUsageDescription` 도 같은 까닭으로 둔다** (2026-11-09). 앱에는 사진을 고르거나 저장하는 기능이
> 없지만 `expo-image` 가 `ph://` 주소용 `PhotoLibraryAssetLoader`(`ios/Loaders/PhotoLibraryAssetLoader.swift` ·
> `import Photos`)를 늘 등록해 바이너리가 사진 보관함 API 를 참조한다. 옛 문구(「사진을 첨부하거나 저장」)는
> **없는 기능을 말해서** 바꿨다 — 지금은 Motion 처럼 「접근하지 않는다 · 구성 요소에 포함돼 표시될 뿐」이다.

> ✅ **두 서버의 API 가 다시 같다** (2026-11-08 BE dev → main 릴리스). 운영 `api.momentory.co.kr` = BE `main`,
> 개발 `dev.momentory.co.kr` = BE `dev` 이고 둘의 경로가 같다(55개 · `/v3/api-docs` 대조). 팀 `.env` 는 개발 주소다.
> (2026-11-06 에는 편지 · 날씨 · 온보딩 v2 · 소원 · 명상 · 주간 리포트 v2 등 BE #76~#91 이 dev 에만 있어 출시가 막혀 있었다.)
> **FE 가 새 API 에 기대는 출시는 앞으로도 BE 릴리스가 먼저다.**

ACM 인증서(Amazon RSA 2048 M04 · 2027-03-09 만료). **IP 가 아니라 도메인**이라
iOS ATS 문제도 함께 사라졌다 — 예고대로 **`.env` 한 줄**로 끝났다
([`DISCUSSION.md`](DISCUSSION.md) §1-6 · 2026-08-25 닫힘).

- **평문 예외는 스스로 빠진다.** [`plugins/withInsecureDevApi.ts`](../plugins/withInsecureDevApi.ts)
  는 `EXPO_PUBLIC_API_BASE_URL` 이 **`http://` 일 때만** 목록에 들어간다 —
  `https://` 인 지금은 플러그인 자체가 없다(`npx expo config --type public --json` 으로 확인).
- ⚠ **재빌드 전까지는 옛 예외가 네이티브에 남아 있다.** `android/.../network_security_config.xml`
  과 iOS `NSExceptionDomains` 에 옛 ALB 주소가 그대로다 — **`npx expo prebuild` 를
  다시 해야 지워진다.** 생성물이라 손으로 고치지 않는다.
- 주소·앱 키를 바꾸면 네이티브 설정이 바뀐다 — `npm run android` 로 **다시 빌드**해야 한다.
- **로컬 BE 에 붙을 때는 여전히 평문이다** — `.env` 를 `http://localhost:8080` 으로 바꾸면
  플러그인이 되살아나 그 호스트 하나에만 예외를 연다(실기기는 `adb reverse` 를 먼저 건다).

> **서버 쪽 사실**(BE 저장소 대조 · 2026-08-21 · HTTPS 갱신 2026-08-25) — 컨테이너는
> **8080 평문**으로 듣는다(`ecs-task-definition.json`). ✅ **TLS 는 앞단(ALB)에서 끊는다** —
> 앱이 보는 것은 HTTPS 이고 컨테이너 설정은 그대로다.
>
> 로컬로 띄운 서버에 붙일 때 알아 두면 편한 것:
>
> | 경로               | 무엇                                                   |
> | ------------------ | ------------------------------------------------------ |
> | `/actuator/health` | 살아 있는지 — 인증 없이 열려 있다                      |
> | `/swagger-ui/`     | 계약을 눈으로 볼 때. 인증 없이 열려 있다               |
> | `/v3/api-docs`     | `npm run sync:api` 가 받는 곳. 인증 없이 열려 있다     |
> | `/api/v1/auth/**`  | 로그인·갱신·로그아웃. 나머지는 전부 Bearer 를 요구한다 |
>
> ⚠ **Swagger 는 운영에서도 기본 켜짐**이다(`application-prod.yml` 의
> `${SWAGGER_ENABLED:true}`). 배포 전에 BE 에 확인할 자리다.

---

## 7. 에디터

VS Code 기준 권장 확장:

- **ESLint** · **Prettier** — 저장 시 포맷. `.prettierignore` 에 있는 것(`docs/spec/` · `docs/api/openapi.json`)은 **반입물이라 포맷하지 않는다** — 서식이 바뀌면 sha256 대조가 깨진다
- **Expo Tools**

```jsonc
// .vscode/settings.json (개인 설정 — 커밋하지 않는다)
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
}
```

---

## 8. Android 출시 (릴리스 빌드 · Play Console)

2026-08-26 에 처음 올리면서 정리한 절차다. **EAS 는 쓰지 않는다** — 로컬 키스토어로
서명하고 `./gradlew` 로 AAB 를 만든다.

### 준비물 — 이 기기에만 있고 저장소에는 없는 것

| 무엇                   | 어디                                                   | 왜 저장소 밖인가                                                 |
| ---------------------- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 업로드 키스토어        | `~/keys/momentory-release.keystore`                    | 비밀이고, `/android` 안에 두면 `expo prebuild --clean` 이 지운다 |
| 키스토어 비밀번호·별칭 | `~/.gradle/gradle.properties` 의 `MOMENTORY_RELEASE_*` | Gradle 이 사용자 홈에서 읽는다. 저장소는 **이름만 참조**한다     |

```properties
# ~/.gradle/gradle.properties
MOMENTORY_RELEASE_STORE_FILE=/Users/<나>/keys/momentory-release.keystore
MOMENTORY_RELEASE_STORE_PASSWORD=…
MOMENTORY_RELEASE_KEY_ALIAS=momentory
MOMENTORY_RELEASE_KEY_PASSWORD=…
```

⚠ **업로드 키를 잃으면 같은 앱을 갱신할 수 없다.** Play 앱 서명을 쓰므로 업로드 키
재설정을 신청할 수는 있지만 며칠이 걸린다. 키스토어는 따로 백업한다.

값이 없는 기기에서도 프로젝트는 **구성된다** — `withReleaseSigning` 이 `hasProperty`
로 감싸고, 없으면 debug 키로 떨어지면서 빌드 로그에 경고를 찍는다. 조용히 떨어지면
Play 가 「디버그 모드로 서명됨」으로 거절할 때에야 알게 된다.

### 빌드

순서가 있다 — **`.env` 를 운영으로 바꾼 뒤** prebuild 해야 한다. `.env` 가 플러그인 목록을
정하므로(`productionCleanupPlugins` 는 `MOMENTORY_BUILD_ENV=production` 일 때만 붙는다)
prebuild 뒤에 `.env` 만 바꾸면 네이티브에는 반영되지 않는다.

```bash
# 0. .env 두 줄 — 끝나면 되돌린다
#    EXPO_PUBLIC_API_BASE_URL=https://api.momentory.co.kr
#    MOMENTORY_BUILD_ENV=production
# 1. app.config.ts 의 version · android.versionCode 를 올린다(아래 「versionCode」)
npx expo config --type public --json | jq '{version, versionCode: .android.versionCode, api: .extra.apiBaseUrl}'
#    → 1.4.0 · 11 · https://api.momentory.co.kr 처럼 셋이 맞는지 눈으로 본다
npx expo prebuild -p android --clean --no-install   # /android 를 지우고 다시 만든다
echo "sdk.dir=$HOME/Library/Android/sdk" > android/local.properties
cd android
JAVA_HOME=/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home \
  ./gradlew :app:bundleRelease            # → app/build/outputs/bundle/release/app-release.aab
cd ..
cp android/app/build/outputs/bundle/release/app-release.aab \
   ../output/momentory-android-<version>-vc<versionCode>.aab   # 산출물은 저장소 밖 ../output 에 둔다
# 2. .env 를 개발 주소(dev.momentory.co.kr) · MOMENTORY_BUILD_ENV=development 로 되돌린다
```

`--clean` 은 `/android` 를 통째로 지운다 — 키스토어가 `~/keys` 에 있는 이유다(준비물 표).
`.env` 를 되돌린 뒤 `npm run android` 를 하면 개발용으로 다시 prebuild 된다.

**막히는 자리 둘. 둘 다 prebuild 가 원인이다.**

- **`SDK location not found`** — `android/local.properties` 는 생성물이라 prebuild 가
  지운다. `npm run android` 는 다시 만들어 주지만 **`./gradlew` 를 직접 부르면 안 만든다.**
- **`configureCMakeRelWithDebInfo … FAILED`** — 기본 JDK 가 25 면 AGP 가 지원하지
  않아 prefab 단계에서 깨진다. 오류 문구가 JVM 경고문("A restricted method in
  java.lang.System has been called")이라 원인이 안 보인다. **JDK 21 로 빌드한다.**

올리기 전에 서명을 확인한다. `CN=Android Debug` 가 보이면 잘못된 것이다:

```bash
keytool -J-Duser.language=en -printcert -jarfile android/app/build/outputs/bundle/release/app-release.aab
```

> `-J-Duser.language=en` 은 장식이 아니다 — Temurin 25 + 한국어 로캘에서
> `keytool -list -v` 가 `IllegalFormatConversionException` 으로 죽는다(JDK 버그).

### versionCode

[`app.config.ts`](../app.config.ts) 의 `android.versionCode` 를 **업로드마다 1 씩** 올린다.
Play 는 같은 값을 두 번 받지 않고, 심사 반려 뒤 재업로드도 포함이다.
`android/app/build.gradle` 에서 올리면 다음 prebuild 에 1 로 되돌아간다.

**이력** — 산출물 이름(`../output/momentory-android-<version>-vc<code>.aab`)과 같이 적는다.
`version` 은 사람이 읽는 이름이라 되돌아갈 수도 있고(vc8 의 1.1.2), 순서는 `versionCode` 만 만든다.

| versionCode | version | 날짜         | 비고                                                                                             |
| ----------- | ------- | ------------ | ------------------------------------------------------------------------------------------------ |
| 1 · 2       | 0.1.x   | 2026-08-26   | 첫 비공개 테스트 업로드(8-26) 와 그 뒤 갱신                                                      |
| 3           | —       | 2026-09      | **소비됨** — dev 서버로 빌드한 AAB 를 올렸다 지웠다(`app.config.ts` 주석)                        |
| 4 · 5       | 0.1.x   | 2026-09-06 ~ | 비공개 테스트 갱신 — 5 까지 업로드됐다(2026-10-03 확인)                                          |
| 6           | 0.1.1   | 2026-10-03   | `momentory-0.1.1-vc6.aab`                                                                        |
| 7           | 1.2.0   | 2026-10-06   | `momentory-1.2.0-vc7.aab`                                                                        |
| 8           | 1.1.2   | 2026-10-06   | `momentory-android-1.1.2-vc8.aab`                                                                |
| 9           | 1.2.0   | 2026-10-09   | `momentory-android-1.2.0-vc9.aab` — Play 에 올라가 번호가 소비됐다                               |
| 10          | 1.3.0   | 2026-10-14   | `momentory-android-1.3.0-vc10.aab` — **운영 서버**(`api.momentory.co.kr`) 빌드                   |
| **11**      | 1.4.0   | 2026-11-08   | `momentory-android-1.4.0-vc11.aab` — 운영 서버 · iOS `buildNumber 8` · **출시**(2026-11-09 확인) |

### 지문 셋 — 하나라도 빠지면 그 빌드에서만 로그인이 실패한다

Android 는 **패키지명 + 서명 지문**으로 앱을 식별한다. 서명 키가 셋이므로 등록도 셋이다.

| 키               | 언제 쓰이나        | SHA-1                                                         | 카카오 키 해시                 | 구글 클라이언트                      |
| ---------------- | ------------------ | ------------------------------------------------------------- | ------------------------------ | ------------------------------------ |
| debug            | `npm run android`  | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | `Xo8WBi6jzSxKDVR4drqm84yr9iU=` | `…-sbcn188a2mhoqv1f0pt54s6dnjde6of1` |
| 업로드 키        | AAB 직접 설치·검증 | `32:78:DA:5C:7A:89:EA:B6:CA:45:E0:12:7D:85:EA:73:C2:CC:23:8E` | `MnjaXHqJ6rbKReASfYXqc8LMI44=` | `…-8ali2jjss29dqkrkfp8ajps4co83mars` |
| **Play 앱 서명** | **스토어 설치본**  | `BB:83:37:16:DE:82:71:9E:10:B7:1C:11:D6:BC:E5:0F:2D:C3:03:86` | `u4M3Ft6CcZ4QtxwR1rzlDy3DA4Y=` | `…-56os4edgbpkar5dh3p1j7l7kv4imv3v6` |

- **카카오** — 플랫폼 › Android › 키 해시 한 칸에 셋을 줄바꿈으로 넣는다
- **구글** — 지문 하나당 Android 클라이언트 하나다. **클라이언트 ID 는 앱에 넣지 않는다**
  (`androidClientId` 를 받으면 라이브러리가 오류를 낸다). 앱이 드는 것은 web client ID 하나뿐
- **서버** — `momentory-be` 의 `allowed-audiences` 에 **Android 클라이언트 ID 도 넣는다.**
  구글 ID token 의 `azp` 에 그 값이 앉고 서버가 `aud` 와 함께 대조한다
  (`GoogleIdTokenVerifier.requireOurClient`). **새 지문을 만들면 여기도 늘린다.**

> **Play 앱 서명 SHA-1 은 Play Console 화면에서 눈으로 옮기지 말 것.** 「앱 서명 키」
> 화면에는 **「양자 내성 암호화 키」 지문이 나란히** 있고, 그걸 복사하면 카카오·구글이
> **동시에** 막힌다(2026-08-26 에 실제로 그랬다). 확실한 방법은 스토어 설치본에서
> 직접 뽑는 것이다:
>
> ```bash
> adb shell pm path kr.momentory.app                    # base.apk 경로
> adb pull <base.apk 경로> /tmp/store-base.apk
> $ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs /tmp/store-base.apk
> ```
>
> hex → 카카오 키 해시: `echo <콜론 뺀 hex> | xxd -r -p | openssl base64`

### 릴리스 빌드를 기기에서 직접 검증하기

Play 반영을 기다리지 않고 로그인 경로를 확인할 수 있다. **업로드 키** 지문으로 도는 검증이라
Play 앱 서명 경로는 여전히 스토어 설치본으로 확인해야 한다.

```bash
./gradlew :app:assembleRelease   # JAVA_HOME 은 위와 같다
adb uninstall kr.momentory.app   # debug 빌드와 서명이 달라 덮어쓰기가 안 된다
adb install -r app/build/outputs/apk/release/app-release.apk
```

릴리스 빌드는 실패 사유를 화면에 숨긴다(`__DEV__` 에서만 `console.warn`). 안 될 때는
`adb logcat` 을 본다.

### Play Console — 개인 계정이 걸리는 둘

**① 카테고리·태그가 건강 계열이면 개인 계정으로 출시할 수 없다.**
금융·건강(의료)·VPN·정부 앱은 **조직 계정 전용**이다. 카테고리를 「건강 및 피트니스」로
두면 「건강 앱」 선언에서 **「건강 기능 없음」을 고를 수조차 없고**, 제출은 정책 위반으로
거절된다. 모멘토리는 **라이프스타일**이고, 태그에서도 건강 계열을 뺀다.

> 마음을 다루는 앱이라고 해서 건강 앱이 아니다. Play 가 묻는 것은 「규제 대상 건강
> 서비스를 제공하는가」다 — 진단·치료·의료기기·임상연구. 회고와 일기는 해당하지 않는다.
> 스토어 설명의 「스트레스 완화」·「정신건강」 같은 표현도 같은 이유로 피한다.

**② 프로덕션에 바로 못 간다.**
개인 개발자 계정은 **비공개 테스트를 일정 인원(콘솔 표시) × 14일 연속** 돌린 뒤에야
프로덕션 액세스를 신청할 수 있다. **내부 테스트는 이 요건에 들어가지 않는다.**
14일은 출시일이 아니라 **인원이 다 옵트인한 시점부터** 센다.

### iOS 업로드 — `buildNumber`

Android 의 `versionCode` 와 같은 자리다. [`app.config.ts`](../app.config.ts) 의
`ios.buildNumber` 를 **App Store Connect 에 올릴 때마다** 올린다(아카이브를 다시 만들
때마다가 아니다). 같은 `version` 으로 다시 올리려면 반드시 커야 하고, 한 번 쓴 번호는
그 버전에서 재사용할 수 없다. 적지 않으면 Expo 가 `1` 로 만든다.

`MOMENTORY_BUILD_ENV=production` 으로 prebuild 해야 배포 설정이 들어간다 —
그때 `.env` 의 네 값이 모두 있어야 하고 **API 주소는 `https://api.momentory.co.kr` 여야 한다**(`app.config.ts` · 위 §6).

### 심사는 세 번이다

|                      | 언제              | 비고                                             |
| -------------------- | ----------------- | ------------------------------------------------ |
| 내부 테스트          | **없음**          | 심사 없이 몇 분~몇 시간 뒤 설치 가능             |
| 비공개·공개 테스트   | 트랙에 올릴 때    | 신규 앱 첫 심사는 며칠                           |
| 프로덕션 액세스 신청 | 14일 요건 충족 후 | 테스터 피드백을 서술해야 한다 — **기록해 둘 것** |
| 프로덕션 출시        | 액세스 승인 후    | 버전마다 다시 심사                               |
