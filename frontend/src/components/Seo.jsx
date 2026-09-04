import { useEffect } from "react";
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  absoluteUrl,
} from "../lib/seo.js";

// Runtime <head> manager for a client-rendered SPA. Each page mounts one <Seo>;
// on route change the tags are updated in place (no duplicates, no flash of the
// previous route's metadata). Googlebot renders the page before indexing, so the
// values set here are what search engines actually see.

function upsertMeta(attr, key, content) {
  if (content == null || content === "") return;
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

const JSONLD_ID = "seo-route-jsonld";

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  image = DEFAULT_OG_IMAGE,
  type = "website",
  noindex = false,
  schema = null,
}) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : DEFAULT_TITLE;
  const ogTitle = title || DEFAULT_TITLE;
  const canonical = absoluteUrl(path);
  const schemaString = schema ? JSON.stringify(schema) : null;

  useEffect(() => {
    document.title = fullTitle;

    upsertMeta("name", "description", description);
    upsertMeta(
      "name",
      "robots",
      noindex ? "noindex, nofollow" : "index, follow, max-image-preview:large",
    );
    upsertLink("canonical", canonical);

    upsertMeta("property", "og:title", ogTitle);
    upsertMeta("property", "og:description", description);
    upsertMeta("property", "og:url", canonical);
    upsertMeta("property", "og:type", type);
    upsertMeta("property", "og:image", image);
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:locale", "en_IN");

    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", ogTitle);
    upsertMeta("name", "twitter:description", description);
    upsertMeta("name", "twitter:image", image);

    document.getElementById(JSONLD_ID)?.remove();
    if (schemaString) {
      const node = document.createElement("script");
      node.type = "application/ld+json";
      node.id = JSONLD_ID;
      node.textContent = schemaString;
      document.head.appendChild(node);
    }
  }, [fullTitle, ogTitle, description, canonical, image, type, noindex, schemaString]);

  return null;
}
