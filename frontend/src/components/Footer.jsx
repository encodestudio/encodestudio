import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Logo from "./Logo.jsx";
import { LinkedInIcon, InstagramIcon, XIcon } from "./SocialIcons.jsx";

const columns = [
  {
    title: "Products",
    links: [
      { label: "Encode Campus", to: "/products/encode-campus" },
      { label: "Encode Learn", to: "/products/encode-learn" },
      { label: "Encode Verify", to: "/products/encode-verify" },
    ],
  },
  {
    title: "Services",
    links: [
      { label: "Product Strategy", to: "/services#strategy" },
      { label: "Design", to: "/services#design" },
      { label: "Web & Mobile", to: "/services#web" },
      { label: "Software Engineering", to: "/services#engineering" },
      { label: "AI & Automation", to: "/services#ai" },
      { label: "Cloud & DevOps", to: "/services#cloud" },
      { label: "Product Growth", to: "/services#growth" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Meet the Founder", to: "/founder" },
      { label: "Contact Us", to: "/contact" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-encode-border bg-white">
      <div className="container-page py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2">
            <Link to="/">
              <Logo className="h-8 w-auto" />
            </Link>
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-encode-grey">
              A product studio building technology for the real world. We design, build and
              operate digital products that solve real-world problems.
            </p>
            <div className="mt-6 flex items-center gap-3">
              {[LinkedInIcon, InstagramIcon, XIcon].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-encode-border text-black/70 transition-colors hover:border-encode-blue hover:text-encode-blue"
                  aria-label="Social link"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <div className="label mb-4">{col.title}</div>
              <ul className="space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link to={l.to} className="text-sm text-black/70 transition-colors hover:text-encode-blue">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-encode-border pt-8 sm:flex-row sm:items-center">
          <p className="text-xs text-encode-grey">
            © {new Date().getFullYear()} Encode Studio. All rights reserved.
          </p>
          <Link
            to="/contact"
            className="inline-flex items-center gap-1 text-xs font-semibold text-black transition-colors hover:text-encode-blue"
          >
            Let's build something <ArrowUpRight size={14} />
          </Link>
        </div>
      </div>
    </footer>
  );
}
