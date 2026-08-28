import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import { interestOptions } from "../lib/content.js";
import { submitContactForm } from "../lib/api.js";

const initialState = {
  name: "",
  company: "",
  email: "",
  phone: "",
  interest: interestOptions[0],
  project_description: "",
  timeline: "",
  message: "",
};

export default function Contact() {
  const [form, setForm] = useState(initialState);
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus("submitting");
    setError("");
    try {
      await submitContactForm(form);
      setStatus("success");
      setForm(initialState);
    } catch (err) {
      setStatus("error");
      setError(err.message || "Something went wrong. Please try again.");
    }
  };

  return (
    <div>
      <section className="grid-bg py-24 md:py-28">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Contact Us</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="max-w-2xl text-display-lg font-display font-bold text-balance">
              Have an Idea? <span className="text-encode-blue">Let's Build It.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-lg text-encode-grey">
              Whether you're starting something new, transforming an existing operation, or
              looking for a technology partner, we'd love to hear what you're working on.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container-page">
          <div className="mx-auto max-w-2xl rounded-3xl border border-encode-border bg-white p-8 md:p-12">
            {status === "success" ? (
              <Reveal className="flex flex-col items-center py-12 text-center">
                <CheckCircle2 size={40} className="text-encode-blue" />
                <h2 className="mt-5 text-2xl font-display font-bold">Message sent.</h2>
                <p className="mt-2 max-w-sm text-encode-grey">
                  Thanks for reaching out — we'll get back to you shortly to start the
                  conversation.
                </p>
                <button
                  onClick={() => setStatus("idle")}
                  className="btn-secondary mt-8"
                >
                  Send Another Message
                </button>
              </Reveal>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 sm:grid-cols-2">
                  <Field label="Name" required>
                    <input
                      required
                      value={form.name}
                      onChange={update("name")}
                      className="input"
                      placeholder="Your full name"
                    />
                  </Field>
                  <Field label="Company">
                    <input
                      value={form.company}
                      onChange={update("company")}
                      className="input"
                      placeholder="Company name"
                    />
                  </Field>
                  <Field label="Email" required>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={update("email")}
                      className="input"
                      placeholder="you@company.com"
                    />
                  </Field>
                  <Field label="Phone">
                    <input
                      value={form.phone}
                      onChange={update("phone")}
                      className="input"
                      placeholder="+1 (555) 000-0000"
                    />
                  </Field>
                </div>

                <Field label="I'm interested in">
                  <select value={form.interest} onChange={update("interest")} className="input">
                    {interestOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="What are you looking to build?">
                  <input
                    value={form.project_description}
                    onChange={update("project_description")}
                    className="input"
                    placeholder="A short description of your project"
                  />
                </Field>

                <Field label="Approximate timeline">
                  <input
                    value={form.timeline}
                    onChange={update("timeline")}
                    className="input"
                    placeholder="e.g. 2-3 months, flexible, ASAP"
                  />
                </Field>

                <Field label="Message" required>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={update("message")}
                    className="input resize-none"
                    placeholder="Tell us more about what you're working on..."
                  />
                </Field>

                {status === "error" && (
                  <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>
                )}

                <button type="submit" disabled={status === "submitting"} className="btn-primary w-full justify-center sm:w-auto disabled:opacity-60">
                  {status === "submitting" ? "Sending..." : "Start the Conversation"}
                  {status !== "submitting" && <ArrowRight size={16} />}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-black/80">
        {label} {required && <span className="text-encode-blue">*</span>}
      </span>
      {children}
    </label>
  );
}
