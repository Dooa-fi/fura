// lib/client.ts: used by pages in the browser to call our own API routes.
// Sends/receives JSON and turns an error reply into a normal JavaScript error with a readable message.
export async function api<T = any>(path: string, body?: unknown, method?: string): Promise<T> {
  const res = await fetch(path, {
    method: method || (body === undefined ? "GET" : "POST"),
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}
