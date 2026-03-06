import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { getTranslations } from "next-intl/server";
import { authOptions } from "@/lib/auth-options";
import { RegisterForm } from "./_components/register-form";
import {
  IconChartLine,
  IconTargetArrow,
  IconSparkles,
} from "@tabler/icons-react";
import { GrowareLogo } from "@/components/groware-logo";
import type { Metadata } from "next";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth.register" });
  return { title: t("pageTitle") };
}

export default async function RegisterPage() {
  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/organizations");
  }

  const t = await getTranslations("auth.register");
  const features = t.raw("features") as Array<{ title: string; desc: string }>;

  const featureColors = [
    { color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  ];

  const featureIcons = [IconChartLine, IconTargetArrow, IconSparkles];

  return (
    <main className="min-h-screen bg-zinc-950 flex">
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-12 bg-zinc-900/50 border-r border-zinc-800/50 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 via-transparent to-violet-950/20" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(#6366f1 1px, transparent 1px), linear-gradient(90deg, #6366f1 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="absolute top-10 left-10 z-10">
          <GrowareLogo size="sm" />
        </div>

        <div className="relative z-10 w-full max-w-md space-y-8">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              {t("tagline")}
            </p>
            <h1 className="text-4xl font-bold text-zinc-100 leading-tight">
              {t("brandHeadline")}
            </h1>
            <p className="text-zinc-500 text-sm leading-relaxed">
              {t("brandSub")}
            </p>
          </div>

          <div className="space-y-3">
            {features.map((item, idx) => {
              const Icon = featureIcons[idx];
              const { color, bg } = featureColors[idx];
              return (
                <div
                  key={item.title}
                  className={`flex gap-3.5 rounded-xl border p-4 ${bg}`}
                >
                  <div className={`mt-0.5 shrink-0 ${color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="space-y-0.5">
                    <p className={`text-sm font-semibold ${color}`}>
                      {item.title}
                    </p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-zinc-700">
            {t("copyright")}
          </p>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-1 lg:hidden">
            <div className="mb-6">
              <GrowareLogo size="sm" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-100">{t("title")}</h2>
            <p className="text-sm text-zinc-500">
              {t("subtitle")}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-6 backdrop-blur-sm">
            <RegisterForm />
          </div>

          <p className="text-center text-xs text-zinc-700">
            {t("termsNote")}
          </p>
        </div>
      </div>
    </main>
  );
}
