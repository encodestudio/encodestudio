// Central SEO configuration for the Encode Studio site.
//
// The site is a client-rendered React SPA, so per-route <head> tags are managed
// at runtime by <Seo> (src/components/Seo.jsx). The values here are the single
// source of truth for the canonical origin, default copy and structured data.

export const SITE_URL = "https://encodestudio.in";
export const SITE_NAME = "Encode Studio";

// Shown on the homepage and used as the fallback everywhere a page does not set
// its own title. Keep it readable — this is the primary brand + intent signal.
export const DEFAULT_TITLE =
  "Encode Studio — Web & Software Development Studio in Delhi NCR, India";

export const DEFAULT_DESCRIPTION =
  "Encode Studio is a technology and product studio in Delhi NCR, India. We design, build and evolve web applications, custom software, mobile apps and AI-powered digital products for businesses and institutions.";

// TODO: replace with a purpose-built 1200x630 share image at /public/og-image.png
// and point this at `${SITE_URL}/og-image.png`.
export const DEFAULT_OG_IMAGE = `${SITE_URL}/apple-touch-icon.png`;

export const ORG_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

// Areas we genuinely serve — used for schema `areaServed` and for honest
// location copy. Not doorway pages.
export const AREAS_SERVED = [
  "Delhi NCR",
  "Noida",
  "Greater Noida",
  "Gurugram",
  "Delhi",
  "India",
];

export const SOCIAL_PROFILES = [
  "https://www.facebook.com/encodestudio.in",
  "https://www.instagram.com/encodestudio.in/",
  "https://www.linkedin.com/company/encode-studio-india/",
];

/** Absolute canonical URL for a route path (e.g. "/services/web-development"). */
export function absoluteUrl(path = "/") {
  if (!path || path === "/") return `${SITE_URL}/`;
  return `${SITE_URL}/${String(path).replace(/^\/+/, "").replace(/\/+$/, "")}`;
}

/** Wrap one or more schema.org nodes in a single @graph document. */
export function schemaGraph(nodes) {
  return { "@context": "https://schema.org", "@graph": nodes.filter(Boolean) };
}

/** BreadcrumbList node from [{ name, path }] items (in order, root first). */
export function breadcrumbList(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Reference to the site-wide Organization node declared in index.html. */
export function organizationRef() {
  return { "@id": ORG_ID };
}
