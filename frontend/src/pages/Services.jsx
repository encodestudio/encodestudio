import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import { serviceGroups } from "../lib/content.js";

export default function Services() {
  const [activeId, setActiveId] = useState(serviceGroups[0].id);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && serviceGroups.some((s) => s.id === hash)) {
      setActiveId(hash);
    }
  }, []);

  const active = serviceGroups.find((s) => s.id === activeId);

  return (
    <div>
      <section className="grid-bg py-24 md:py-28">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Services</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="max-w-2xl text-display-lg font-display font-bold text-balance">
              From Idea <span className="text-encode-blue">to Impact.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-lg text-encode-grey">
              We help organisations design, build, launch and continuously evolve digital
              products.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container-page">
          <div className="grid gap-3 lg:grid-cols-[380px,1fr]">
            <div className="flex flex-col gap-2">
              {serviceGroups.map((s) => (
                <button
                  key={s.id}
                  id={s.id}
                  onClick={() => setActiveId(s.id)}
                  className={`flex scroll-mt-24 items-center gap-4 rounded-2xl border px-6 py-5 text-left transition-colors ${
                    activeId === s.id
                      ? "border-black bg-black text-white"
                      : "border-encode-border bg-white hover:border-encode-blue"
                  }`}
                >
                  <span className={`text-sm font-bold ${activeId === s.id ? "text-encode-blue" : "text-encode-blue"}`}>
                    {s.number}
                  </span>
                  <span className="text-sm font-semibold">{s.name}</span>
                </button>
              ))}
            </div>

            <Reveal key={active.id} className="card-surface p-8 md:p-12">
              <span className="label">{active.number}</span>
              <h2 className="mt-4 text-2xl font-display font-bold md:text-3xl text-balance">{active.name}</h2>
              <p className="mt-3 max-w-lg text-encode-grey">{active.tagline}</p>

              <div className="mt-8 flex flex-wrap gap-2.5">
                {active.services.map((svc) => (
                  <span
                    key={svc}
                    className="rounded-full border border-encode-border bg-encode-soft px-4 py-2 text-xs font-medium text-black/80"
                  >
                    {svc}
                  </span>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="bg-black py-20">
        <div className="container-page flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <h3 className="max-w-lg text-2xl font-display font-bold text-white text-balance">
            Have a project in mind? Let's scope it together.
          </h3>
          <Link to="/contact" className="btn-primary-inverse shrink-0">
            Start a Project <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
