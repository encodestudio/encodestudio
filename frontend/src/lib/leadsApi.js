// Same-origin Node API by default (Vite proxies /api to it in dev).
const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

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
      Object.entries(data)
        .map(([field, msgs]) => `${field.replace(/_/g, " ")}: ${[msgs].flat().join(" ")}`)
        .join(" · ") ||
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

/** JSON request helper: throws an Error with a readable message on failure. */
async function request(path, { method = "GET", body } = {}) {
  const res = await authFetch(path, { method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  if (!res.ok) throw new Error(await parseError(res));
  return res.status === 204 ? null : res.json();
}

const qs = (params = {}) => {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v !== "" && v != null && v !== false)),
  ).toString();
  return query ? `?${query}` : "";
};

// ---- Auth
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

export const fetchMe = () => request("/auth/me/");

// ---- Leads
export const fetchLeads = (params) => request(`/leads/${qs(params)}`);
export const fetchLead = (id) => request(`/leads/${id}/`);
export const createLead = (data) => request("/leads/", { method: "POST", body: data });
export const updateLead = (id, patch) => request(`/leads/${id}/`, { method: "PATCH", body: patch });
export const deleteLead = (id) => request(`/leads/${id}/`, { method: "DELETE" });
export const fetchLeadStats = () => request("/leads/stats/");
export const fetchInterests = () => request("/leads/interests/");
export const fetchTags = () => request("/leads/tags/");
export const fetchBoard = (params) => request(`/leads/board/${qs(params)}`);
export const bulkUpdateLeads = (ids, action, value) => request("/leads/bulk/", { method: "POST", body: { ids, action, value } });
export const resendLeadEmails = (id) => request(`/leads/${id}/resend_emails/`, { method: "POST" });
export const fetchRelatedLeads = (id) => request(`/leads/${id}/related/`);
export const fetchActivities = (id) => request(`/leads/${id}/activities/`);
export const addActivity = (id, type, body) => request(`/leads/${id}/activities/`, { method: "POST", body: { type, body } });
export const deleteActivity = (leadId, activityId) =>
  request(`/leads/${leadId}/activities/${activityId}/`, { method: "DELETE" });

/** Downloads the CSV export for the current filters. */
export async function exportLeadsCsv(params) {
  const res = await authFetch(`/leads/export.csv${qs(params)}`);
  if (!res.ok) throw new Error(await parseError(res));
  const blob = await res.blob();
  const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") || "")?.[1] || "leads.csv";
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---- Tasks
export const fetchTasks = (params) => request(`/tasks/${qs(params)}`);
export const fetchTaskSummary = () => request("/tasks/summary/");
export const createTask = (data) => request("/tasks/", { method: "POST", body: data });
export const updateTask = (id, patch) => request(`/tasks/${id}/`, { method: "PATCH", body: patch });
export const deleteTask = (id) => request(`/tasks/${id}/`, { method: "DELETE" });

// ---- Team
export const fetchUsers = () => request("/users/");
export const createUser = (data) => request("/users/", { method: "POST", body: data });
export const updateUser = (id, patch) => request(`/users/${id}/`, { method: "PATCH", body: patch });

// ---- Analytics
export const fetchAnalytics = (params) => request(`/analytics/${qs(params)}`);
