import { Navigate, useParams, Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import Seo from "../components/Seo.jsx";
import { serviceDetails, findServiceDetail } from "../lib/serviceDetails.js";
import { process } from "../lib/content.js";
import {
  SITE_NAME,
  absoluteUrl,
  schemaGraph,
  breadcrumbList,
  organizationRef,
} from "../lib/seo.js";

export default function ServiceDetail() {
  const { slug } = useParams();
  const service = findServiceDetail(slug);

  if (!service) return <Navigate to="/services" replace />;

  const path = `/services/${service.slug}`;
  const others = serviceDetails.filter((s) => s.slug !== service.slug);

  const schema = schemaGraph([
    {
      "@type": "Service",
      name: service.name,
      serviceType: service.name,
      url: absoluteUrl(path),
      description: service.metaDescription,
      provider: organizationRef(),
      areaServed: [
        { "@type": "AdministrativeArea", name: "Delhi NCR" },
        { "@type": "Country", name: "India" },
      ],
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: `${service.name} — what we build`,
        itemListElement: service.offerings.map((o) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: o.title, description: o.desc },
        })),
      },
    },
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
      { name: service.name, path },
    ]),
    {
      "@type": "FAQPage",
      mainEntity: service.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ]);

  return (
    <div>
      <Seo
        title={service.seoTitle}
        description={service.metaDescription}
        path={path}
        type="website"
        schema={schema}
      />

      {/* HERO */}
      <section className="grid-bg py-24 md:py-28">
        <div className="container-page">
          <Reveal>
            <nav aria-label="Breadcrumb" className="label mb-6 flex flex-wrap items-center gap-2">
              <Link to="/" className="hover:text-encode-blue">Home</Link>
              <span aria-hidden="true">/</span>
              <Link to="/services" className="hover:text-encode-blue">Services</Link>
              <span aria-hidden="true">/</span>
              <span className="text-black">{service.name}</span>
            </nav>
          </Reveal>
          <Reveal delay={0.05}>
            <h1 className="max-w-3xl text-display-lg font-display font-bold text-balance">
              {service.h1}
            </h1>
          </Reveal>
          <Reveal delay={0.15}>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-encode-grey">
              {service.intro}
            </p>
          </Reveal>
          <Reveal delay={0.25}>
            <div className="mt-9 flex flex-wrap gap-4">
              <Link to="/contact" className="btn-primary">
                Start a Project <ArrowRight size={16} />
              </Link>
              <Link to="/services" className="btn-secondary">
                All Services
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* WHAT WE BUILD */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>What We Build</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-2xl text-display font-display font-bold text-balance">
              {service.name} services, in practice.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {service.offerings.map((o, i) => (
              <Reveal key={o.title} delay={i * 0.06} className="card-surface p-7 hover:border-encode-blue">
                <h3 className="text-base font-display font-bold">{o.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-encode-grey">{o.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW WE WORK */}
      <section className="bg-encode-soft py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>How We Work</SectionLabel>
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

      {/* LOCATION RELEVANCE */}
      <section className="py-24 md:py-32">
        <div className="container-page max-w-3xl">
          <Reveal>
            <SectionLabel>Where We Work</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-display-sm font-display font-bold text-balance">
              Based in Delhi NCR. Working with teams across India.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 leading-relaxed text-encode-grey">
              Encode Studio is a technology and product studio in the Delhi NCR region — Noida,
              Greater Noida, Gurugram and Delhi — and we work with founders, businesses and
              institutions across India and internationally. Most delivery happens remotely with
              regular checkpoints, and we can meet in person with clients in and around Delhi NCR.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-encode-soft py-24 md:py-32">
        <div className="container-page max-w-3xl">
          <Reveal>
            <SectionLabel>FAQ</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-display-sm font-display font-bold text-balance">
              {service.name} — common questions.
            </h2>
          </Reveal>

          <div className="mt-10 divide-y divide-encode-border overflow-hidden rounded-3xl border border-encode-border bg-white">
            {service.faqs.map((f, i) => (
              <Reveal key={f.q} delay={i * 0.05}>
                <details className="group px-7 py-6">
                  <summary className="cursor-pointer list-none text-base font-display font-bold marker:content-none">
                    {f.q}
                  </summary>
                  <p className="mt-3 leading-relaxed text-encode-grey">{f.a}</p>
                </details>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* OTHER SERVICES — INTERNAL LINKS */}
      <section className="py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Related Services</SectionLabel>
          </Reveal>
          <div className="mt-10 flex flex-wrap gap-3">
            {others.map((s) => (
              <Link
                key={s.slug}
                to={`/services/${s.slug}`}
                className="rounded-full border border-encode-border bg-white px-5 py-2.5 text-sm font-semibold transition-colors hover:border-encode-blue hover:text-encode-blue"
              >
                {s.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-black py-20">
        <div className="container-page flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
          <h2 className="max-w-lg text-2xl font-display font-bold text-white text-balance">
            Have a {service.name.toLowerCase()} project in mind? Let's scope it together.
          </h2>
          <Link to="/contact" className="btn-primary-inverse shrink-0">
            Start a Project <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <p className="sr-only">{SITE_NAME} — {service.name} services in Delhi NCR and across India.</p>
    </div>
  );
}
