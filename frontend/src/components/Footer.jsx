import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import Logo from "./Logo.jsx";
import { FacebookIcon, InstagramIcon, LinkedInIcon } from "./SocialIcons.jsx";

const socialLinks = [
  { label: "Facebook", href: "https://www.facebook.com/encodestudio.in", Icon: FacebookIcon },
  { label: "Instagram", href: "https://www.instagram.com/encodestudio.in/", Icon: InstagramIcon },
  { label: "LinkedIn", href: "https://www.linkedin.com/company/encode-studio-india/", Icon: LinkedInIcon },
];

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
      { label: "Web Development", to: "/services/web-development" },
      { label: "Website Development", to: "/services/website-development" },
      { label: "Software Development", to: "/services/software-development" },
      { label: "Mobile App Development", to: "/services/mobile-app-development" },
      { label: "UI/UX Design", to: "/services/ui-ux-design" },
      { label: "Digital Product Development", to: "/services/digital-product-development" },
      { label: "All Services", to: "/services" },
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
              A technology and product studio based in Delhi NCR, India. We design, build and
              evolve web, software and AI products that solve real-world problems.
            </p>
            <address className="mt-4 text-xs not-italic text-encode-grey">
              Delhi NCR · India — serving clients across Noida, Greater Noida, Gurugram, Delhi
              and India.
            </address>
            <div className="mt-6 flex items-center gap-3">
              {socialLinks.map(({ label, href, Icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-encode-border text-black/70 transition-colors hover:border-encode-blue hover:text-encode-blue"
                  aria-label={label}
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
