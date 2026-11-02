/**
 * 프레임이 가짜 서버에 보낸 요청 기록(`lab:request`) — 최신이 위. 디자인 작업에는 드물게 쓰므로
 * 탭이 아니라 조작 패널 맨 아래의 접힌 묶음 「서버 요청 기록 (개발용)」 안에 있다(`ControlsPanel`).
 */
import { frameBus, useFrameBus } from "./frameBus";
import { shellColor } from "./theme";

const pad = (n: number) => String(n).padStart(2, "0");
const time = (at: number) => {
  const d = new Date(at);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

/** 실패(4xx · 5xx)한 요청 수 — 접힌 머리에 빨간 숫자로만 알린다 */
export const failedRequestCount = () =>
  frameBus.requests.filter((entry) => entry.status >= 400).length;

export function RequestLog() {
  useFrameBus();
  const entries = frameBus.requests;
  return (
    <div data-testid="request-log" style={{ padding: 12, fontSize: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ color: shellColor.muted }}>요청 {entries.length}개</span>
        <button
          type="button"
          title="이 목록만 지워요 — 쓴 기록(테스트 데이터)은 그대로예요"
          onClick={() => frameBus.clearRequests()}
        >
          기록 지우기
        </button>
      </div>
      {entries.length === 0 ? (
        <p style={{ color: shellColor.muted }}>
          아직 요청이 없어요 — 화면이 가짜 서버에 데이터를 요청하면 여기에 쌓여요.
        </p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} style={{ borderTop: `1px solid ${shellColor.border}` }}>
                <td style={{ padding: "3px 4px", color: shellColor.faint }}>{time(entry.at)}</td>
                <td style={{ padding: "3px 4px" }}>{entry.frameId}</td>
                <td style={{ padding: "3px 4px", fontWeight: 600 }}>{entry.method}</td>
                <td style={{ padding: "3px 4px", wordBreak: "break-all" }}>{entry.path}</td>
                <td
                  style={{
                    padding: "3px 4px",
                    color: entry.status >= 400 ? shellColor.danger : shellColor.accent,
                    fontWeight: 700,
                  }}
                >
                  {entry.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
