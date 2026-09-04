import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import Seo from "../components/Seo.jsx";
import EcosystemGraphic from "../components/EcosystemGraphic.jsx";
import { products } from "../lib/content.js";
import { schemaGraph, breadcrumbList } from "../lib/seo.js";
import campusLogo from "../assets/encode-campus-logo.png";
import learnLogo from "../assets/encode-learn-logo.png";
import verifyLogo from "../assets/encode-verify-logo.png";

const themeStyles = {
  black: { bg: "bg-black", text: "text-white", sub: "text-white/60", tag: "border-white/15 text-white/80" },
  blue: { bg: "bg-encode-blue", text: "text-black", sub: "text-black/60", tag: "border-black/15 text-black/80" },
  "black-blue": { bg: "bg-black", text: "text-white", sub: "text-white/60", tag: "border-white/15 text-white/80" },
};

const logoMap = {
  "encode-campus": campusLogo,
  "encode-learn": learnLogo,
  "encode-verify": verifyLogo,
};

export default function Products() {
  const schema = schemaGraph([
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Products", path: "/products" },
    ]),
    {
      "@type": "ItemList",
      name: "Encode Studio Products",
      itemListElement: products.map((p, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: p.name,
        url: `https://encodestudio.in/products/${p.slug}`,
      })),
    },
  ]);

  return (
    <div>
      <Seo
        title="Products — Encode Campus, Encode Learn & Encode Verify"
        description="Digital products built and owned by Encode Studio: Encode Campus (education operating & governance platform), Encode Learn (learning platform) and Encode Verify (verification & trust platform)."
        path="/products"
        schema={schema}
      />
      <section className="grid-bg py-24 md:py-28">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Products</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="max-w-3xl text-display-lg font-display font-bold text-balance">
              Products We've Built. <span className="text-encode-blue">Problems We're Solving.</span>
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-xl text-lg text-encode-grey">
              Digital products developed and owned by Encode Studio — built to operate education,
              enable learning, and establish trust.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="pb-24 md:pb-32">
        <div className="container-page flex flex-col gap-6">
          {products.map((p, i) => {
            const t = themeStyles[p.theme];
            return (
              <Reveal key={p.slug} delay={i * 0.08}>
                <div className={`rounded-3xl p-10 md:p-14 ${t.bg}`}>
                  <div className="grid gap-10 lg:grid-cols-[1fr,1fr] lg:items-start">
                    <div>
                      <div className="inline-block rounded-xl bg-white px-4 py-3">
                        <img src={logoMap[p.slug]} alt={p.name} className="h-6 w-auto md:h-7" />
                      </div>
                      <div className={`label mt-5 ${t.sub}`}>{p.tagline}</div>
                      <h2 className={`mt-4 text-3xl font-display font-bold md:text-4xl ${t.text}`}>{p.name}</h2>
                      <p className={`mt-5 max-w-md leading-relaxed ${t.sub}`}>{p.description}</p>
                      <blockquote className={`mt-6 max-w-md border-l-2 border-encode-blue pl-4 text-sm font-semibold ${t.text}`}>
                        {p.positioning}
                      </blockquote>
                      <Link
                        to={`/products/${p.slug}`}
                        className={`mt-8 inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold transition-colors ${
                          p.theme === "blue" ? "bg-black text-white hover:bg-white hover:text-black" : "bg-encode-blue text-black hover:bg-white"
                        }`}
                      >
                        Explore {p.name} <ArrowRight size={16} />
                      </Link>
                    </div>

                    <div className="flex flex-wrap content-start gap-2.5">
                      {p.capabilities.map((c) => (
                        <span
                          key={c}
                          className={`rounded-full border px-4 py-2 text-xs font-medium ${t.tag}`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ECOSYSTEM */}
      <section className="bg-encode-soft py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>The Ecosystem</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display font-display font-bold text-balance">
              Three Products. One Technology Vision.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-12 lg:grid-cols-2 lg:items-center">
            <Reveal delay={0.1}>
              <div className="rounded-3xl border border-encode-border bg-white p-8">
                <EcosystemGraphic />
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="max-w-md text-lg leading-relaxed text-encode-grey">
                Together, Encode Studio's products create a connected digital ecosystem for
                institutions, learners and trusted information.
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </div>
  );
}
