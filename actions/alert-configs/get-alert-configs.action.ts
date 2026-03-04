"use server";

import { getServerSession } from "next-auth";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { authOptions } from "@/lib/auth-options";
import { db } from "@/db";
import { alertConfigs } from "@/db/schema";

const schema = z.object({
  organizationId: z.string().uuid(),
});

export async function getAlertConfigs(input: z.infer<typeof schema>) {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error("Unauthorized");

  const data = schema.parse(input);

  return db
    .select()
    .from(alertConfigs)
    .where(eq(alertConfigs.organizationId, data.organizationId))
    .orderBy(alertConfigs.type);
}
