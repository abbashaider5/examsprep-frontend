import { useEffect, useRef } from 'react';
import {
  SITE,
  DEFAULT_SEO,
  absoluteUrl,
  formatDocumentTitle,
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
  buildSoftwareApplicationJsonLd,
} from '../config/seo.js';

const MANAGED_SELECTOR = 'data-likhitai-seo';

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return;
  let el = document.head.querySelector(`meta[${attr}="${key}"][${MANAGED_SELECTOR}]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    el.setAttribute(MANAGED_SELECTOR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function upsertLink(rel, href) {
  if (!href) return;
  let el = document.head.querySelector(`link[rel="${rel}"][${MANAGED_SELECTOR}]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    el.setAttribute(MANAGED_SELECTOR, 'true');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function removeManagedJsonLd(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function injectJsonLd(id, data) {
  removeManagedJsonLd(id);
  if (!data) return;
  const script = document.createElement('script');
  script.id = id;
  script.type = 'application/ld+json';
  script.setAttribute(MANAGED_SELECTOR, 'true');
  script.textContent = JSON.stringify(data);
  document.head.appendChild(script);
}

/**
 * Lightweight head manager — no external SEO library.
 * @param {import('../config/seo.js').SeoOverrides & { canonicalPath?: string, includeAppSchema?: boolean, includeWebSiteSchema?: boolean }} props
 */
export default function Seo({
  title,
  description,
  keywords,
  image,
  imageAlt,
  robots,
  type = 'website',
  canonicalPath,
  noTitleSuffix = false,
  jsonLd,
  includeAppSchema = false,
  includeWebSiteSchema = false,
}) {
  const jsonLdRef = useRef(null);

  useEffect(() => {
    const prevTitle = document.title;
    const desc = description || DEFAULT_SEO.description;
    const keys = keywords || DEFAULT_SEO.keywords;
    const img = absoluteUrl(image || DEFAULT_SEO.image);
    const imgAlt = imageAlt || DEFAULT_SEO.imageAlt;
    const canon = absoluteUrl(canonicalPath ?? `${window.location.pathname}${window.location.search}`);
    const robotsVal = robots || DEFAULT_SEO.robots;

    document.title = formatDocumentTitle(title || DEFAULT_SEO.title, noTitleSuffix);

    upsertMeta('name', 'description', desc);
    upsertMeta('name', 'keywords', keys);
    upsertMeta('name', 'robots', robotsVal);
    upsertMeta('name', 'author', SITE.name);
    upsertMeta('name', 'application-name', SITE.name);
    upsertMeta('name', 'theme-color', SITE.themeColor);

    upsertMeta('property', 'og:site_name', SITE.name);
    upsertMeta('property', 'og:title', formatDocumentTitle(title || DEFAULT_SEO.title, noTitleSuffix));
    upsertMeta('property', 'og:description', desc);
    upsertMeta('property', 'og:type', type);
    upsertMeta('property', 'og:url', canon);
    upsertMeta('property', 'og:image', img);
    upsertMeta('property', 'og:image:alt', imgAlt);
    upsertMeta('property', 'og:locale', SITE.locale);

    upsertMeta('name', 'twitter:card', 'summary_large_image');
    upsertMeta('name', 'twitter:title', formatDocumentTitle(title || DEFAULT_SEO.title, noTitleSuffix));
    upsertMeta('name', 'twitter:description', desc);
    upsertMeta('name', 'twitter:image', img);
    upsertMeta('name', 'twitter:image:alt', imgAlt);
    if (SITE.twitterHandle) {
      upsertMeta('name', 'twitter:site', SITE.twitterHandle);
    }

    upsertLink('canonical', canon);

    const schemas = [buildOrganizationJsonLd()];
    if (includeWebSiteSchema) schemas.push(buildWebSiteJsonLd());
    if (includeAppSchema) schemas.push(buildSoftwareApplicationJsonLd());
    if (jsonLd) {
      const extra = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      schemas.push(...extra);
    }
    jsonLdRef.current = schemas;
    injectJsonLd('likhitai-jsonld', schemas.length === 1 ? schemas[0] : schemas);

    return () => {
      document.title = prevTitle;
      removeManagedJsonLd('likhitai-jsonld');
    };
  }, [
    title,
    description,
    keywords,
    image,
    imageAlt,
    robots,
    type,
    canonicalPath,
    noTitleSuffix,
    jsonLd,
    includeAppSchema,
    includeWebSiteSchema,
  ]);

  return null;
}
