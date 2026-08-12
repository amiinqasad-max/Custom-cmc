/** Pure JSON-LD builders (schema.org). Rendered via components/public/json-ld.tsx. */

export function organizationSchema(params: { name: string; url: string; logoUrl?: string | null }) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: params.name,
    url: params.url,
    ...(params.logoUrl ? { logo: params.logoUrl } : {}),
  };
}

export function websiteSchema(params: { name: string; url: string }) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: params.name,
    url: params.url,
    potentialAction: {
      "@type": "SearchAction",
      target: `${params.url}/search?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function articleSchema(params: {
  headline: string;
  description: string | null;
  url: string;
  imageUrl?: string | null;
  datePublished: string | null;
  dateModified: string;
  authorName: string;
  organizationName: string;
  organizationLogoUrl?: string | null;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: params.headline,
    description: params.description ?? undefined,
    image: params.imageUrl ? [params.imageUrl] : undefined,
    datePublished: params.datePublished ?? undefined,
    dateModified: params.dateModified,
    author: { "@type": "Person", name: params.authorName },
    publisher: {
      "@type": "Organization",
      name: params.organizationName,
      logo: params.organizationLogoUrl ? { "@type": "ImageObject", url: params.organizationLogoUrl } : undefined,
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": params.url },
  };
}
