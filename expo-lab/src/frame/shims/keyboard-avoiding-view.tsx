/**
 * **앱 코드에만** 끼우는 `KeyboardAvoidingView` — react-native(0.86) 의 JS 구현
 * (`Libraries/Components/Keyboard/KeyboardAvoidingView.js`)을 그대로 옮긴 것이다.
 * 웹(react-native-web)의 것은 아무 일도 하지 않는다(키보드 이벤트를 듣지 않는다).
 *
 * 그대로인 것 — 앱 주석들이 기대는 네이티브의 성질이라 바꾸지 않는다:
 * - 키보드와의 겹침을 `onLayout` 의 **부모 기준** `y + height` 와 키보드 윗변(`screenY`)으로 잰다
 *   (`ChatScaffold` · `ScheduleEditBar` 머리말의 「직계 자식」 · 「바닥에 붙어야」 규칙).
 * - `keyboardVerticalOffset` 은 키보드 윗변을 그만큼 위로 본다.
 * - `padding` 은 넘긴 style **뒤에** `paddingBottom` 을 합성한다.
 * - `height` 는 처음 잰 높이에서 뺀다 · `position` 은 안쪽 상자의 `bottom` 을 올린다.
 * - iOS 는 Will 이벤트, 그 밖은 Did 이벤트를 듣는다 — 플랫폼은 프레임이 흉내 내는 것(`./platform`).
 *
 * 다른 것:
 * - `LayoutAnimation` 이 웹에 없어 회피 여백은 애니메이션 없이 한 번에 바뀐다
 *   (키보드 그림은 250ms 동안 올라온다).
 * - iOS 「크로스 페이드 전환 선호」 분기는 뺐다(프레임은 늘 꺼진 것으로 본다).
 * - 웹의 layout 이벤트에는 `persist` 가 없을 수 있어 있을 때만 부른다.
 */
import { Component, createRef, type ReactNode } from "react";
import {
  StyleSheet,
  View,
  type KeyboardAvoidingViewProps,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from "react-native";

import type { KeyboardMetrics, LabKeyboardEvent } from "../keyboard";

import Keyboard from "./keyboard";
import Platform from "./platform";

type State = { bottom: number };
type Subscription = { remove: () => void };

/**
 * 키보드와 겹친 높이 — RN `_relativeKeyboardHeight` 그대로(순수 함수 · 테스트가 부른다).
 * `bottom` 은 지금 걸린 회피 값(`height` 동작이 자기 높이를 줄인 만큼을 되돌려 잰다).
 */
export function relativeKeyboardHeight(
  behavior: KeyboardAvoidingViewProps["behavior"],
  frame: LayoutRectangle | null,
  keyboard: KeyboardMetrics | null | undefined,
  keyboardVerticalOffset = 0,
  bottom = 0,
): number {
  if (!frame || !keyboard) return 0;
  const keyboardY = keyboard.screenY - keyboardVerticalOffset;
  if (behavior === "height") return Math.max(bottom + frame.y + frame.height - keyboardY, 0);
  return Math.max(frame.y + frame.height - keyboardY, 0);
}

export default class KeyboardAvoidingView extends Component<KeyboardAvoidingViewProps, State> {
  override state: State = { bottom: 0 };
  viewRef = createRef<View>();
  private frame: LayoutRectangle | null = null;
  private keyboardEvent: LabKeyboardEvent | null = null;
  private subscriptions: Subscription[] = [];
  private initialFrameHeight = 0;
  private bottom = 0;

  private onKeyboardChange = (event: LabKeyboardEvent | null) => {
    this.keyboardEvent = event;
    this.updateBottomIfNecessary();
  };

  private onKeyboardHide = () => {
    this.keyboardEvent = null;
    this.updateBottomIfNecessary();
  };

  private onLayout = (event: LayoutChangeEvent) => {
    (event as { persist?: () => void }).persist?.();
    const oldFrame = this.frame;
    this.frame = event.nativeEvent.layout;
    // 키보드가 뜨기 전의 높이 — `height` 동작이 여기서 뺀다
    if (!this.initialFrameHeight) this.initialFrameHeight = this.frame.height;
    if (!oldFrame || oldFrame.height !== this.frame.height) this.updateBottomIfNecessary();
    this.props.onLayout?.(event);
  };

  private setBottom(value: number) {
    this.bottom = value;
    if (this.props.enabled ?? true) this.setState({ bottom: value });
  }

  private updateBottomIfNecessary() {
    if (this.keyboardEvent == null) {
      this.setBottom(0);
      return;
    }
    const height = relativeKeyboardHeight(
      this.props.behavior,
      this.frame,
      this.keyboardEvent.endCoordinates,
      this.props.keyboardVerticalOffset ?? 0,
      this.state.bottom,
    );
    if (this.bottom === height) return;
    this.setBottom(height);
  }

  override componentDidUpdate(_: KeyboardAvoidingViewProps, prevState: State): void {
    if ((this.props.enabled ?? true) && this.bottom !== prevState.bottom) {
      this.setState({ bottom: this.bottom });
    }
  }

  override componentDidMount(): void {
    if (!Keyboard.isVisible()) {
      this.keyboardEvent = null;
      this.setBottom(0);
    }
    this.subscriptions =
      Platform.OS === "ios"
        ? [
            Keyboard.addListener("keyboardWillHide", this.onKeyboardHide),
            Keyboard.addListener("keyboardWillShow", this.onKeyboardChange),
          ]
        : [
            Keyboard.addListener("keyboardDidHide", this.onKeyboardHide),
            Keyboard.addListener("keyboardDidShow", this.onKeyboardChange),
          ];
  }

  override componentWillUnmount(): void {
    this.subscriptions.forEach((subscription) => subscription.remove());
  }

  override render(): ReactNode {
    const {
      behavior,
      children,
      contentContainerStyle,
      enabled = true,
      keyboardVerticalOffset: _offset,
      style,
      onLayout: _onLayout,
      ...props
    } = this.props;
    const bottomHeight = enabled === true ? this.state.bottom : 0;
    switch (behavior) {
      case "height": {
        // 키보드가 있을 때만 높이를 바꾼다 — 그렇지 않으면 처음 높이로 돌아오지 못한다
        const heightStyle =
          this.frame != null && this.state.bottom > 0
            ? { height: this.initialFrameHeight - bottomHeight, flex: 0 }
            : undefined;
        return (
          <View
            ref={this.viewRef}
            style={StyleSheet.compose(style, heightStyle)}
            onLayout={this.onLayout}
            {...props}
          >
            {children}
          </View>
        );
      }
      case "position":
        return (
          <View ref={this.viewRef} style={style} onLayout={this.onLayout} {...props}>
            <View style={StyleSheet.compose(contentContainerStyle, { bottom: bottomHeight })}>
              {children}
            </View>
          </View>
        );
      case "padding":
        return (
          <View
            ref={this.viewRef}
            style={StyleSheet.compose(style, { paddingBottom: bottomHeight })}
            onLayout={this.onLayout}
            {...props}
          >
            {children}
          </View>
        );
      default:
        return (
          <View ref={this.viewRef} onLayout={this.onLayout} style={style} {...props}>
            {children}
          </View>
        );
    }
  }
}
