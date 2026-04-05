"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { users, organizations, orgMembers } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates/welcome";

const schema = z.object({
  companyName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  locale: z.enum(["pt", "en"]).optional().default("pt"),
});

function toSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6);
}

function getRegionalDefaults(locale: "pt" | "en") {
  if (locale === "pt") {
    return {
      currency: "BRL",
      country: "BR",
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      language: "pt-BR",
    };
  }
  return {
    currency: "USD",
    country: "US",
    timezone: "America/New_York",
    locale: "en-US",
    language: "en-US",
  };
}

export async function register(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "VALIDATION_ERROR" };
  const data = parsed.data;

  const [existing] = await db
    .select({ id: users.id, authProvider: users.authProvider })
    .from(users)
    .where(eq(users.email, data.email))
    .limit(1);

  if (existing) {
    return {
      error:
        existing.authProvider === "google"
          ? "EMAIL_REGISTERED_WITH_GOOGLE"
          : "EMAIL_ALREADY_EXISTS",
    };
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const [user] = await db
    .insert(users)
    .values({
      name: data.companyName,
      email: data.email,
      passwordHash,
      locale: data.locale,
      authProvider: "credentials",
      role: "ADMIN",
      onboardingCompleted: true,
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  const regional = getRegionalDefaults(data.locale);
  let slug = toSlug(data.companyName);

  for (let attempt = 0; attempt < 3; attempt++) {
    const candidate = attempt === 0 ? slug : `${slug}-${randomSuffix()}`;
    const [existingOrg] = await db
      .select({ id: organizations.id })
      .from(organizations)
      .where(eq(organizations.slug, candidate))
      .limit(1);

    if (!existingOrg) {
      slug = candidate;
      break;
    }

    if (attempt === 2) {
      slug = `${slug}-${randomSuffix()}`;
    }
  }

  const [org] = await db
    .insert(organizations)
    .values({
      name: data.companyName,
      slug,
      currency: regional.currency,
      country: regional.country,
      timezone: regional.timezone,
      locale: regional.locale,
      language: regional.language,
      createdByUserId: user.id,
    })
    .returning({ id: organizations.id, slug: organizations.slug });

  await db.insert(orgMembers).values({
    organizationId: org.id,
    userId: user.id,
    role: "owner",
    acceptedAt: new Date(),
  });

  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const emailSubject =
    data.locale === "en"
      ? `Welcome to Groware, ${user.name}!`
      : `Bem-vindo ao Groware, ${user.name}!`;

  sendEmail({
    to: user.email,
    subject: emailSubject,
    html: welcomeEmail({
      userName: user.name,
      dashboardUrl: `${baseUrl}/${org.slug}`,
      locale: data.locale,
    }),
  }).catch((err) => {
    console.error("[welcome-email]", err);
  });

  return { user, orgSlug: org.slug };
}
