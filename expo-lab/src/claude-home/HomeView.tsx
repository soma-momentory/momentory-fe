import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path, Polygon, Rect } from "react-native-svg";

import { claudeHomeColor as c, claudeHomeFont as font } from "./tokens";

export type ClaudeWeather = "sunny" | "cloudy" | "rainy" | "snowy" | "thunder" | "windy";
export type ClaudeHomeTask = { id: string; title: string; time: string; done: boolean };
export type ClaudeHomeModel = {
  date: string;
  weekday: string;
  tasks: ClaudeHomeTask[];
  weather: ClaudeWeather;
  showWeekDock: boolean;
  unreadNotifications: boolean;
};
export type ClaudeHomeActions = {
  onToggleTask: (id: string) => void;
  onAddTask: () => void;
  onCycleWeather: () => void;
  onStartReflection: () => void;
  onOpenNotifications: () => void;
  onSelectTab: (tab: string) => void;
};

const babaLayers = [
  require("../../assets/claude-home/baba/base-tail.webp"),
  require("../../assets/claude-home/baba/base-body.webp"),
  require("../../assets/claude-home/baba/base-feet.webp"),
  require("../../assets/claude-home/baba/base-arms.webp"),
  require("../../assets/claude-home/baba/base-muzzle.webp"),
  require("../../assets/claude-home/baba/base-mouth.webp"),
  require("../../assets/claude-home/baba/base-cheeks.webp"),
  require("../../assets/claude-home/baba/base-eyes.webp"),
  require("../../assets/claude-home/baba/base-ears.webp"),
];

const weatherImages = {
  sunny: require("../../assets/claude-home/weather/sunny.png"),
  cloudy: require("../../assets/claude-home/weather/cloudy.png"),
  rainy: require("../../assets/claude-home/weather/rainy.png"),
  snowy: require("../../assets/claude-home/weather/snowy.png"),
  thunder: require("../../assets/claude-home/weather/thunder.png"),
  windy: require("../../assets/claude-home/weather/windy.png"),
} as const;

const weatherLabels: Record<ClaudeWeather, string> = {
  sunny: "맑음",
  cloudy: "흐림",
  rainy: "비",
  snowy: "눈",
  thunder: "천둥",
  windy: "바람",
};

const tabs = [
  { label: "홈", path: "M3.5 11 12 4l8.5 7M6 9.5V20h12V9.5M10 20v-5h4v5" },
  {
    label: "쉼터",
    path: "M12 20s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.6 4 4 0 0 1 19.5 10C19.5 15.4 12 20 12 20Z",
  },
  { label: "보관함", path: "M4 5h16v14H4zM4 15l4.5-4 4 3.5 3-2.5L20 15" },
  { label: "리포트", path: "M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" },
  { label: "마이", path: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 21a7.5 7.5 0 0 1 15 0" },
] as const;

function PaperGrid({ phaseY }: { phaseY: number }) {
  const [size, setSize] = useState({ width: 402, height: 874 });
  return (
    <View
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        if (width !== size.width || height !== size.height) setSize({ width, height });
      }}
    >
      <Svg width={size.width} height={size.height}>
        {Array.from({ length: Math.ceil(size.width / 22) + 1 }, (_, index) => (
          <Line
            key={`v${index}`}
            x1={index * 22}
            y1={0}
            x2={index * 22}
            y2={size.height}
            stroke={c.grid}
            strokeWidth={1}
          />
        ))}
        {Array.from({ length: Math.ceil(size.height / 22) + 1 }, (_, index) => (
          <Line
            key={`h${index}`}
            x1={0}
            y1={phaseY + index * 22}
            x2={size.width}
            y2={phaseY + index * 22}
            stroke={c.grid}
            strokeWidth={1}
          />
        ))}
      </Svg>
    </View>
  );
}

function DateHeader({
  model,
  onOpenNotifications,
}: Pick<ClaudeHomeActions, "onOpenNotifications"> & { model: ClaudeHomeModel }) {
  return (
    <View style={styles.header}>
      <View style={styles.dateWrap}>
        <View style={styles.datePaper}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 220 65"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}
          >
            <Polygon
              points="4,7 18,0 65,4 120,0 176,3 216,0 220,30 215,65 154,61 88,65 26,62 0,65 5,31"
              fill={c.date}
            />
          </Svg>
          <Text style={styles.dateText}>{model.date}</Text>
        </View>
        <View style={styles.weekdayPaper}>
          <Svg
            width="100%"
            height="100%"
            viewBox="0 0 90 34"
            preserveAspectRatio="none"
            style={StyleSheet.absoluteFill}
          >
            <Polygon points="0,4 7,0 84,2 90,0 88,18 90,34 5,32 0,34 2,17" fill={c.weekday} />
          </Svg>
          <Text style={styles.weekdayText}>{model.weekday}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="알림"
        onPress={onOpenNotifications}
        style={styles.bellButton}
      >
        <Svg
          width={24}
          height={26}
          viewBox="0 0 18 20"
          fill="none"
          stroke={c.ink}
          strokeWidth={1.6}
          strokeLinecap="round"
        >
          <Path d="M3 14V9a6 6 0 0 1 12 0v5l1.5 2h-15L3 14z" />
          <Path d="M7 18.5a2 2 0 0 0 4 0" />
        </Svg>
        {model.unreadNotifications ? <View style={styles.alertDot} /> : null}
      </Pressable>
    </View>
  );
}

function Baba() {
  return (
    <View pointerEvents="none" style={styles.baba}>
      {babaLayers.map((source, index) => (
        <Image key={index} source={source} resizeMode="contain" style={styles.babaLayer} />
      ))}
    </View>
  );
}

function HeroCard({
  weather,
  onCycleWeather,
  onStartReflection,
}: Pick<ClaudeHomeModel, "weather"> &
  Pick<ClaudeHomeActions, "onCycleWeather" | "onStartReflection">) {
  return (
    <View style={styles.hero}>
      <View pointerEvents="none" style={styles.greenTape}>
        <Svg width="100%" height="100%">
          <Rect width={92} height={24} fill="rgba(255,255,255,.5)" />
          {Array.from({ length: 8 }, (_, index) => (
            <Rect
              key={`column-${index}`}
              x={index * 12}
              width={6}
              height={24}
              fill="rgba(150,175,135,.45)"
            />
          ))}
          {[0, 12].map((y) => (
            <Rect key={`row-${y}`} y={y} width={92} height={6} fill="rgba(150,175,135,.45)" />
          ))}
        </Svg>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`날씨: ${weatherLabels[weather]}. 누르면 다음 날씨`}
        onPress={onCycleWeather}
        style={styles.weatherSticker}
      >
        <Image source={weatherImages[weather]} resizeMode="cover" style={styles.weatherImage} />
        <View pointerEvents="none" style={styles.weatherTape} />
      </Pressable>
      <View style={styles.speechBubble}>
        <Text style={styles.speechText}>오늘 하루는{"\n"}어땠어요?</Text>
        <View style={styles.speechTail} />
      </View>
      <Text style={styles.heroNote}>밤 9:30엔 제가{"\n"}먼저 말 걸어요</Text>
      <View pointerEvents="none" style={styles.heroShadow} />
      <Baba />
      <Pressable
        accessibilityRole="button"
        onPress={onStartReflection}
        style={styles.reflectButton}
      >
        <Text style={styles.reflectText}>하루 돌아보기 ›</Text>
      </Pressable>
    </View>
  );
}

function TaskSection({
  tasks,
  onToggleTask,
  onAddTask,
  docked,
}: Pick<ClaudeHomeModel, "tasks"> &
  Pick<ClaudeHomeActions, "onToggleTask" | "onAddTask"> & { docked: boolean }) {
  const remaining = tasks.filter((task) => !task.done).length;
  const taskRows = tasks.map((task, index) => (
    <Pressable
      key={task.id}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: task.done }}
      onPress={() => onToggleTask(task.id)}
      style={[styles.taskRow, index > 0 && styles.taskDivider]}
    >
      <View style={[styles.taskCheck, task.done && styles.taskCheckDone]}>
        {task.done ? <Text style={styles.checkMark}>✓</Text> : null}
      </View>
      <Text numberOfLines={1} style={[styles.taskText, task.done && styles.taskTextDone]}>
        {task.title}
      </Text>
    </Pressable>
  ));
  return (
    <View style={[styles.taskSection, docked && styles.dockedTaskSection]}>
      <View style={styles.taskHeader}>
        <View style={styles.taskHeadingGroup}>
          <Text style={styles.taskHeading}>오늘 일정</Text>
          <Text style={styles.taskCount}>{tasks.length === 0 ? "0개" : `${remaining}개 남음`}</Text>
        </View>
        <Pressable accessibilityRole="button" onPress={onAddTask} style={styles.addSticker}>
          <Text style={styles.addText}>+ 추가</Text>
        </Pressable>
      </View>
      {tasks.length === 0 ? (
        <View style={styles.emptyTasks}>
          <Text style={styles.emptyTitle}>오늘은 일정이 없어요</Text>
          <Text style={styles.emptyBody}>여유로운 하루예요. 하고 싶은 일 하나 적어둘까요?</Text>
        </View>
      ) : docked ? (
        <ScrollView
          style={[styles.taskList, styles.dockedTaskList]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled
        >
          {taskRows}
        </ScrollView>
      ) : (
        <View style={styles.taskList}>{taskRows}</View>
      )}
    </View>
  );
}

function WeekDock() {
  const days = ["일", "월", "화", "수", "목", "금", "토"];
  return (
    <View style={styles.weekDock}>
      <Text style={styles.weekTitle}>이번 주{"\n"}감정</Text>
      <View style={styles.weekDays}>
        {days.map((day, index) => (
          <View key={day} style={styles.weekDay}>
            <View style={[styles.moodPebble, { backgroundColor: c.mood[index] }]} />
            <Text style={[styles.dayName, index === 3 && styles.todayName]}>{day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function PaperTabBar({ onSelectTab }: Pick<ClaudeHomeActions, "onSelectTab">) {
  return (
    <View style={styles.tabOuter}>
      <View style={styles.tabPill}>
        {tabs.map((tab, index) => (
          <Pressable
            key={tab.label}
            accessibilityRole="button"
            accessibilityState={{ selected: index === 0 }}
            onPress={() => onSelectTab(tab.label)}
            style={styles.tabItem}
          >
            {index === 0 ? <View style={styles.tabSelected} /> : null}
            <Svg
              width={24}
              height={24}
              viewBox="0 0 24 24"
              fill="none"
              stroke={c.ink}
              strokeWidth={1.7}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={styles.tabIcon}
            >
              <Path d={tab.path} />
            </Svg>
            <Text style={styles.tabLabel}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** Presentation-only RN view; the app and Lab provide different models/actions. */
export function ClaudeHomeView({
  model,
  actions,
  gridPhaseY = 0,
}: {
  model: ClaudeHomeModel;
  actions: ClaudeHomeActions;
  gridPhaseY?: number;
}) {
  const content = (
    <>
      <DateHeader model={model} onOpenNotifications={actions.onOpenNotifications} />
      <HeroCard
        weather={model.weather}
        onCycleWeather={actions.onCycleWeather}
        onStartReflection={actions.onStartReflection}
      />
      <TaskSection
        tasks={model.tasks}
        onToggleTask={actions.onToggleTask}
        onAddTask={actions.onAddTask}
        docked={model.showWeekDock}
      />
    </>
  );
  return (
    <View style={styles.screen}>
      <PaperGrid phaseY={gridPhaseY} />
      {model.showWeekDock ? (
        <View style={styles.fixedContent}>{content}</View>
      ) : (
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {content}
        </ScrollView>
      )}
      {model.showWeekDock ? <WeekDock /> : null}
      <PaperTabBar onSelectTab={actions.onSelectTab} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.paper, overflow: "hidden" },
  content: { flex: 1 },
  contentInner: { paddingTop: 4, paddingBottom: 116 },
  fixedContent: { flex: 1, paddingTop: 4, paddingBottom: 188, overflow: "hidden" },
  header: {
    height: 44,
    paddingHorizontal: 20,
    paddingLeft: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  dateWrap: { width: 220, height: 72 },
  datePaper: {
    width: 180,
    height: 44,
    transform: [{ rotate: "-3deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  dateText: { color: c.ink, fontFamily: font.bold, fontSize: 36, lineHeight: 42, marginTop: -5 },
  weekdayPaper: {
    position: "absolute",
    left: 16,
    top: 36,
    width: 65,
    height: 27,
    transform: [{ rotate: "-1deg" }],
    alignItems: "center",
    justifyContent: "center",
  },
  weekdayText: { color: c.ink, fontFamily: font.bold, fontSize: 18, lineHeight: 24 },
  bellButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  alertDot: {
    position: "absolute",
    top: 7,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.alert,
  },
  hero: {
    height: 270,
    marginTop: 34,
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: c.card,
    shadowColor: c.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  greenTape: {
    position: "absolute",
    left: 140,
    top: -12,
    width: 92,
    height: 24,
    transform: [{ rotate: "-2deg" }],
  },
  weatherSticker: {
    position: "absolute",
    right: -6,
    top: -16,
    width: 96,
    height: 106,
    padding: 7,
    paddingBottom: 18,
    backgroundColor: c.white,
    transform: [{ rotate: "7deg" }],
    shadowColor: c.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
    zIndex: 3,
  },
  weatherImage: { width: "100%", height: "100%", backgroundColor: c.card },
  weatherTape: {
    position: "absolute",
    left: 26,
    top: -8,
    width: 44,
    height: 16,
    backgroundColor: c.weatherTape,
    opacity: 0.85,
    transform: [{ rotate: "-4deg" }],
  },
  speechBubble: {
    position: "absolute",
    left: 18,
    top: 24,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 22,
    backgroundColor: c.white,
    transform: [{ rotate: "-2deg" }],
    zIndex: 2,
    shadowColor: c.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  speechText: { color: c.ink, fontFamily: font.bold, fontSize: 25, lineHeight: 29 },
  speechTail: {
    position: "absolute",
    right: 28,
    bottom: -8,
    width: 16,
    height: 16,
    backgroundColor: c.white,
    transform: [{ rotate: "45deg" }],
  },
  heroNote: {
    position: "absolute",
    left: 26,
    top: 128,
    color: c.muted,
    fontFamily: font.regular,
    fontSize: 18,
    lineHeight: 23,
    transform: [{ rotate: "-4deg" }],
  },
  heroShadow: {
    position: "absolute",
    right: 12,
    bottom: 12,
    width: 170,
    height: 40,
    borderRadius: 24,
    backgroundColor: "rgba(169,190,140,.7)",
    transform: [{ rotate: "-3deg" }],
  },
  baba: { position: "absolute", right: 16, bottom: -24, width: 170, height: 227, zIndex: 1 },
  babaLayer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    width: 170,
    height: 227,
  },
  reflectButton: {
    position: "absolute",
    left: 18,
    bottom: 20,
    height: 50,
    paddingHorizontal: 20,
    borderTopLeftRadius: 34,
    borderTopRightRadius: 28,
    borderBottomRightRadius: 36,
    borderBottomLeftRadius: 26,
    backgroundColor: c.green,
    justifyContent: "center",
    zIndex: 2,
    borderWidth: 3,
    borderColor: c.paper,
  },
  reflectText: { color: c.white, fontFamily: font.bold, fontSize: 20, lineHeight: 25 },
  taskSection: { paddingHorizontal: 20, paddingTop: 30 },
  dockedTaskSection: { flex: 1, minHeight: 0 },
  taskHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  taskHeadingGroup: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  taskHeading: { color: c.ink, fontFamily: font.bold, fontSize: 22, lineHeight: 28 },
  taskCount: { color: c.muted, fontFamily: font.regular, fontSize: 17, lineHeight: 24 },
  addSticker: {
    backgroundColor: c.card,
    paddingHorizontal: 12,
    paddingVertical: 2,
    transform: [{ rotate: "-3deg" }],
    shadowColor: c.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  addText: { color: c.ink, fontFamily: font.bold, fontSize: 18, lineHeight: 24 },
  emptyTasks: {
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.emptyBorder,
    paddingHorizontal: 20,
    paddingTop: 26,
    paddingBottom: 24,
    alignItems: "center",
    gap: 6,
  },
  emptyTitle: {
    color: c.ink,
    fontFamily: font.bold,
    fontSize: 22,
    lineHeight: 25,
    textAlign: "center",
  },
  emptyBody: {
    color: c.muted,
    fontFamily: font.regular,
    fontSize: 18,
    lineHeight: 20,
    textAlign: "center",
  },
  taskList: { marginTop: 10, borderRadius: 14, backgroundColor: c.card, paddingHorizontal: 14 },
  dockedTaskList: { flexGrow: 0, flexShrink: 1, minHeight: 0 },
  taskRow: { height: 48, flexDirection: "row", alignItems: "center", gap: 12 },
  taskDivider: { borderTopWidth: 1, borderTopColor: c.separator },
  taskCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.75,
    borderColor: c.taskBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  taskCheckDone: { backgroundColor: c.green },
  checkMark: { color: c.white, fontSize: 13, fontWeight: "700" },
  taskText: { flex: 1, color: c.ink, fontFamily: font.bold, fontSize: 19, lineHeight: 25 },
  taskTextDone: { color: c.taskDone, textDecorationLine: "line-through" },
  weekDock: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 104,
    height: 72,
    borderRadius: 24,
    backgroundColor: "rgba(251,248,241,.92)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 16,
    paddingRight: 14,
    shadowColor: c.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  weekTitle: {
    color: c.ink,
    fontFamily: font.bold,
    fontSize: 17,
    lineHeight: 19,
    textAlign: "center",
  },
  weekDays: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  weekDay: { flex: 1, alignItems: "center", gap: 3 },
  moodPebble: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderTopLeftRadius: 13,
    borderBottomRightRadius: 13,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,.25)",
  },
  dayName: {
    color: c.ink,
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 16,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  todayName: { backgroundColor: c.today },
  tabOuter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 96,
    paddingHorizontal: 16,
    paddingBottom: 25,
    justifyContent: "flex-end",
  },
  tabPill: {
    height: 66,
    borderRadius: 40,
    backgroundColor: "rgba(251,248,241,.92)",
    flexDirection: "row",
    paddingHorizontal: 6,
    alignItems: "center",
    shadowColor: c.shadow,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  tabItem: { flex: 1, height: 54, alignItems: "center", justifyContent: "center", gap: 2 },
  tabSelected: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 2,
    right: 2,
    borderRadius: 32,
    backgroundColor: c.greenSoft,
  },
  tabIcon: { position: "relative" },
  tabLabel: {
    position: "relative",
    color: c.ink,
    fontFamily: font.bold,
    fontSize: 14,
    lineHeight: 15,
  },
});
