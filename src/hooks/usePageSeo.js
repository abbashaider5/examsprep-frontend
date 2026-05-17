import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolvePageSeo } from '../config/seo.js';

/**
 * Merge route defaults with page-specific overrides (for dynamic titles, legal pages, etc.).
 * @param {import('../config/seo.js').SeoOverrides} [overrides]
 */
export function usePageSeo(overrides = {}) {
  const { pathname } = useLocation();
  const {
    title,
    description,
    keywords,
    image,
    imageAlt,
    robots,
    type,
    noTitleSuffix,
    canonicalPath,
    jsonLd,
  } = overrides;
  return useMemo(() => {
    const base = resolvePageSeo(pathname);
    return {
      ...base,
      ...(title != null && { title }),
      ...(description != null && { description }),
      ...(keywords != null && { keywords }),
      ...(image != null && { image }),
      ...(imageAlt != null && { imageAlt }),
      ...(robots != null && { robots }),
      ...(type != null && { type }),
      ...(noTitleSuffix != null && { noTitleSuffix }),
      canonicalPath: canonicalPath ?? pathname,
      ...(jsonLd != null && { jsonLd }),
    };
  }, [
    pathname,
    title,
    description,
    keywords,
    image,
    imageAlt,
    robots,
    type,
    noTitleSuffix,
    canonicalPath,
    jsonLd,
  ]);
}

export default usePageSeo;
