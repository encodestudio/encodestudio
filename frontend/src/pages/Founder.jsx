import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SectionLabel from "../components/SectionLabel.jsx";
import Reveal from "../components/Reveal.jsx";
import founderPhoto from "../assets/founder-shivam.jpg";

const emphasis = [
  { title: "Product thinking", body: "Understanding the purpose behind every feature." },
  { title: "Good design", body: "Making complex technology intuitive." },
  { title: "Strong engineering", body: "Creating foundations that can evolve." },
  { title: "Intelligent technology", body: "Using AI and automation where they create genuine value." },
  { title: "Long-term thinking", body: "Building products for where they are going, not only where they are today." },
];

const beliefs = [
  { title: "Build with purpose.", body: "Every product should solve a meaningful problem." },
  { title: "Keep complexity behind the scenes.", body: "Users shouldn't have to understand the complexity of a system to use it effectively." },
  { title: "Design and engineering belong together.", body: "Great products happen when technology and experience are considered together from the beginning." },
  { title: "Build for tomorrow.", body: "Today's solution should not become tomorrow's limitation." },
  { title: "Use AI where it matters.", body: "Technology should create measurable value — not simply follow a trend." },
  { title: "Keep learning.", body: "The best products and companies are built by people who remain curious." },
];

const lookingAhead = ["Building products.", "Building partnerships.", "Building better systems.", "Building technology that can create lasting impact."];

export default function Founder() {
  return (
    <div>
      {/* HERO */}
      <section className="grid-bg py-24 md:py-28">
        <div className="container-page grid gap-14 lg:grid-cols-[320px,1fr] lg:items-center">
          <Reveal>
            <div className="overflow-hidden rounded-3xl border border-encode-border bg-encode-soft">
              <img
                src={founderPhoto}
                alt="Shivam, Founder of Encode Studio"
                className="aspect-[2/3] w-full max-w-[280px] object-cover lg:max-w-none"
              />
            </div>
          </Reveal>
          <div>
            <Reveal>
              <SectionLabel>Meet the Founder</SectionLabel>
            </Reveal>
            <Reveal delay={0.05}>
              <h1 className="text-display font-display font-bold text-balance">
                Building technology <span className="text-encode-blue">with purpose.</span>
              </h1>
            </Reveal>
            <Reveal delay={0.08}>
              <p className="mt-3 text-sm font-semibold uppercase tracking-[0.18em] text-encode-grey">
                Shivam — Founder, Encode Studio
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-encode-grey">Behind Encode Studio is a simple belief:</p>
            </Reveal>
            <Reveal delay={0.2}>
              <blockquote className="mt-4 max-w-xl border-l-2 border-encode-blue pl-4 text-xl font-display font-semibold text-balance">
                Technology should make complex things simpler, not make simple things
                complicated.
              </blockquote>
            </Reveal>
          </div>
        </div>
      </section>

      {/* PHILOSOPHY */}
      <section className="py-24 md:py-32">
        <div className="container-page max-w-3xl">
          <Reveal>
            <p className="text-lg leading-relaxed text-encode-grey">
              Encode Studio was founded with the ambition to build technology that is useful,
              thoughtful and built to last — not simply software that works today, but products
              that can evolve with the people and organisations using them.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-6 text-lg leading-relaxed text-encode-grey">
              As the founder, I have always been fascinated by the intersection of{" "}
              <span className="font-semibold text-black">technology, design and real-world problems</span>.
              For me, building a product is not just about writing code or delivering features.
              It starts with understanding the problem, asking the right questions and finding a
              better way to solve it.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-lg font-semibold text-balance">
              That philosophy is at the heart of Encode Studio.
            </p>
          </Reveal>
        </div>
      </section>

      {/* WHY ENCODE STUDIO */}
      <section className="bg-encode-soft py-24 md:py-32">
        <div className="container-page max-w-3xl">
          <Reveal>
            <SectionLabel>Why Encode Studio?</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-display-sm font-display font-bold text-balance">
              The technology industry has never had a shortage of software.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-encode-grey">
              What it often lacks is <span className="font-semibold text-black">clarity</span>.
              Businesses need technology that aligns with their goals. Institutions need systems
              that understand the complexity of their operations. Users need experiences that
              feel intuitive rather than overwhelming.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 text-lg font-semibold text-balance">Encode Studio exists to bridge that gap.</p>
          </Reveal>
          <Reveal delay={0.22}>
            <p className="mt-6 leading-relaxed text-encode-grey">
              We work with organisations to turn ideas, challenges and opportunities into
              digital products that are meaningful, scalable and genuinely useful. From product
              strategy and experience design to software engineering, AI, automation and cloud
              technology, we bring the different pieces together under one roof.
            </p>
          </Reveal>
        </div>
      </section>

      {/* FROM IDEAS TO PRODUCTS */}
      <section className="py-24 md:py-32">
        <div className="container-page max-w-3xl">
          <Reveal>
            <SectionLabel>From Ideas to Products</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-display-sm font-display font-bold text-balance">
              We don't believe in building technology for technology's sake.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg font-semibold text-balance">Every product should begin with a question:</p>
          </Reveal>
          <Reveal delay={0.14}>
            <blockquote className="mt-4 border-l-2 border-encode-blue pl-4 text-xl font-display font-semibold text-balance">
              What problem are we trying to solve?
            </blockquote>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 leading-relaxed text-encode-grey">
              From there, we think about the people who experience that problem, the systems
              around it, the information required to solve it and the technology that can make
              the solution better. That way of thinking has shaped the products we are building
              ourselves.
            </p>
          </Reveal>

          <Reveal delay={0.28}>
            <div className="mt-10 rounded-3xl border border-encode-border bg-encode-soft p-8 md:p-10">
              <div className="label">Encode Campus</div>
              <p className="mt-4 italic leading-relaxed">
                What would a modern digital operating and governance platform for education look
                like?
              </p>
              <p className="mt-4 leading-relaxed text-encode-grey">
                The answer isn't just another application. It requires thinking about
                institutions, people, data, workflows, governance and the relationships between
                them.
              </p>
              <p className="mt-4 font-semibold text-balance">
                That is the kind of thinking we want Encode Studio to be known for.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* BUILDING BEYOND THE FIRST VERSION */}
      <section className="bg-black py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel dark>Building Beyond the First Version</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-2xl text-display-sm font-display font-bold text-white text-balance">
              A product's first release is only the beginning.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 max-w-2xl leading-relaxed text-white/60">
              The real challenge is creating an architecture and experience that can continue to
              grow as requirements change, users increase and new opportunities emerge. That is
              why we place strong emphasis on:
            </p>
          </Reveal>

          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {emphasis.map((e, i) => (
              <Reveal key={e.title} delay={0.1 + i * 0.06} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
                <h3 className="font-display font-bold text-white">{e.title}</h3>
                <p className="mt-2.5 text-sm leading-relaxed text-white/60">{e.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* THE ENCODE VISION */}
      <section className="py-24 md:py-32">
        <div className="container-page max-w-3xl">
          <Reveal>
            <SectionLabel>The Encode Vision</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="text-display-sm font-display font-bold text-balance">
              I want Encode Studio to grow into more than a technology services company.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p className="mt-6 text-lg leading-relaxed text-encode-grey">
              I envision a <span className="font-semibold text-black">product and technology studio</span> that
              creates its own products, partners with organisations to build theirs, and
              continuously explores new ways technology can solve meaningful problems.
            </p>
          </Reveal>
          <Reveal delay={0.16}>
            <p className="mt-6 leading-relaxed text-encode-grey">
              Our products — <span className="font-semibold text-black">Encode Campus, Encode Learn and Encode Verify</span> —
              represent different parts of that vision. Our services allow us to work alongside
              clients and bring the same product thinking, design discipline and engineering
              capabilities to their challenges.
            </p>
          </Reveal>
          <Reveal delay={0.22}>
            <p className="mt-6 font-semibold text-balance">
              Together, they form the foundation of what Encode Studio is becoming.
            </p>
          </Reveal>
        </div>
      </section>

      {/* WHAT WE BELIEVE */}
      <section className="bg-encode-soft py-24 md:py-32">
        <div className="container-page">
          <Reveal>
            <SectionLabel>What We Believe</SectionLabel>
          </Reveal>
          <Reveal delay={0.05}>
            <h2 className="max-w-xl text-display-sm font-display font-bold text-balance">
              Principles that shape how we build.
            </h2>
          </Reveal>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {beliefs.map((b, i) => (
              <Reveal key={b.title} delay={i * 0.06} className="card-surface p-7 hover:border-encode-blue">
                <h3 className="text-lg font-display font-bold text-balance">{b.title}</h3>
                <p className="mt-2.5 leading-relaxed text-encode-grey">{b.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* LOOKING AHEAD */}
      <section className="bg-black py-24 md:py-32">
        <div className="container-page text-center">
          <Reveal>
            <p className="label justify-center text-white/50">Looking Ahead</p>
          </Reveal>
          <Reveal delay={0.05}>
            <p className="mt-4 text-lg text-white/60">The next chapter of Encode Studio is about building.</p>
          </Reveal>

          <div className="mx-auto mt-8 flex max-w-md flex-col gap-3">
            {lookingAhead.map((line, i) => (
              <Reveal key={line} delay={0.1 + i * 0.06}>
                <p className="text-lg font-display font-semibold text-white text-balance">{line}</p>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.4}>
            <p className="mt-8 max-w-xl mx-auto leading-relaxed text-white/60">
              There is a long way to go, and that is what makes the journey exciting.
            </p>
          </Reveal>
          <Reveal delay={0.46}>
            <p className="mt-6 text-display-sm font-display font-bold text-white text-balance">We are just getting started.</p>
          </Reveal>
          <Reveal delay={0.52}>
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-encode-blue">
              — Founder, Encode Studio
            </p>
          </Reveal>
          <Reveal delay={0.58}>
            <Link to="/contact" className="btn-primary-inverse mt-10">
              Let's Build Something Meaningful <ArrowRight size={16} />
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
