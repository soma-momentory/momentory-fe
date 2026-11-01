// @ts-check
/**
 * 「이 PC 의 Lab 화면에서 온 요청인가」 — 에이전트 API 는 저장소 파일을 고치고 git 을 돌리므로
 * 네 겹으로 막는다.
 *
 * 1. 소켓 상대 주소가 루프백이다 — 같은 와이파이의 다른 기기는 못 부른다(`expo start` 는 0.0.0.0 에 연다).
 * 2. `Host` 가 localhost · 127.0.0.1 · [::1] 이고 포트가 이 서버 포트다 — DNS 리바인딩
 *    (남의 도메인이 127.0.0.1 로 풀리게 해서 브라우저가 이 서버를 부르게 하는 것)을 막는다.
 * 3. `Origin`(없으면 `Referer`)이 같은 로컬 주소 · 같은 포트다 — 다른 사이트의 페이지가 보낸 요청을 막는다.
 *    둘 다 없으면 막는다(브라우저 밖의 도구라도 `Referer` 하나는 붙여야 한다).
 * 4. GET 이 아니면 `X-Momentory-Lab: 1` 헤더가 있어야 한다 — 남의 사이트가 폼으로 보내는
 *    「단순 요청」은 이 헤더를 못 붙이고, 붙이려면 CORS 사전 요청을 통과해야 하는데 여기서는 허락하지 않는다.
 */

const LOOPBACK = new Set(["127.0.0.1", "::1", "::ffff:127.0.0.1"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** @param {string | undefined} address */
const isLoopback = (address) => address != null && LOOPBACK.has(address);

/**
 * `host[:port]` 가 로컬이고 포트가 같은가.
 * @param {string} hostPort
 * @param {number} port
 */
function isLocalHostPort(hostPort, port) {
  let url;
  try {
    url = new URL(`http://${hostPort}`);
  } catch {
    return false;
  }
  const actualPort = url.port === "" ? 80 : Number(url.port);
  return LOCAL_HOSTS.has(url.hostname) && actualPort === port;
}

/**
 * `http://localhost:8085/...` 꼴의 출처가 로컬 · 같은 포트인가.
 * @param {string} value
 * @param {number} port
 */
function isLocalOrigin(value, port) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "http:") return false;
  return isLocalHostPort(url.host, port);
}

/**
 * @typedef {{ method?: string; headers: Record<string, string | string[] | undefined>;
 *   socket: { remoteAddress?: string; localPort?: number } }} GuardRequest
 */

/**
 * @param {GuardRequest} req
 * @returns {{ ok: true } | { ok: false; status: number; message: string }}
 */
function checkLocalRequest(req) {
  const deny = (/** @type {string} */ message) => ({
    ok: /** @type {const} */ (false),
    status: 403,
    message,
  });
  if (!isLoopback(req.socket.remoteAddress)) return deny("이 PC 에서 연 Lab 에서만 쓸 수 있어요");
  const port = req.socket.localPort;
  if (port == null) return deny("서버 포트를 알 수 없어요");

  const header = (/** @type {string} */ name) => {
    const value = req.headers[name];
    return Array.isArray(value) ? value[0] : value;
  };

  const host = header("host");
  if (!host || !isLocalHostPort(host, port))
    return deny("localhost 주소로 연 Lab 에서만 쓸 수 있어요");

  const origin = header("origin");
  const referer = header("referer");
  if (origin && origin !== "null") {
    if (!isLocalOrigin(origin, port)) return deny("다른 사이트에서 온 요청이라 막았어요");
  } else if (referer) {
    if (!isLocalOrigin(referer, port)) return deny("다른 사이트에서 온 요청이라 막았어요");
  } else {
    return deny("어디서 온 요청인지 알 수 없어서 막았어요");
  }

  const method = (req.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD" && header("x-momentory-lab") !== "1") {
    return deny("Lab 화면에서 보낸 요청이 아니라 막았어요");
  }
  return { ok: true };
}

module.exports = { checkLocalRequest, isLoopback, isLocalOrigin, isLocalHostPort };
