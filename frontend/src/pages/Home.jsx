import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import EcosystemGraphic from "../components/EcosystemGraphic.jsx";
import EMotif from "../components/EMotif.jsx";
import Reveal from "../components/Reveal.jsx";
import Seo from "../components/Seo.jsx";
import { products, serviceGroups, process, differentiators } from "../lib/content.js";
import { schemaGraph, organizationRef, absoluteUrl } from "../lib/seo.js";
import campusLogo from "../assets/encode-campus-logo.png";
import learnLogo from "../assets/encode-learn-logo.png";
import verifyLogo from "../assets/encode-verify-logo.png";

const logoMap = {
  "encode-campus": campusLogo,
  "encode-learn": learnLogo,
  "encode-verify": verifyLogo,
};

const themeStyles = {
  black: { bg: "bg-black", text: "text-white", sub: "text-white/60", accent: "text-encode-blue" },
  blue: { bg: "bg-encode-blue", text: "text-black", sub: "text-black/60", accent: "text-black" },
  "black-blue": { bg: "bg-black", text: "text-white", sub: "text-white/60", accent: "text-encode-blue" },
};

export default function Home() {
  const schema = schemaGraph([
    {
      "@type": "WebPage",
      "@id": `${absoluteUrl("/")}#webpage`,
      url: absoluteUrl("/"),
      name: "Encode Studio — Web & Software Development Studio in Delhi NCR, India",
      isPartOf: { "@id": "https://encodestudio.in/#website" },
      about: organizationRef(),
      description:
        "Encode Studio is a technology and product studio in Delhi NCR, India, building web applications, custom software, mobile apps and AI-powered digital products.",
    },
  ]);

  return (
    <div>
      <Seo path="/" schema={schema} />

      {/* HERO */}
      <section className="relative overflow-hidden grid-bg">
        <div className="container-page grid gap-16 pb-24 pt-20 lg:grid-cols-2 lg:items-center lg:pt-28">
          <div>
            <Reveal>
              <SectionLabel>Encode Studio</SectionLabel>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-display-lg font-display font-bold text-balance">
                We Build{" "}
                <span className="text-encode-blue">Digital Products</span>{" "}
                That Matter.
              </h1>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-lg text-lg leading-relaxed text-encode-grey">
                Encode Studio is a technology and product studio in Delhi NCR, India. We design and
                build scalable web applications, custom software and AI-powered digital products for
                businesses and institutions — and partner with organisations across India to turn
                ideas into production-ready technology.
              </p>
            </Reveal>
            <Reveal delay={0.25}>
              <div className="mt-9 flex flex-wrap gap-4">
                <Link to="/contact" className="btn-primary">
                  Start a Project <ArrowRight size={16} />
                </Link>
                <Link to="/products" className="btn-secondary">
                  Explore Products
                </Link>
              </div>
            </Reveal>
            <EMotif className="mt-14" />
          </div>

          <Reveal delay={0.2} y={30}>
            <div className="relative rounded-3xl border border-encode-border bg-white/70 p-8 backdrop-blur-sm">
              <EcosystemGraphic />
            </div>
          </Reveal>
        </div>
      </section>

      {/* STATEMENT BAND */}
      <section className="bg-black py-24">
        <div className="container-page text-center">
          <Reveal>
            <p className="text-display-sm font-display font-semibold text-white text-balance">
              From complex ideas <span className="text-encode-blue">to useful products.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Our Products</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-2xl text-display font-display font-bold text-balance">
              Products We've Built. Problems We're Solving.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 lg:grid-cols-3">
            {products.map((p, i) => {
              const t = themeStyles[p.theme];
              return (
                <Reveal key={p.slug} delay={i * 0.1}>
                  <Link
                    to={`/products/${p.slug}`}
                    className={`group flex h-full flex-col justify-between rounded-3xl p-8 transition-transform duration-300 hover:-translate-y-1 ${t.bg}`}
                  >
                    <div>
                      <div className="inline-block rounded-lg bg-white px-3 py-2.5">
                        <img src={logoMap[p.slug]} alt={p.name} className="h-5 w-auto" />
                      </div>
                      <div className={`label mt-4 ${t.sub}`}>{p.short}</div>
                      <h3 className={`mt-4 text-2xl font-display font-bold ${t.text}`}>{p.name}</h3>
                      <p className={`mt-3 text-sm leading-relaxed ${t.sub}`}>{p.tagline}</p>
                    </div>
                    <div className={`mt-10 flex items-center gap-2 text-sm font-semibold ${t.text}`}>
                      Explore
                      <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>

          <Reveal delay={0.3}>
            <p className="mt-10 max-w-2xl text-encode-grey">
              Together, Encode Studio's products create a connected digital ecosystem for
              institutions, learners and trusted information.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ENCODE CAMPUS FEATURE — BLACK SECTION */}
      <section className="bg-black py-24 md:py-32">
        <div className="container-page">
          <div className="grid gap-14 lg:grid-cols-2 lg:items-center">
            <div>
              <Reveal>
                <SectionLabel dark>Encode Campus</SectionLabel>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="text-display font-display font-bold text-white text-balance">
                  The Operating System <span className="text-encode-blue">for Modern Education.</span>
                </h2>
              </Reveal>
              <Reveal delay={0.15}>
                <p className="mt-6 max-w-lg text-white/60 leading-relaxed">
                  One platform. One institutional data foundation. One operating layer for
                  education — spanning institution management, academic operations, governance
                  and intelligence.
                </p>
              </Reveal>
              <Reveal delay={0.25}>
                <Link to="/products/encode-campus" className="btn-primary-inverse mt-9">
                  Explore Encode Campus <ArrowRight size={16} />
                </Link>
              </Reveal>
            </div>

            <Reveal delay={0.2}>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8">
                <div className="flex flex-col gap-3">
                  {["Institution", "People", "Operations", "Data", "Governance", "Intelligence"].map(
                    (step, i) => (
                      <div
                        key={step}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black px-5 py-4"
                      >
                        <span className="text-sm font-medium text-white">
                          <span className="mr-3 text-encode-blue">0{i + 1}</span>
                          {step}
                        </span>
                        <div className="h-1.5 w-1.5 rounded-full bg-encode-blue" />
                      </div>
                    )
                  )}
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* SERVICES BENTO PREVIEW */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <Reveal>
                <SectionLabel>What We Build for Clients</SectionLabel>
              </Reveal>
              <Reveal delay={0.05}>
                <h2 className="max-w-xl text-display font-display font-bold text-balance">
                  Your Idea. Our Expertise.
                </h2>
              </Reveal>
            </div>
            <Reveal delay={0.1}>
              <Link to="/services" className="btn-secondary shrink-0">
                View All Services <ArrowRight size={16} />
              </Link>
            </Reveal>
          </div>

          <div className="mt-14 grid grid-cols-2 gap-4 md:grid-cols-4">
            {serviceGroups.map((s, i) => {
              const variants = ["bg-white border border-encode-border", "bg-encode-blueTint", "bg-black text-white"];
              const variant = variants[i % 3];
              const isDark = variant.includes("bg-black");
              return (
                <Reveal key={s.id} delay={i * 0.05}>
                  <Link
                    to={`/services#${s.id}`}
                    className={`group flex h-44 flex-col justify-between rounded-2xl p-6 transition-transform duration-300 hover:-translate-y-1 ${variant}`}
                  >
                    <span className={`text-sm font-bold ${isDark ? "text-encode-blue" : "text-encode-blue"}`}>
                      {s.number}
                    </span>
                    <span className={`text-sm font-semibold leading-snug ${isDark ? "text-white" : "text-black"}`}>
                      {s.name}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* APPROACH */}
      <section className="bg-encode-soft py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Our Approach</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display font-display font-bold text-balance">
              Discover → Design → Build → Launch → Evolve
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-px overflow-hidden rounded-3xl border border-encode-border bg-encode-border sm:grid-cols-2 lg:grid-cols-3">
            {process.map((step, i) => (
              <Reveal key={step.number} delay={i * 0.05} className="bg-white p-8">
                <span className="text-sm font-bold text-encode-blue">{step.number}</span>
                <h3 className="mt-3 text-lg font-display font-bold">{step.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-encode-grey">{step.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHY ENCODE STUDIO */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Why Encode Studio</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display font-display font-bold text-balance">
              Not another agency claiming "quality and innovation."
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {differentiators.map((d, i) => (
              <Reveal key={d.name} delay={i * 0.06} className="card-surface p-7 hover:border-encode-blue hover:shadow-lg hover:shadow-encode-blue/5">
                <h3 className="text-base font-display font-bold">{d.name}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-encode-grey">{d.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FOUNDER TEASER */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <div className="grid items-center gap-10 rounded-3xl border border-encode-border bg-encode-soft p-10 md:grid-cols-[auto,1fr,auto] md:p-14">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-black text-2xl font-display font-bold text-encode-blue">
                E
              </div>
              <div>
                <div className="label">Meet the Founder</div>
                <h3 className="mt-3 text-2xl font-display font-bold text-balance">
                  The person behind Encode Studio — and the vision for Encode Campus.
                </h3>
              </div>
              <Link to="/founder" className="btn-primary shrink-0">
                Read the Story <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="bg-black py-28">
        <div className="container-page text-center">
          <Reveal>
            <p className="label justify-center text-white/50">Let's Talk</p>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="mt-4 text-display-lg font-display font-bold text-white text-balance">
              Let's Build <span className="text-encode-blue">Something.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.15}>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link to="/contact" className="btn-primary-inverse">
                Start a Project <ArrowRight size={16} />
              </Link>
              <Link to="/products" className="btn-secondary-inverse">
                Explore Products
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
