import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { milestones, organizations, orgMembers, users } from "@/db/schema";
import { getPublicMetrics } from "@/actions/public/get-public-metrics.action";
import { sendEmail } from "@/lib/email";
import { milestoneReachedEmail } from "@/lib/email-templates/milestone-reached";
import { createNotification } from "@/utils/create-notification";

export interface IMilestoneDefinition {
  key: string;
  label: string;
  emoji: string;
  metricLabel: string;
  check: (metrics: { mrr: number; activeSubscriptions: number; churnRate: number; mrrGrowthRate: number }) => boolean;
  getValue: (metrics: { mrr: number; activeSubscriptions: number; churnRate: number; mrrGrowthRate: number }, locale: string, currency: string) => string;
}

export const MILESTONE_DEFINITIONS: IMilestoneDefinition[] = [
  {
    key: "mrr_1k",
    label: "R$ 1.000 MRR",
    emoji: "🚀",
    metricLabel: "MRR",
    check: (m) => m.mrr >= 100_000,
    getValue: (m, locale, currency) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(m.mrr / 100),
  },
  {
    key: "mrr_5k",
    label: "R$ 5.000 MRR",
    emoji: "⚡",
    metricLabel: "MRR",
    check: (m) => m.mrr >= 500_000,
    getValue: (m, locale, currency) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(m.mrr / 100),
  },
  {
    key: "mrr_10k",
    label: "R$ 10.000 MRR",
    emoji: "🎯",
    metricLabel: "MRR",
    check: (m) => m.mrr >= 1_000_000,
    getValue: (m, locale, currency) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(m.mrr / 100),
  },
  {
    key: "mrr_50k",
    label: "R$ 50.000 MRR",
    emoji: "💎",
    metricLabel: "MRR",
    check: (m) => m.mrr >= 5_000_000,
    getValue: (m, locale, currency) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(m.mrr / 100),
  },
  {
    key: "mrr_100k",
    label: "R$ 100.000 MRR",
    emoji: "👑",
    metricLabel: "MRR",
    check: (m) => m.mrr >= 10_000_000,
    getValue: (m, locale, currency) =>
      new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(m.mrr / 100),
  },
  {
    key: "subs_10",
    label: "10 assinantes",
    emoji: "🌱",
    metricLabel: "Assinantes",
    check: (m) => m.activeSubscriptions >= 10,
    getValue: (m) => `${m.activeSubscriptions} assinantes`,
  },
  {
    key: "subs_100",
    label: "100 assinantes",
    emoji: "🎉",
    metricLabel: "Assinantes",
    check: (m) => m.activeSubscriptions >= 100,
    getValue: (m) => `${m.activeSubscriptions} assinantes`,
  },
  {
    key: "subs_1000",
    label: "1.000 assinantes",
    emoji: "🔥",
    metricLabel: "Assinantes",
    check: (m) => m.activeSubscriptions >= 1000,
    getValue: (m) => `${m.activeSubscriptions} assinantes`,
  },
  {
    key: "no_churn",
    label: "Mês sem churn",
    emoji: "✨",
    metricLabel: "Churn",
    check: (m) => m.churnRate === 0 && m.activeSubscriptions > 0,
    getValue: () => "0% churn",
  },
  {
    key: "mrr_2x",
    label: "MRR dobrou",
    emoji: "📈",
    metricLabel: "Crescimento",
    check: (m) => m.mrrGrowthRate >= 100,
    getValue: (m) => `+${m.mrrGrowthRate.toFixed(1)}% crescimento`,
  },
];

export async function checkMilestones(orgId: string): Promise<void> {
  const [org] = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      currency: organizations.currency,
      locale: organizations.locale,
      publicPageEnabled: organizations.publicPageEnabled,
    })
    .from(organizations)
    .where(eq(organizations.id, orgId))
    .limit(1);

  if (!org) return;

  const metrics = await getPublicMetrics(orgId);

  const reachedMilestones = await db
    .select({ key: milestones.key })
    .from(milestones)
    .where(eq(milestones.organizationId, orgId));

  const reachedKeys = new Set(reachedMilestones.map((m) => m.key));

  const orgOwners = await db
    .select({ email: users.email, name: users.name })
    .from(orgMembers)
    .innerJoin(users, eq(orgMembers.userId, users.id))
    .where(and(eq(orgMembers.organizationId, orgId), eq(orgMembers.role, "owner")));

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  for (const def of MILESTONE_DEFINITIONS) {
    if (reachedKeys.has(def.key)) continue;
    if (!def.check(metrics)) continue;

    await db.insert(milestones).values({
      organizationId: orgId,
      key: def.key,
    });

    const shareUrl = org.publicPageEnabled ? `${baseUrl}/p/${org.slug}` : undefined;
    const dashboardUrl = `${baseUrl}/${org.slug}/mrr`;
    const metricValue = def.getValue(metrics, org.locale, org.currency);

    for (const owner of orgOwners) {
      await sendEmail({
        to: owner.email,
        subject: `🎉 ${org.name} atingiu: ${def.label}`,
        html: milestoneReachedEmail({
          orgName: org.name,
          milestoneLabel: def.label,
          milestoneEmoji: def.emoji,
          metricLabel: def.metricLabel,
          metricValue,
          shareUrl,
          dashboardUrl,
        }),
      }).catch((err) => {
        console.error("[milestone-email]", err);
      });
    }

    await db
      .update(milestones)
      .set({ notifiedAt: new Date() })
      .where(and(eq(milestones.organizationId, orgId), eq(milestones.key, def.key)));

    createNotification({
      organizationId: orgId,
      type: "milestone",
      title: `${def.emoji} ${def.label}`,
      body: metricValue,
      linkUrl: `/${org.slug}/mrr`,
    }).catch(() => {});
  }
}
