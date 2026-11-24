/* Calls the QueuSC API. Failed requests throw an Error with the server's message and status. */

let onUnauthorized = () => {};
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn; };

export async function api(path, { method = "GET", body, signal } = {}) {
  let res;
  try {
    res = await fetch(`./api${path}`, {
      method,
      signal,
      credentials: "same-origin",
      headers: body === undefined ? {} : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body)
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw Object.assign(new Error("Can't reach QueuSC. Check your connection and try again."), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && path !== "/login") onUnauthorized();
    throw Object.assign(new Error(data.error || "Something went wrong. Try again."), { status: res.status });
  }
  return data;
}
