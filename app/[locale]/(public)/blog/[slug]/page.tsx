import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { IconArrowLeft, IconClock, IconCalendar } from "@tabler/icons-react";
import { Link } from "@/i18n/routing";
import { getPostBySlug, getAllSlugs } from "@/utils/blog";
import { LandingNav } from "../../../_components/landing-nav";
import { LandingFooter } from "../../../_components/landing-footer";
import { PostContent } from "../_components/post-content";
import { BlogCta } from "../_components/blog-cta";
import { TableOfContents } from "../_components/table-of-contents";
import { ArticleJsonLd } from "../_components/blog-json-ld";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateStaticParams() {
  return getAllSlugs().map(({ slug, locale }) => ({ slug, locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(slug, locale);
  if (!post) return { title: "Not Found" };

  const url = `https://groware.io/${locale}/blog/${slug}`;

  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    authors: [{ name: post.author }],
    openGraph: {
      title: post.title,
      description: post.description,
      url,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      locale: locale === "pt" ? "pt_BR" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
    alternates: {
      canonical: url,
      languages: {
        pt: `https://groware.io/pt/blog/${slug}`,
        en: `https://groware.io/en/blog/${slug}`,
        "x-default": `https://groware.io/en/blog/${slug}`,
      },
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const post = getPostBySlug(slug, locale);

  if (!post) notFound();

  const url = `https://groware.io/${locale}/blog/${slug}`;

  const formattedDate = new Date(post.date).toLocaleDateString(
    locale === "pt" ? "pt-BR" : "en-US",
    { day: "2-digit", month: "long", year: "numeric" },
  );

  return (
    <div className="min-h-screen bg-[#09090b]">
      <LandingNav />
      <ArticleJsonLd post={post} url={url} />

      <main className="mx-auto max-w-6xl px-6 pt-28 pb-20">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-zinc-600 hover:text-zinc-400 transition-colors mb-8"
        >
          <IconArrowLeft size={14} />
          {t("backToList")}
        </Link>

        <div className="flex gap-12">
          <div className="min-w-0 max-w-3xl flex-1">
            <header className="mb-10">
              <div className="flex flex-wrap gap-2 mb-4">
                {post.keywords.slice(0, 4).map((kw) => (
                  <span
                    key={kw}
                    className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-[11px] font-medium text-indigo-400"
                  >
                    {kw}
                  </span>
                ))}
              </div>

              <h1 className="text-3xl md:text-4xl font-bold text-zinc-100 font-display leading-tight">
                {post.title}
              </h1>

              <div className="mt-4 flex items-center gap-4 text-sm text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <IconCalendar size={14} />
                  {t("publishedAt", { date: formattedDate })}
                </span>
                <span className="flex items-center gap-1.5">
                  <IconClock size={14} />
                  {t("readingTime", { minutes: post.readingTimeMinutes })}
                </span>
              </div>
            </header>

            <PostContent source={post.content} />
            <BlogCta />
          </div>

          <TableOfContents content={post.content} />
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
