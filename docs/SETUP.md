# 개발 환경 셋업

처음 오는 사람이 **앱을 화면에 띄우기까지**. 30분쯤 걸리고, 대부분은 네이티브 빌드 대기 시간이다.

> 막히면 아래 「자주 막히는 곳」부터 본다. 여기 적힌 6개는 전부 실제로 겪은 것이다.

---

## 0. 먼저 알아야 할 것 — Expo Go 로는 못 돈다

**앱 스토어의 Expo Go 앱으로는 이 프로젝트를 열 수 없다.** 두 가지 이유가 겹친다.

1. Expo Go 는 보통 최신 SDK 하나만 담는다. 기기의 Expo Go 가 낡으면 `Project is incompatible with this version of Expo Go` 가 뜬다.
2. 더 근본적으로, **M2 부터 카카오 로그인·캘린더·알림·생체인증이 들어온다.** 이건 Expo Go 에 없는 네이티브 모듈이라 어차피 못 돈다.

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

`.env` 값은 팀의 빌드 환경 변수에서 받는다. **비어 있어도 M1 까지는 앱이 뜬다** —
로그인·캘린더가 들어오는 M2 부터 필요하다. 값의 성격은 [`CONTRIBUTING.md` 「값을 다루는 세 등급」](CONTRIBUTING.md) 참조.

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
npm run typecheck
npm run lint           # 경고도 실패다 (--max-warnings 0)
npm run format:check   # Prettier 검사 (고치려면 npm run format)
npm run test           # 감시 모드는 npm run test:watch
npm run sync:api       # 서버 API 계약 재반입 — docs/api/README.md (서버가 떠 있을 때만)
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

### `npm run sync:api` 가 실패

주소를 못 찾았거나 서버가 꺼져 있다. `.env` 의 `EXPO_PUBLIC_API_BASE_URL` 을 채우거나
직접 준다 — `MOMENTORY_API=http://127.0.0.1:8080 npm run sync:api`.
**받지 못해도 개발은 막히지 않는다** — `docs/api/openapi.json` 이 커밋돼 있다.

### 글자가 Pretendard 가 아닌 것 같다

`fontWeight` 로 굵기를 지정했을 가능성이 높다. **Android 는 `fontWeight` 로 OTF 굵기를 안 바꾼다.**

```tsx
{ fontFamily: "Pretendard-Bold" }                  // ○
{ fontFamily: "Pretendard", fontWeight: "700" }    // ✗
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

> ⚠ **출시용(release) 지문은 이것과 다르고, 아직 존재하지 않는다.**
> `android/app/build.gradle` 의 release 는 RN 템플릿 기본값 그대로 **debug 키를
> 가리키고**, 서명 키는 EAS 를 붙일 때 생긴다(`eas.json` 이 아직 없다). 그때
> `eas credentials` 로 릴리스 SHA-1 을 확인해 콘솔에 **따로 추가**한다.
> 카카오가 받는 것은 base64 라 hex 를 바꿔 넣는다:
>
> ```bash
> echo <콜론을 뺀 SHA-1 hex> | xxd -r -p | openssl base64
> ```
>
> **Play 앱 서명을 쓰면 하나 더다** — 구글이 앱을 자기 키로 다시 서명하므로
> Play Console 의 **앱 서명 인증서 SHA-1** 도 같은 방식으로 등록한다.
> 이걸 빼먹으면 개발 중엔 되던 로그인이 **스토어 설치본에서만** 실패한다.

### 등록 체크리스트

| 공급자     | 해야 할 것                                                                                           | 얻는 값                                                  | 비고                                                          |
| ---------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------- |
| **카카오** | 앱 등록 → 플랫폼에 패키지명 + 키 해시 → 카카오 로그인 ON → 동의항목 설정                             | 네이티브 앱 키 → `EXPO_PUBLIC_KAKAO_APP_KEY`             | 당일·무료                                                     |
| **구글**   | Cloud Console OAuth 클라이언트 — Android(패키지명 + SHA-1) · iOS(번들 ID) · **Web**                  | Web/iOS 클라이언트 ID → `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` | 당일·무료. `idToken` 검증에 **Web 클라이언트 ID 가 필요**하다 |
| **애플**   | Developer Program 가입 → **App ID 등록**(Explicit) → 그 App ID 에 Sign In with Apple 체크 → Key 발급 | `.p8` · Key ID · Team ID → **백엔드로**                  | **$99/년 · 심사 1~2일**. App ID 는 2026-08-24 등록            |

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
- **release 키 해시는 아직 없다** — EAS 를 붙인 뒤 추가한다(위 「지문」 절 ⚠).
  스토어 빌드 전에 반드시 닫아야 하는 항목이다.

### API 서버 — 지금은 평문 HTTP 다 (⚠ 개발 전용)

개발 서버에 아직 HTTPS 가 없다. Android 9+ 와 iOS ATS 는 평문을 기본으로 막으므로
[`plugins/withInsecureDevApi.ts`](../plugins/withInsecureDevApi.ts) 가 예외를 연다 —
**`EXPO_PUBLIC_API_BASE_URL` 이 `http://` 일 때만** 동작하고, `https://` 로 바뀌면
아무것도 하지 않는다. **HTTPS 전환은 `.env` 한 줄 + 재빌드가 전부다.**

- **Android** — 그 호스트 하나만 평문을 허용한다(`network_security_config.xml`).
  나머지 평문 요청은 계속 막힌다.
- **iOS** — ATS 의 예외 도메인은 **IP 주소를 받지 않는다**(Apple 제약). 그래서 주소가
  IP 인 동안은 `NSAllowsArbitraryLoads`(앱 전체) 말고 좁힐 방법이 없다. 서버에 도메인이
  붙으면 자동으로 좁은 예외로 내려간다.
- ⛔ **운영 배포에는 이 서버를 쓰지 않는다.** 스토어 빌드의 주소는 HTTPS 여야 하고,
  그러면 위 예외는 생성물에 아예 들어가지 않는다.
- 주소·앱 키를 바꾸면 네이티브 설정이 바뀐다 — `npm run android` 로 **다시 빌드**해야 한다.

> **서버 쪽 사실**(BE 저장소 대조 · 2026-08-21) — 컨테이너는 **8080 평문**으로 듣는다
> (`ecs-task-definition.json`). TLS 를 앞단(ALB 등)에서 끊는지는 BE 저장소에 안 보이므로
> **HTTPS 여부는 BE 에 물어야 안다.**
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

- **ESLint** · **Prettier** — 저장 시 포맷. `src/design/theme.ts` 는 `.prettierignore` 에 있으니 건드리지 않는다
- **Expo Tools**

```jsonc
// .vscode/settings.json (개인 설정 — 커밋하지 않는다)
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
}
```
