import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import bcrypt from "bcryptjs";
import { organizations, apiKeys, users } from "./schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

function generateApiKey(prefix: string): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}_${result}`;
}

async function seed() {
  const existingOrgs = await db.select().from(organizations);

  if (existingOrgs.length > 0) {
    console.log("Already seeded, skipping organizations.");
  } else {
    const [convitede, rifas] = await db
      .insert(organizations)
      .values([
        {
          name: "Convitede",
          slug: "convitede",
          funnelSteps: [
            { eventType: "signup", label: "Cadastros" },
            { eventType: "edit", label: "Edições" },
            { eventType: "payment", label: "Pagamentos" },
          ],
        },
        {
          name: "123Rifas",
          slug: "123rifas",
          funnelSteps: [
            { eventType: "signup", label: "Cadastros" },
            { eventType: "campaign_created", label: "Campanhas" },
            { eventType: "payment", label: "Pagamentos" },
          ],
        },
      ])
      .returning();

    await db.insert(apiKeys).values([
      {
        organizationId: convitede.id,
        key: generateApiKey("tok"),
        name: "Convitede Production",
      },
      {
        organizationId: rifas.id,
        key: generateApiKey("tok"),
        name: "123Rifas Production",
      },
    ]);

    console.log("Organizations and API keys created.");
  }

  const existingUsers = await db.select().from(users);

  if (existingUsers.length > 0) {
    console.log("Admin user already exists, skipping.");
  } else {
    const passwordHash = await bcrypt.hash("admin123", 12);
    await db.insert(users).values({
      name: "Admin",
      email: "admin@growthos.com",
      passwordHash,
      role: "ADMIN",
    });
    console.log("Admin user created: admin@growthos.com / admin123");
  }

  console.log("Seed completed.");
}

seed().catch(console.error);
