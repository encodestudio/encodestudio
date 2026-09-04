import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, CheckCircle2 } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import Seo from "../components/Seo.jsx";
import { products } from "../lib/content.js";
import { schemaGraph, breadcrumbList, organizationRef } from "../lib/seo.js";
import verifyLogo from "../assets/encode-verify-logo.png";

const verify = products.find((p) => p.slug === "encode-verify");

export default function ProductVerify() {
  const schema = schemaGraph([
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products" },
      { name: "Encode Verify", path: "/products/encode-verify" },
    ]),
    {
      "@type": "SoftwareApplication",
      name: "Encode Verify",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://encodestudio.in/products/encode-verify",
      description: verify.description,
      publisher: organizationRef(),
    },
  ]);

  return (
    <div>
      <Seo
        title="Encode Verify — Verification & Trust Platform"
        description={verify.description}
        path="/products/encode-verify"
        schema={schema}
      />
      {/* HERO — NEAR BLACK, SECURITY-ORIENTED */}
      <section className="bg-encode-near py-24 md:py-32">
        <div className="container-page grid gap-14 lg:grid-cols-2 lg:items-center">
          <div>
            <Reveal>
              <div className="mb-8 inline-block rounded-2xl bg-white px-6 py-4">
                <img src={verifyLogo} alt="Encode Verify" className="h-8 w-auto md:h-10" />
              </div>
            </Reveal>
            <Reveal delay={0.02}>
              <SectionLabel dark>Encode Verify</SectionLabel>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-display-lg font-display font-bold text-white text-balance">
                {verify.positioning}
              </h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-lg leading-relaxed text-white/60">
                {verify.description}
              </p>
            </Reveal>
            <Reveal delay={0.25}>
              <Link to="/contact" className="btn-primary-inverse mt-9">
                Talk to Us <ArrowRight size={16} />
              </Link>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="rounded-2xl border border-white/10 bg-black p-6 font-mono text-xs text-white/70">
              <div className="flex items-center gap-2 border-b border-white/10 pb-3">
                <ShieldCheck size={14} className="text-encode-blue" />
                <span className="text-white/90">verification_request.log</span>
              </div>
              <div className="mt-3 space-y-2">
                {[
                  "record.hash  ::  4f9a2e...c31b",
                  "status       ::  VERIFIED",
                  "issuer       ::  trusted_source",
                  "audit_trail  ::  3 events logged",
                  "confidence   ::  99.2%",
                ].map((line) => (
                  <div key={line} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className="text-encode-blue" />
                    {line}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Capability Areas</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display-sm font-display font-bold text-balance">
              Confidence in every record.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-4 max-w-xl text-sm text-encode-grey">
              Capabilities below reflect the Encode Verify product roadmap and are labelled live
              only where they actually exist.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {verify.capabilities.map((c, i) => (
              <Reveal
                key={c}
                delay={i * 0.04}
                className="flex items-center justify-between rounded-2xl border border-encode-border bg-white p-5"
              >
                <span className="text-sm font-semibold">{c}</span>
                <span className="rounded-full bg-encode-near px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-encode-blue">
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
            Need to establish trust in your data, documents or credentials?
          </h3>
          <Link to="/contact" className="btn-primary-inverse shrink-0">
            Start a Conversation <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
