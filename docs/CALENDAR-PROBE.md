# 캘린더 측정 — 무엇을 재고, 무엇이 아직 비어 있나

기기 캘린더에서 **무엇을 가져올지 정하려면 값을 재봐야 한다.** 이 문서는 그
측정의 **절차·항목·결과**를 한 곳에 둔다. 규칙의 정본이 아니다 — 정해진 규칙은
`src/lib/calendar.ts` 와 [`DISCUSSION.md`](DISCUSSION.md) §1-4 로 간다.

## 왜 재는가 — 타입은 값을 말해주지 않는다

`expo-calendar` 의 타입 정의는 **필드가 있다**까지만 말한다. 그 필드가 실제로
무엇을 담는지, 계정 종류마다 채워지긴 하는지는 **말하지 않는다.** 이미 한 번
어긋난 것을 봤다:

```
타입    instanceId?: string
실기기  instanceId: 1626        ← 숫자다
```

그래서 `allowsModifications` 가 `boolean` 이라는 사실만으로 「공휴일 달력을
갈라낸다」고 가정할 수 없다. **재야 안다.**

## 무엇을 정하려고 재는가

> **홈에 「광복절」이 뜨면 안 된다.** 2026-08-11 Android 실측에서 1년치 80건 중
> **46건(58%)이 공휴일 달력**이었다. 개인 일정은 29건뿐이다.

가르는 축은 **일정이 아니라 달력**이다. 「종일인가」로는 안 갈린다 — 「광복절」도
종일이고 「내 휴가」도 종일이라, 종일을 빼면 사용자가 적어둔 일정이 함께 사라진다.

찾는 것: **「내가 만든 일정이 아닌 달력」을 가려내는 신호.**

## 값과 무관하게 이미 정해진 뼈대

측정 결과가 어떻게 나오든 아래는 바뀌지 않는다. 먼저 못박아 두는 이유는, 값이
애매할 때 그때그때 정하면 플랫폼마다 다른 규칙이 생기기 때문이다.

1. **블랙리스트다. 화이트리스트가 아니다** — 「이건 구독/생일 달력이다」가 확실할
   때만 뺀다. 「이건 개인 달력이다」를 증명하려 들면, 신호가 비는 플랫폼에서
   **사용자 일정이 통째로 사라진다.**
2. **애매하면 포함한다** — 틀렸을 때 잃는 것이 작은 쪽으로 실패시킨다. 잘못 넣으면
   줄이 하나 더 보일 뿐이고, 잘못 빼면 사용자가 적어둔 일정이 없어진다.
3. **신호 하나를 믿지 않는다** — 여러 신호의 OR 로 판정한다. 플랫폼·계정마다
   채워지는 필드가 다르다.
4. **판정은 `src/lib/calendar.ts` 안에서만** — 화면·store 는 플랫폼을 모른다.
5. **자동은 최종형이 아니다** — 아무리 잘 맞아도 누군가에겐 틀린다(업무 달력을
   구독으로 쓰는 사람). `M1` 연결 관리에서 달력을 끄고 켜는 것이 최종 안전망이고,
   시안에 없어 상류 확인이 필요하다.

## 재는 항목

### ① 달력(`getCalendars(EntityTypes.EVENT)`)

**이게 이번 측정의 본론이다.** 달력마다 아래를 찍고, **개인 달력과 구독/생일
달력 사이에서 값이 갈리는지**를 본다.

| 필드                    | 왜 보나                             | Android        | iOS |
| ----------------------- | ----------------------------------- | -------------- | --- |
| `title`                 | 어느 달력인지 사람이 알아보려고     | ✅ 측정        | ⬜  |
| `allowsModifications`   | **1순위 후보** — 구독이면 `false`?  | ⬜             | ⬜  |
| `type`                  | `subscription`·`birthday` 로 오는가 | ⬜             | ⬜  |
| `accessLevel`           | `OWNER` vs `READ`                   | ⬜             | —   |
| `isSynced`              | 이미 거르는 데 쓰고 있다            | ✅ 전부 `true` | —   |
| `ownerAccount`·`source` | 계정 종류로 갈리는가                | ⬜             | ⬜  |
| `isVisible`             | 사용자가 캘린더 앱에서 끈 달력      | ⬜             | —   |

### ② 일정(`listEvents`)

달력 축이 통하면 여기서 더 볼 것은 많지 않다. 확인용으로만 찍는다.

| 필드         | 왜 보나                                     | 상태                                |
| ------------ | ------------------------------------------- | ----------------------------------- |
| `id`         | 반복 일정 회차가 공유하는가                 | ✅ Android 확인 — 공유한다          |
| `instanceId` | 쓰지 않기로 한 근거 확인                    | ✅ Android — 회차마다 다름·숫자     |
| `startDate`  | 04:00 경계로 접히는가 · 종일이 UTC 자정인가 | ✅ Android 확인                     |
| `allDay`     | 공휴일·생일이 전부 `true` 인가              | ✅ Android — 그렇다(축으로는 못 씀) |
| `calendarId` | 어느 달력에서 왔는지 이어 보려고            | ✅ Android 확인                     |

## 지금까지의 결과

### Android — 2026-08-11 · Galaxy `SM-S937N` · 무선 디버깅

**달력 13개**가 한 목록으로 왔다. 계정 종류가 섞여 있어 비교 조건이 좋다:

```
로컬     My calendar (29건 · 개인 일정 대부분)
삼성     Samsung Calendar
구글     abc95132@gmail.com · aa01095254087@gmail.com ·
         a01095254087@gmail.com · hyeond876@gmail.com
구독     공휴일(18건) · 대한민국의 휴일(28건) · 절기와 세시풍속 · 법정기념일
생일     연락처에 저장된 중요한 날 · 가족
기타     사물인터넷 프로그래밍
```

확인된 것:

- ✅ **삼성·구글·로컬을 따로 부르지 않는다** — `CalendarProvider` 한 곳에서 전부 온다
- ✅ 권한 · 조회 · 04:00 경계 · 반복 일정 `id` 공유 전부 정상
- ⛔ **공휴일 58%** · **달력 사이 중복 15쌍**(공휴일 달력 둘을 함께 구독)
- ⬜ **①의 분류 신호는 아직 안 찍었다** — 이번에 `id`·`title`·`isSynced` 만 봤다

### iOS — 미측정

기기가 없어 아직이다. **다를 것으로 보는 곳:**

- `accessLevel`·`isSynced`·`isVisible` 이 **없다**(Android 전용) → 그만큼 신호가 준다
- `type` 은 iOS 가 더 명확할 가능성 (`subscription`·`birthday` 가 EventKit 개념)
- iCloud·구글·Exchange 가 전부 `EKCalendar` 로 오므로 **계정 종류는 여기서도 섞인다**
- 한국 공휴일이 iOS 기본 달력에 어떻게 들어오는지(구독인지 내장인지) 확인 필요

뼈대 2번(「애매하면 포함」)이 이 공백을 받아 준다 — iOS 에서 신호가 비면 그 달력은
그냥 보인다.

## 어떻게 재는가

측정은 **임시 프로브**로 한다. `src/lib/__calprobe.ts` 를 만들어 `app/index.tsx` 의
`useEffect` 에서 한 줄로 부르고, **확인이 끝나면 둘 다 지운다**(커밋하지 않는다).

```bash
# 1. 무선 디버깅 (Android · 폰 개발자 옵션에서 켠다)
adb pair <IP>:<페어링포트> <6자리>      # 처음 한 번만
adb connect <IP>:<연결포트>

# 2. 네이티브 모듈이라 dev client 재빌드가 필요하다
npx expo prebuild --platform android    # android/local.properties 가 지워지면 SDK 경로를 다시 넣는다
cd android && ./gradlew assembleDebug   # ~9분
adb install -r app/build/outputs/apk/debug/app-debug.apk

# 3. Metro 를 띄우고 앱을 그쪽으로 연다
npx expo start --dev-client --port 8081
adb reverse tcp:8081 tcp:8081
adb shell am start -a android.intent.action.VIEW \
  -d "momentory://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081" com.momentory.app

# 4. 로그
adb logcat -d -s ReactNativeJS:* | grep CALPROBE
```

프로브가 찍을 것(다음 회차):

```ts
const calendars = await getCalendars(EntityTypes.EVENT);
console.log(
  "[CALPROBE]",
  JSON.stringify(
    calendars.map((c) => ({
      id: c.id,
      title: c.title,
      allowsModifications: c.allowsModifications,
      type: (c as Record<string, unknown>).type,
      accessLevel: (c as Record<string, unknown>).accessLevel,
      isSynced: c.isSynced,
      isVisible: (c as Record<string, unknown>).isVisible,
      ownerAccount: (c as Record<string, unknown>).ownerAccount,
      source: (c as Record<string, unknown>).source,
    })),
  ),
);
```

> ⚠ 타입에 없는 필드가 있을 수 있으니 **`Record<string, unknown>` 으로 뚫어서 찍는다.**
> 타입이 값을 말해주지 않는다는 것이 이 문서의 전제다.

## 판정 기준 — 어떤 결과면 무엇을 하나

| 측정 결과                                      | 그러면                                                         |
| ---------------------------------------------- | -------------------------------------------------------------- |
| 어떤 신호 하나가 개인/구독을 **깨끗이 가른다** | 그 신호로 필터를 만든다. 코드 몇 줄                            |
| 여러 신호가 **부분적으로** 가른다              | OR 로 묶는다(뼈대 3). 못 걸러지는 달력은 남는다                |
| **아무것도 안 갈린다**                         | 자동 필터를 포기하고 **사용자 선택**으로 간다 → 상류 확인 필요 |

어느 경우든 **뼈대 1·2·4 는 그대로**다.

## 남은 것

- ⬜ Android — ①의 분류 신호 측정
- ⬜ iOS — 기기 확보 후 같은 프로브
- ⬜ 결과에 따라 필터 구현 + `09.md` 와 어긋나는 부분이 생기면
  [`PRODUCT.md` 「상류와 차이」](PRODUCT.md)에 기록
- ⬜ `M1` 연결 관리의 달력 선택 화면 — 상류 확인
- ⬜ `WRITE_CALENDAR` 권한 제거 — 읽기만 하는데 플러그인이 매니페스트에 넣는다.
  `09.md` 가 "캘린더 원본은 수정하지 않아요"라고 약속하므로 **약속과 매니페스트가
  다르다**
