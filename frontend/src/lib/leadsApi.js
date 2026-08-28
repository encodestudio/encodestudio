const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

const ACCESS_KEY = "encode_leads_access";
const REFRESH_KEY = "encode_leads_refresh";

export function getTokens() {
  return {
    access: localStorage.getItem(ACCESS_KEY),
    refresh: localStorage.getItem(REFRESH_KEY),
  };
}

function setTokens({ access, refresh }) {
  if (access) localStorage.setItem(ACCESS_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function isLoggedIn() {
  return Boolean(getTokens().access);
}

async function parseError(res) {
  let detail = `Request failed (${res.status})`;
  try {
    const data = await res.json();
    detail =
      data.detail ||
      (Array.isArray(data.non_field_errors) && data.non_field_errors.join(" ")) ||
      Object.values(data).flat().join(" ") ||
      detail;
  } catch {
    // ignore parse errors, keep default detail
  }
  return detail;
}

/** Fetch wrapper that attaches the JWT, and retries once via refresh on a 401. */
async function authFetch(path, options = {}, retry = true) {
  const { access } = getTokens();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(access ? { Authorization: `Bearer ${access}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return authFetch(path, options, false);
    clearTokens();
  }

  return res;
}

async function tryRefresh() {
  const { refresh } = getTokens();
  if (!refresh) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens({ access: data.access, refresh: data.refresh });
    return true;
  } catch {
    return false;
  }
}

export async function login(username, password) {
  const res = await fetch(`${API_BASE}/auth/login/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  const data = await res.json();
  setTokens({ access: data.access, refresh: data.refresh });
  return data.user;
}

export function logout() {
  clearTokens();
}

export async function fetchMe() {
  const res = await authFetch("/auth/me/");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchLeads(params = {}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null))
  ).toString();
  const res = await authFetch(`/leads/${query ? `?${query}` : ""}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchLeadStats() {
  const res = await authFetch("/leads/stats/");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function fetchInterests() {
  const res = await authFetch("/leads/interests/");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateLead(id, patch) {
  const res = await authFetch(`/leads/${id}/`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function resendLeadEmails(id) {
  const res = await authFetch(`/leads/${id}/resend_emails/`, { method: "POST" });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteLead(id) {
  const res = await authFetch(`/leads/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error(await parseError(res));
}
