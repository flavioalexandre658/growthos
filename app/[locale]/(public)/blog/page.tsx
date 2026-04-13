import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getAllPosts } from "@/utils/blog";
import { LandingNav } from "../../_components/landing-nav";
import { LandingFooter } from "../../_components/landing-footer";
import { PostCard } from "./_components/post-card";
import { CollectionJsonLd } from "./_components/blog-json-ld";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
    alternates: {
      canonical: `https://groware.io/${locale}/blog`,
      languages: {
        pt: "https://groware.io/pt/blog",
        en: "https://groware.io/en/blog",
        "x-default": "https://groware.io/en/blog",
      },
    },
  };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });
  const posts = getAllPosts(locale);

  return (
    <div className="min-h-screen bg-[#09090b]">
      <LandingNav />

      <CollectionJsonLd
        url={`https://groware.io/${locale}/blog`}
        title={t("pageTitle")}
        description={t("pageDescription")}
      />

      <main className="mx-auto max-w-4xl px-6 pt-28 pb-20">
        <h1 className="text-3xl font-bold text-zinc-100 font-display">
          {t("pageTitle")}
        </h1>
        <p className="mt-2 text-zinc-500 text-sm">
          {t("pageDescription")}
        </p>

        {posts.length === 0 ? (
          <p className="mt-16 text-center text-zinc-600">
            {t("emptyState")}
          </p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {posts.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
