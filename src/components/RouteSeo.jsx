import { useLocation } from 'react-router-dom';
import Seo from './Seo.jsx';
import { resolvePageSeo } from '../config/seo.js';

/** Applies route-based SEO defaults for every page; authenticated app routes are noindex. */
export default function RouteSeo() {
  const { pathname } = useLocation();
  const seo = resolvePageSeo(pathname);
  const isHome = pathname === '/' || pathname === '';

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
      canonicalPath={pathname}
      includeWebSiteSchema={isHome}
      includeAppSchema={isHome}
      jsonLd={seo.jsonLd}
    />
  );
}
