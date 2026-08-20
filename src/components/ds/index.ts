/**
 * Momentory DS — 공용 컴포넌트 (3세대 · `PLAN.md` A Phase 3).
 *
 * 스펙 정본은 `design-reference/design.md` §6~11, 값은 `src/design/ds/`.
 *
 * ## 옛 컴포넌트에 변형을 더하지 않는다
 *
 * 2세대는 `Card` 에 `paperSoft`·`paperOpaque`·`paperHome` 을 얹는 식으로 옮겼고
 * 그 결과 한 컴포넌트가 두 디자인을 들었다(`Card` 변형 5종 · `ScreenBackground` 6종).
 * 3세대는 **여기에 새로 만들고** 화면이 하나씩 import 를 갈아탄다. 참조 0 이 된
 * 옛 컴포넌트는 지운다 — 그래야 두 체계가 한 파일에서 만나지 않는다.
 *
 * ## 아직 없는 것
 *
 * Slider(척도) · 채팅 입력 — 쓰는 화면을 만들 때 함께 만든다.
 * 미리 만들어 두면 실제로 필요한 모양과 어긋난 채 굳는다.
 *
 * `ListCell`·`SectionHeader`·`Menu`·`Toast` 는 홈·일정에서 만들었고
 * **보관함·마이가 재사용한다**(`ListCell` 은 설정 목록, `Menu` 는 일기 상세의 ⋮).
 *
 * `Calendar`·`SearchField`·`ViewSwitcher`·`EmotionDot`·`TabScreen` 은 보관함·리포트에서
 * 만들었다 — `Calendar` 는 쉼터(R2)가, `EmotionDot`·`TabScreen` 은 나머지 탭이 재사용한다.
 *
 * `ChatBubble`·`WheelPicker` 는 온보딩에서 만들었고 **일기(대화)와 마이(알림 설정)가
 * 재사용한다** — 시안에선 두 파일에 각각 인라인이었다(`EXPORT_MANIFEST` §4).
 */
export { Text } from "./Text";
export { Screen } from "./Screen";
export { GridBackground } from "./GridBackground";
export { Button, type ButtonSize, type ButtonVariant } from "./Button";
export { IconButton } from "./IconButton";
export { SocialButton, type SocialProvider } from "./SocialButton";
export { Card, InfoBlock } from "./Card";
export { ListCell, type ListCellProps } from "./ListCell";
export { SectionHeader } from "./SectionHeader";
export { Menu, type MenuAction } from "./Menu";
export { Toast } from "./Toast";
export { TextField } from "./TextField";
export { SearchField } from "./SearchField";
export { Chip } from "./Chip";
export { Calendar, type CalendarMark } from "./Calendar";
export { EmotionDot } from "./EmotionDot";
export { ViewSwitcher, type ViewOption } from "./ViewSwitcher";
export { ChatBubble } from "./ChatBubble";
export { WheelPicker, type WheelColumn } from "./WheelPicker";
export { TopNavigation } from "./TopNavigation";
export { BottomNavigation, type TabItem } from "./BottomNavigation";
export { TabScreen, type TabName } from "./TabScreen";
export { BottomSheet } from "./BottomSheet";
export { Modal } from "./Modal";
export { Icon, type IconName } from "./icons/Icon";
export { GoogleMark } from "./icons/GoogleMark";
