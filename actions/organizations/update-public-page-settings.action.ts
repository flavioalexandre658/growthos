"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { organizations } from "@/db/schema";

const publicPageSettingsSchema = z.object({
  showAbsoluteValues: z.boolean(),
  showMrr: z.boolean(),
  showSubscribers: z.boolean(),
  showChurn: z.boolean(),
  showArpu: z.boolean(),
  showGrowthChart: z.boolean(),
  showSankey: z.boolean(),
  showRevenue: z.boolean(),
  showTicketMedio: z.boolean(),
  showRepurchaseRate: z.boolean(),
  showRevenueSplit: z.boolean(),
});

const schema = z.object({
  organizationId: z.string().uuid(),
  publicPageEnabled: z.boolean(),
  publicDescription: z.string().max(200).nullable(),
  publicPageSettings: publicPageSettingsSchema,
});

export async function updatePublicPageSettings(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  const [updated] = await db
    .update(organizations)
    .set({
      publicPageEnabled: data.publicPageEnabled,
      publicDescription: data.publicDescription,
      publicPageSettings: data.publicPageSettings,
      updatedAt: new Date(),
    })
    .where(eq(organizations.id, data.organizationId))
    .returning({
      id: organizations.id,
      publicPageEnabled: organizations.publicPageEnabled,
      publicPageSettings: organizations.publicPageSettings,
      publicDescription: organizations.publicDescription,
    });

  return updated;
}
