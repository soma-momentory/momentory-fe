import type { PreviewDevice } from "../devicePresets";
import { CurrentAppPreview } from "../components/CurrentAppPreview";
import { screenSourceLabel, type AppScreen } from "./currentAppScreens";

export function ScreenPreview({ screen, device }: { screen: AppScreen; device: PreviewDevice }) {
  return (
    <div className="single-preview">
      <header className="single-preview-head">
        <p className="atlas-route">{screen.route}</p>
        <h2>{screen.title}</h2>
        <span className={`atlas-badge ${screen.capture ? "capture" : ""}`}>
          {screenSourceLabel(screen)}
        </span>
        <p className="single-preview-description">
          {screen.fixture
            ? "실제 앱에 예시 데이터를 넣고 iPhone 13 mini 시뮬레이터에서 캡처했습니다. 실제 사용자 데이터는 아닙니다."
            : screen.capture?.startsWith("app-captures/")
              ? "실제 앱을 iPhone 13 mini 시뮬레이터에서 캡처했습니다. 다른 모델 선택 시 이미지를 해당 화면 크기에 맞춰 표시합니다."
              : screen.capture
                ? "제공된 실제 앱 원본 캡처를 표시합니다."
                : "현재 앱 코드와 자산을 바탕으로 재현한 정적 화면입니다. 실제 앱 동작이나 데이터는 연결되지 않습니다."}
        </p>
      </header>
      <div className="single-preview-stage">
        <CurrentAppPreview screen={screen} device={device} scale={1} />
      </div>
      <div className="single-preview-footer">
        <span>
          {device.label} · {device.width} × {device.height}pt
        </span>
        <a href="#atlas">전체 화면으로 돌아가기</a>
      </div>
    </div>
  );
}
