const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api";

export async function submitContactForm(payload) {
  const res = await fetch(`${API_BASE}/contact/`, {
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
