import type { BlogPost } from "@/utils/blog";

interface ArticleJsonLdProps {
  post: BlogPost;
  url: string;
}

export function ArticleJsonLd({ post, url }: ArticleJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
      url: "https://groware.io",
    },
    publisher: {
      "@type": "Organization",
      name: "Groware",
      url: "https://groware.io",
      logo: {
        "@type": "ImageObject",
        url: "https://groware.io/assets/images/logo-256.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: post.keywords.join(", "),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface CollectionJsonLdProps {
  url: string;
  title: string;
  description: string;
}

export function CollectionJsonLd({ url, title, description }: CollectionJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url,
    publisher: {
      "@type": "Organization",
      name: "Groware",
      url: "https://groware.io",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
