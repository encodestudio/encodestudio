import { Link } from "react-router-dom";
import { ArrowRight, Building2, Users, Workflow, Database, ShieldCheck, LineChart } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import Seo from "../components/Seo.jsx";
import { products } from "../lib/content.js";
import { schemaGraph, breadcrumbList, organizationRef } from "../lib/seo.js";
import campusLogo from "../assets/encode-campus-logo.png";

const campus = products.find((p) => p.slug === "encode-campus");

const sections = [
  { number: "01", name: "Institution", desc: "Manage the institution as a structured digital organisation.", icon: Building2 },
  { number: "02", name: "People", desc: "Students, faculty, staff, administrators and other institutional stakeholders.", icon: Users },
  { number: "03", name: "Operations", desc: "Digitise everyday institutional workflows.", icon: Workflow },
  { number: "04", name: "Data", desc: "Create a unified education data foundation.", icon: Database },
  { number: "05", name: "Governance", desc: "Give administrators visibility and control.", icon: ShieldCheck },
  { number: "06", name: "Intelligence", desc: "Dashboards, alerts, analytics and actionable insights.", icon: LineChart },
];

const architecture = ["Encode Studio Platform", "Education Core", "Institution", "Modules", "Users / Data / Workflows / Governance"];

export default function ProductCampus() {
  const schema = schemaGraph([
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products" },
      { name: "Encode Campus", path: "/products/encode-campus" },
    ]),
    {
      "@type": "SoftwareApplication",
      name: "Encode Campus",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: "https://encodestudio.in/products/encode-campus",
      description: campus.description,
      publisher: organizationRef(),
    },
  ]);

  return (
    <div>
      <Seo
        title="Encode Campus — Education Operating & Governance Platform"
        description={campus.description}
        path="/products/encode-campus"
        schema={schema}
      />
      {/* HERO — BLACK */}
      <section className="bg-black py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <div className="mb-8 inline-block rounded-2xl bg-white px-6 py-4">
              <img src={campusLogo} alt="Encode Campus" className="h-8 w-auto md:h-10" />
            </div>
          </Reveal>
          <Reveal delay={0.02}>
            <SectionLabel dark>Encode Campus</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="max-w-3xl text-display-lg font-display font-bold text-white text-balance">
              The Operating System <span className="text-encode-blue">for Modern Education.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/60">
              A unified platform for institutions to manage their operations, people, data and
              governance.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-4 max-w-xl border-l-2 border-encode-blue pl-4 text-sm font-semibold text-white/80">
              {campus.positioning}
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <Link to="/contact" className="btn-primary-inverse mt-9">
              Explore Encode Campus <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* 01-06 SECTIONS */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Architecture</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display font-display font-bold text-balance">
              Six pillars. One institutional operating layer.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {sections.map((s, i) => (
              <Reveal key={s.number} delay={i * 0.06} className="card-surface p-7 hover:border-encode-blue">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-encode-blueTint text-encode-blue">
                    <s.icon size={18} />
                  </div>
                  <span className="text-sm font-bold text-encode-blue">{s.number}</span>
                </div>
                <h3 className="mt-5 text-lg font-display font-bold">{s.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-encode-grey">{s.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ARCHITECTURE DIAGRAM — BLACK */}
      <section className="bg-black py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel dark>System Architecture</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display-sm font-display font-bold text-white text-balance">
              Communicating sophistication without overwhelming the visitor.
            </h2>
          </Reveal>

          <div className="mx-auto mt-14 flex max-w-md flex-col items-center">
            {architecture.map((layer, i) => (
              <Reveal key={layer} delay={i * 0.08} className="w-full">
                <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-6 py-4 text-center text-sm font-semibold text-white">
                  {layer}
                </div>
                {i < architecture.length - 1 && (
                  <div className="mx-auto my-2 h-6 w-px bg-encode-blue/40" />
                )}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* SCALE STORY */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Growth Path</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display-sm font-display font-bold text-balance">
              Phase 1 is school-focused. The architecture is built to extend further.
            </h2>
          </Reveal>

          <div className="mt-12 flex flex-wrap items-center gap-4">
            {campus.scaleStory.map((stage, i) => (
              <Reveal key={stage} delay={i * 0.08} className="flex items-center gap-4">
                <div className="rounded-full border border-encode-border bg-white px-6 py-3 text-sm font-semibold">
                  {stage}
                </div>
                {i < campus.scaleStory.length - 1 && <ArrowRight size={16} className="text-encode-blue" />}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-encode-soft py-20">
        <div className="container-page flex flex-col items-start justify-between gap-8 rounded-3xl bg-white p-10 md:flex-row md:items-center md:p-14">
          <div>
            <h3 className="text-2xl font-display font-bold text-balance">
              Ready to bring Encode Campus to your institution?
            </h3>
            <p className="mt-2 text-encode-grey">Let's talk about your operations, data and governance needs.</p>
          </div>
          <Link to="/contact" className="btn-primary shrink-0">
            Start a Project <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
