// The contact form posts to the Node API, which is served from the same origin
// as the site (Vite proxies /api to it in dev). Override with
// VITE_CONTACT_ENDPOINT only if the API lives on a different domain.
const CONTACT_ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || "/api/contact/";

export async function submitContactForm(payload) {
  const res = await fetch(CONTACT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let detail = "Something went wrong. Please try again.";
    try {
      const data = await res.json();
      detail = Object.values(data).flat().join(" ") || detail;
    } catch {
      // ignore parse errors
    }
    throw new Error(detail);
  }

  return res.json();
}
