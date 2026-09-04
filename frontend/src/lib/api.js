// The contact form posts to a standalone Cloudflare Worker (see /worker).
// Override per environment with VITE_CONTACT_ENDPOINT.
const CONTACT_ENDPOINT =
  import.meta.env.VITE_CONTACT_ENDPOINT || "http://localhost:8787";

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
