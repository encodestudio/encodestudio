// Content for the dedicated service pages recommended in the Encode Studio SEO
// plan. Each page targets one clear search intent with genuinely useful,
// non-boilerplate copy — not doorway pages. Rendered by src/pages/ServiceDetail.jsx.

export const serviceDetails = [
  {
    slug: "web-development",
    order: "01",
    name: "Web Development",
    // <title> — primary keyword first, brand + location after.
    seoTitle: "Web Development Services in India & Delhi NCR",
    metaDescription:
      "Encode Studio builds fast, scalable web applications, SaaS platforms and customer portals for businesses and institutions across Delhi NCR and India. Product-focused engineering, built to evolve.",
    h1: "Web Development Services for Products That Have to Scale",
    intro:
      "We build production-grade web applications — SaaS platforms, customer portals, internal tools and enterprise dashboards — for teams that need software to hold up as usage, data and requirements grow. Encode Studio is a technology and product studio based in Delhi NCR, working with clients across India and beyond.",
    primaryKeyword: "web development services India",
    secondaryKeywords: [
      "web development agency Delhi NCR",
      "web application development company India",
      "custom web development India",
      "SaaS development company Delhi NCR",
    ],
    offerings: [
      { title: "SaaS Platforms", desc: "Multi-tenant products with billing, roles and entitlements engineered in from the start." },
      { title: "Web Applications", desc: "Complex, stateful applications where UX and data model matter as much as the stack." },
      { title: "Customer & Partner Portals", desc: "Secure, role-aware portals that connect your customers to your operations." },
      { title: "Admin & Ops Dashboards", desc: "Internal tools that make a team faster instead of adding another system to fight." },
      { title: "API-Driven Applications", desc: "Clean APIs and integrations so your product works with the rest of your stack." },
      { title: "Progressive Web Apps", desc: "Installable, offline-capable web experiences when a native app is not warranted." },
    ],
    faqs: [
      {
        q: "What technologies do you use for web development?",
        a: "We choose per project, but typically modern JavaScript/TypeScript on the front end (React), a well-structured API layer, and a relational database with a schema designed for change. The priority is an architecture that can evolve past the MVP.",
      },
      {
        q: "Do you work with clients outside Delhi NCR?",
        a: "Yes. We are based in Delhi NCR and work with teams across India and internationally. Most collaboration happens remotely with regular checkpoints.",
      },
      {
        q: "Can you take over an existing web application?",
        a: "Often, yes. We start with a short technical assessment of the codebase, infrastructure and priorities before committing to a plan.",
      },
    ],
  },
  {
    slug: "website-development",
    order: "02",
    name: "Website Development",
    seoTitle: "Website Development Company in Delhi NCR & India",
    metaDescription:
      "Corporate and marketing website development for companies in Delhi NCR and across India — fast, accessible, SEO-ready sites built on a modern stack and easy to maintain.",
    h1: "Website Development That Loads Fast and Ranks Well",
    intro:
      "Corporate sites, marketing sites and product landing pages — designed and built to be quick, accessible, easy to update and structured for search from day one. If you need a complex logged-in application rather than a marketing site, see our web application development service.",
    primaryKeyword: "website development company Delhi NCR",
    secondaryKeywords: [
      "website development company Delhi",
      "corporate website design India",
      "marketing website developers Delhi NCR",
      "business website development India",
    ],
    offerings: [
      { title: "Corporate Websites", desc: "A credible, fast company site with a content structure your team can actually maintain." },
      { title: "Marketing & Campaign Sites", desc: "Landing pages and campaign microsites wired for analytics and conversion." },
      { title: "Product & Launch Pages", desc: "Focused pages that explain a product clearly and move visitors to act." },
      { title: "Core Web Vitals", desc: "Performance budgets, image optimisation and clean markup so the site passes Google's field metrics." },
      { title: "On-Page SEO Foundations", desc: "Semantic headings, metadata, canonical URLs, sitemap, structured data and Open Graph built in." },
      { title: "Analytics & Search Console", desc: "GA4 and Google Search Console configured and verified at handover." },
    ],
    faqs: [
      {
        q: "Will the website be good for SEO?",
        a: "Yes — technical SEO is part of the build: semantic HTML, one H1 per page, descriptive titles and meta descriptions, canonical URLs, an XML sitemap, robots.txt, structured data and fast Core Web Vitals. Content and off-site authority are still your ongoing work, and we can advise on both.",
      },
      {
        q: "Can we edit the content ourselves?",
        a: "Yes. Depending on the project we either integrate a headless CMS or structure content so non-developers can update it safely.",
      },
      {
        q: "How long does a typical website take?",
        a: "A focused marketing site is usually a few weeks; larger sites with custom design and many templates take longer. We scope it precisely before starting.",
      },
    ],
  },
  {
    slug: "software-development",
    order: "03",
    name: "Software Development",
    seoTitle: "Custom Software Development Company in Delhi NCR & India",
    metaDescription:
      "Custom software and product engineering for businesses and institutions in Delhi NCR and across India — MVPs, enterprise applications, backend systems and legacy modernisation.",
    h1: "Custom Software Development, Engineered to Last",
    intro:
      "When off-the-shelf tools do not fit, we design and build the software that does — MVPs for new products, enterprise applications, backend systems and integrations, and modernisation of software that has outgrown its original design. Encode Studio is a software and product engineering studio in Delhi NCR, India.",
    primaryKeyword: "custom software development company India",
    secondaryKeywords: [
      "software development company Delhi NCR",
      "product engineering services India",
      "MVP development company Delhi NCR",
      "enterprise software development India",
    ],
    offerings: [
      { title: "Custom Software", desc: "Applications shaped around your workflow instead of forcing your workflow into a template." },
      { title: "MVP Development", desc: "A real, shippable first version scoped to test the idea without painting you into a corner." },
      { title: "Enterprise Applications", desc: "Systems for complex organisations — permissions, audit trails, reporting and integrations." },
      { title: "Backend & API Engineering", desc: "Reliable services, well-modelled data and documented APIs other systems can depend on." },
      { title: "Third-Party Integrations", desc: "Payments, identity, messaging, ERPs and the rest of your stack, connected properly." },
      { title: "Legacy Modernisation", desc: "Incremental replacement of ageing systems without a risky big-bang rewrite." },
    ],
    faqs: [
      {
        q: "How do you scope a custom software project?",
        a: "We start with a discovery phase: understand the problem, the users and the constraints, then convert that into a clear plan with a defined first release. You get a concrete scope and estimate before development begins.",
      },
      {
        q: "Do you provide support after launch?",
        a: "Yes. We can stay involved for maintenance, iteration and scaling as a long-term technology partner, or hand over cleanly to your team with documentation.",
      },
      {
        q: "Who owns the code?",
        a: "You do. Source, infrastructure configuration and documentation are yours.",
      },
    ],
  },
  {
    slug: "mobile-app-development",
    order: "04",
    name: "Mobile App Development",
    seoTitle: "Mobile App Development Company in Delhi NCR & India",
    metaDescription:
      "Android, iOS and cross-platform mobile app development for consumer, business and education products — built by a product studio in Delhi NCR, India.",
    h1: "Mobile App Development for Products People Keep Using",
    intro:
      "We design and build mobile apps — Android, iOS and cross-platform — for consumer products, business tools and education. The focus is on the product: a clear core flow, a considered interface and an architecture that supports the roadmap after version one.",
    primaryKeyword: "mobile app development company India",
    secondaryKeywords: [
      "mobile app developers Delhi NCR",
      "Android app development company India",
      "iOS app development Delhi NCR",
      "cross-platform app development India",
    ],
    offerings: [
      { title: "Android Applications", desc: "Native or cross-platform builds tuned for the range of devices your users actually have." },
      { title: "iOS Applications", desc: "Apps that meet Apple's guidelines and feel native on iPhone and iPad." },
      { title: "Cross-Platform Apps", desc: "One codebase for Android and iOS when it fits the product and budget." },
      { title: "Consumer & Business Apps", desc: "From customer-facing products to field and operations tools for staff." },
      { title: "Mobile UI/UX", desc: "Interaction and interface design specific to small screens and on-the-go use." },
      { title: "Maintenance & Enhancement", desc: "OS updates, new features and performance work over the life of the app." },
    ],
    faqs: [
      {
        q: "Native or cross-platform — which should we choose?",
        a: "It depends on the product. Heavy device-specific features and performance-critical apps lean native; content and workflow apps are often well served by a cross-platform stack. We recommend based on your specific requirements, not a default.",
      },
      {
        q: "Do you handle App Store and Play Store submission?",
        a: "Yes — we prepare builds, store listings and metadata, and support you through review and release.",
      },
      {
        q: "Can you build the backend for the app too?",
        a: "Yes. Most apps need an API, and our software engineering team builds that alongside the app so the two are designed together.",
      },
    ],
  },
  {
    slug: "ui-ux-design",
    order: "05",
    name: "UI/UX Design",
    seoTitle: "UI/UX Design & Product Design Services in India",
    metaDescription:
      "UX research, information architecture, UI design and design systems for web and mobile products — a product design team in Delhi NCR working with clients across India.",
    h1: "UI/UX Design That Makes Complex Products Usable",
    intro:
      "We design digital products end to end — research, information architecture, user journeys, wireframes, interface design and reusable design systems. Our design and engineering teams work together from the start, so what gets designed is what gets built.",
    primaryKeyword: "UI UX design services India",
    secondaryKeywords: [
      "product design agency Delhi NCR",
      "UI UX design company India",
      "design system consultancy India",
      "UX audit services Delhi NCR",
    ],
    offerings: [
      { title: "UX Research", desc: "Understand the people and the problem before committing pixels to a solution." },
      { title: "Information Architecture", desc: "Structure content and navigation so users can find what they need." },
      { title: "Wireframing & Prototyping", desc: "Test flows early, when they are cheap to change." },
      { title: "UI Design", desc: "Clear, consistent interfaces that hold up across every screen and state." },
      { title: "Design Systems", desc: "A component library and tokens that keep design and code in sync as you scale." },
      { title: "UX Audits", desc: "A structured review of an existing product with prioritised, practical fixes." },
    ],
    faqs: [
      {
        q: "Do you do design without development?",
        a: "Yes. We take on standalone design engagements — research, redesigns, design systems and audits — and hand over production-ready files and specs.",
      },
      {
        q: "Can you improve our existing product instead of redesigning it?",
        a: "Usually that is the better path. A UX audit identifies the highest-impact changes so you can improve incrementally rather than pause everything for a full redesign.",
      },
      {
        q: "What deliverables do we get?",
        a: "Typically a Figma project with research notes, flows, screens for key states, and a documented component library or design tokens.",
      },
    ],
  },
  {
    slug: "digital-product-development",
    order: "06",
    name: "Digital Product Development",
    seoTitle: "Digital Product Development Company in India",
    metaDescription:
      "End-to-end digital product development — strategy, design, engineering and growth under one roof. Encode Studio is a product studio in Delhi NCR, India.",
    h1: "Digital Product Development, From First Idea to Ongoing Growth",
    intro:
      "Some projects need more than a build — they need a partner across the whole product lifecycle. We combine product strategy, design, engineering, AI and long-term growth so one team carries an idea from discovery to a live product and keeps improving it.",
    primaryKeyword: "digital product development company India",
    secondaryKeywords: [
      "product development studio Delhi NCR",
      "end to end product development India",
      "product strategy and engineering India",
      "technology product studio Delhi NCR",
    ],
    offerings: [
      { title: "Product Strategy", desc: "Discovery, roadmapping and MVP definition — decide what to build before building it." },
      { title: "Product Design", desc: "Research-led UX and UI so the product is usable from its first release." },
      { title: "Engineering", desc: "Web, mobile and backend built on an architecture designed to evolve." },
      { title: "AI & Automation", desc: "Apply AI where it creates measurable value, not because it is a trend." },
      { title: "Launch", desc: "Deployment, infrastructure, analytics and Search Console set up for a real launch." },
      { title: "Evolve", desc: "Measure, iterate and grow the product as a continuing partnership." },
    ],
    faqs: [
      {
        q: "How is this different from your other services?",
        a: "The individual services (web, software, mobile, design) can be engaged on their own. Digital product development is the combined engagement — one team owning strategy through growth — and suits founders and organisations building something new.",
      },
      {
        q: "Do you take equity or work fixed-fee?",
        a: "We work on a fee basis. Engagement structure — fixed scope, retainer or a blend — depends on how defined the product is when we start.",
      },
      {
        q: "What happens after launch?",
        a: "We can continue as your product team, scale down to a maintenance and iteration retainer, or transition the product to an in-house team with a proper handover.",
      },
    ],
  },
];

export function findServiceDetail(slug) {
  return serviceDetails.find((s) => s.slug === slug);
}
