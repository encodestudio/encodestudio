// First-touch marketing attribution for the contact form: which campaign,
// referring site and landing page brought the visitor in. Kept for the
// browser session only; nothing leaves the browser unless they submit the form.
const KEY = "encode_attribution";

function read() {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

/** Call once on page load. Records the first page of the visit. */
export function captureAttribution() {
  if (read()) return;
  const params = new URLSearchParams(window.location.search);
  let referrer = "";
  try {
    const ref = document.referrer && new URL(document.referrer);
    if (ref && ref.host !== window.location.host) referrer = ref.origin + ref.pathname;
  } catch {
    // ignore malformed referrers
  }
  const data = {
    utm_source: params.get("utm_source") || "",
    utm_medium: params.get("utm_medium") || "",
    utm_campaign: params.get("utm_campaign") || "",
    referrer,
    landing_page: window.location.pathname,
  };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // storage blocked — attribution is best-effort
  }
}

export function getAttribution() {
  return read() || {};
}
