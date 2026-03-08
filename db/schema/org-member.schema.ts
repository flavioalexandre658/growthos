import { pgTable, uuid, text, timestamp, uniqueIndex, jsonb } from "drizzle-orm/pg-core";
import { organizations } from "./organization.schema";
import { users } from "./user.schema";
import type { ITourState } from "@/interfaces/tour.interface";

export type OrgMemberRole = "owner" | "admin" | "viewer";

export const orgMembers = pgTable(
  "org_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "admin", "viewer"] })
      .notNull()
      .default("viewer")
      .$type<OrgMemberRole>(),
    invitedAt: timestamp("invited_at").notNull().defaultNow(),
    acceptedAt: timestamp("accepted_at"),
    tourState: jsonb("tour_state").$type<ITourState>(),
  },
  (table) => [
    uniqueIndex("org_members_org_user_idx").on(
      table.organizationId,
      table.userId,
    ),
  ],
);

export const orgInvites = pgTable("org_invites", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "viewer"] })
    .notNull()
    .default("viewer")
    .$type<Exclude<OrgMemberRole, "owner">>(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
