import { getTranslations } from "next-intl/server";
import { LandingNav } from "@/app/[locale]/_components/landing-nav";
import { LandingFooter } from "@/app/[locale]/_components/landing-footer";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privacy" });
  return { title: t("pageTitle") };
}

type Section = {
  title: string;
  content?: string;
  extra?: string;
  intro?: string;
  items?: string[];
  email?: string;
};

export default async function PrivacyPage() {
  const t = await getTranslations("privacy");
  const sections = t.raw("sections") as Section[];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-50">
      <LandingNav />
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <p className="text-xs font-mono text-indigo-400 tracking-[0.12em] uppercase mb-5">{t("label")}</p>
        <h1
          className="font-display font-extrabold tracking-[-0.04em] leading-[1] mb-3"
          style={{ fontSize: "clamp(36px, 5vw, 56px)" }}
        >
          {t("title")}
        </h1>
        <p className="text-zinc-500 font-mono text-sm mb-12">{t("lastUpdated")}</p>

        <div className="flex flex-col gap-10 text-zinc-400 leading-relaxed">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-base font-semibold text-zinc-200 tracking-tight mb-3">{section.title}</h2>
              {section.email ? (
                <p>
                  {section.content}{" "}
                  <a
                    href={`mailto:${section.email}`}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    {section.email}
                  </a>
                  .
                </p>
              ) : (
                <>
                  {section.content && <p>{section.content}</p>}
                  {section.extra && <p className="mt-3">{section.extra}</p>}
                  {section.intro && <p>{section.intro}</p>}
                  {section.items && (
                    <ul className="mt-2 flex flex-col gap-1.5 ml-4">
                      {section.items.map((item) => (
                        <li key={item} className="flex items-start gap-2 text-sm">
                          <span className="text-indigo-400 mt-0.5 flex-shrink-0">·</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
