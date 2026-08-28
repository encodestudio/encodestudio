import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import { products } from "../lib/content.js";
import learnLogo from "../assets/encode-learn-logo.png";

const learn = products.find((p) => p.slug === "encode-learn");

export default function ProductLearn() {
  return (
    <div>
      {/* HERO — BLUE */}
      <section className="bg-encode-blue py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <div className="mb-8 inline-block rounded-2xl bg-white px-6 py-4">
              <img src={learnLogo} alt="Encode Learn" className="h-8 w-auto md:h-10" />
            </div>
          </Reveal>
          <Reveal delay={0.02}>
            <SectionLabel>Encode Learn</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="max-w-3xl text-display-lg font-display font-bold text-black text-balance">
              {learn.positioning}
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/70">
              {learn.description}
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <Link to="/contact" className="mt-9 inline-flex items-center gap-2 rounded-full bg-black px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white hover:text-black">
              Talk to Us <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <div className="flex items-end justify-between">
            <div>
              <Reveal>
                <SectionLabel>Capabilities</SectionLabel>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="max-w-xl text-display-sm font-display font-bold text-balance">
                  A modern digital learning environment.
                </h2>
              </Reveal>
            </div>
          </div>
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-xl text-sm text-encode-grey">
              Capabilities below reflect the Encode Learn product roadmap and are being rolled
              out progressively.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {learn.capabilities.map((c, i) => (
              <Reveal key={c} delay={i * 0.04} className="flex items-center justify-between rounded-2xl border border-encode-border bg-white p-5">
                <span className="text-sm font-semibold">{c}</span>
                <span className="rounded-full bg-encode-blueTint px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-encode-blueDark">
                  Planned
                </span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-black py-20">
        <div className="container-page flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <h3 className="max-w-lg text-2xl font-display font-bold text-white text-balance">
            Want to bring structured, engaging learning to your organisation?
          </h3>
          <Link to="/contact" className="btn-primary-inverse shrink-0">
            Start a Conversation <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
