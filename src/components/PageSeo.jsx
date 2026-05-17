import Seo from './Seo.jsx';
import { usePageSeo } from '../hooks/usePageSeo.js';

/** Page-level SEO overrides on top of route defaults (legal pages, dynamic titles). */
export default function PageSeo(overrides = {}) {
  const seo = usePageSeo(overrides);
  return (
    <Seo
      title={seo.title}
      description={seo.description}
      keywords={seo.keywords}
      image={seo.image}
      imageAlt={seo.imageAlt}
      robots={seo.robots}
      type={seo.type}
      noTitleSuffix={seo.noTitleSuffix}
      canonicalPath={seo.canonicalPath}
      jsonLd={seo.jsonLd}
    />
  );
}
