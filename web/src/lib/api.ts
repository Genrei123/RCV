// ...existing code...

export const api = {
  async post(path: string, body: any, opts: RequestInit = {}) {
    const base = process.env.NEXT_PUBLIC_API_BASE || "";
    const res = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(opts.headers || {}),
      },
      body: JSON.stringify(body),
      ...opts,
    });

    return res;
  },

  // optional convenience for GET
  async get(path: string, opts: RequestInit = {}) {
    const base = process.env.NEXT_PUBLIC_API_BASE || "";
    return fetch(`${base}${path}`, {
      method: "GET",
      headers: {
        ...(opts.headers || {}),
      },
      ...opts,
    });
  },

  // new helper: postJson — sends JSON and returns parsed JSON or throws an object with status + payload
  async postJson(path: string, body: any, opts: RequestInit = {}) {
    const res = await this.post(path, body, opts);

    // safe parse: handle empty bodies gracefully
    const text = await res.text().catch(() => "");
    const payload = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;

    if (!res.ok) {
      // throw an error-like object so callers can surface payload.errors / payload.message
      throw { status: res.status, payload };
    }

    return payload;
  },

  // ...existing code...
};