import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import Seo from "../components/Seo.jsx";
import { serviceGroups } from "../lib/content.js";
import { serviceDetails } from "../lib/serviceDetails.js";
import { schemaGraph, breadcrumbList, organizationRef, absoluteUrl } from "../lib/seo.js";

export default function Services() {
  const [activeId, setActiveId] = useState(serviceGroups[0].id);

  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash && serviceGroups.some((s) => s.id === hash)) {
      setActiveId(hash);
    }
  }, []);

  const active = serviceGroups.find((s) => s.id === activeId);

  const schema = schemaGraph([
    breadcrumbList([
      { name: "Home", path: "/" },
      { name: "Services", path: "/services" },
    ]),
    {
      "@type": "ItemList",
      name: "Encode Studio Services",
      itemListElement: serviceDetails.map((s, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: s.name,
        url: absoluteUrl(`/services/${s.slug}`),
      })),
    },
    {
      "@type": "Organization",
      "@id": "https://encodestudio.in/#organization",
      makesOffer: serviceDetails.map((s) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: s.name,
          url: absoluteUrl(`/services/${s.slug}`),
          provider: organizationRef(),
        },
      })),
    },
  ]);

  return (
    <div>
      <Seo
        title="Web, Software & Product Development Services in India & Delhi NCR"
        description="Encode Studio's services: web development, website development, custom software, mobile apps, UI/UX design and end-to-end digital product development — for clients in Delhi NCR and across India."
        path="/services"
        schema={schema}
      />
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

      {/* DEDICATED SERVICE PAGES */}
      <section className="border-t border-encode-border bg-encode-soft py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>Explore by Service</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-2xl text-display font-display font-bold text-balance">
              Detailed pages for the work clients ask for most.
            </h2>
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {serviceDetails.map((s, i) => (
              <Reveal key={s.slug} delay={i * 0.05}>
                <Link
                  to={`/services/${s.slug}`}
                  className="group flex h-full flex-col justify-between rounded-2xl border border-encode-border bg-white p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-encode-blue"
                >
                  <div>
                    <span className="text-sm font-bold text-encode-blue">{s.order}</span>
                    <h3 className="mt-3 text-lg font-display font-bold">{s.name}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-encode-grey">
                      {s.metaDescription}
                    </p>
                  </div>
                  <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold">
                    View {s.name}
                    <ArrowRight size={15} className="text-encode-blue transition-transform group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* WHERE WE WORK — LOCATION RELEVANCE */}
      <section className="py-24 md:py-32">
        <div className="container-page max-w-3xl">
          <Reveal>
            <SectionLabel>Where We Work</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-display-sm font-display font-bold text-balance">
              A product studio in Delhi NCR, working with clients across India.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 leading-relaxed text-encode-grey">
              Encode Studio is based in the Delhi NCR region — covering Noida, Greater Noida,
              Gurugram and Delhi — and partners with founders, businesses and institutions across
              India and internationally. We run projects remotely with regular checkpoints and can
              meet in person with clients in and around Delhi NCR.
            </p>
          </Reveal>
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
