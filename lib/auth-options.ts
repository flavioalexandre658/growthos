import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, organizations, orgMembers } from "@/db/schema";
import { sendEmail } from "@/lib/email";
import { welcomeEmail } from "@/lib/email-templates/welcome";
import { isPlatformAdmin } from "@/utils/is-platform-admin";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, credentials.email))
          .limit(1);

        if (!user || !user.passwordHash) return null;

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValidPassword) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          locale: user.locale,
          onboardingCompleted: user.onboardingCompleted,
          authProvider: user.authProvider ?? "credentials",
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;

      const email = user.email;
      if (!email) return false;

      const [existing] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing) {
        if (existing.authProvider === "credentials") {
          await db
            .update(users)
            .set({ authProvider: "google", updatedAt: new Date() })
            .where(eq(users.id, existing.id));
        }
        return true;
      }

      const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

      const userName = user.name ?? email.split("@")[0];

      const [newUser] = await db
        .insert(users)
        .values({
          name: userName,
          email,
          passwordHash: null,
          authProvider: "google",
          role: "ADMIN",
          onboardingCompleted: true,
        })
        .returning({ id: users.id, name: users.name, email: users.email });

      const slugBase = email
        .split("@")[0]
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40);
      const suffix = Math.random().toString(36).slice(2, 6);
      const slug = `${slugBase}-${suffix}`;

      const [org] = await db
        .insert(organizations)
        .values({
          name: userName,
          slug,
          currency: "USD",
          country: "US",
          timezone: "America/New_York",
          locale: "en-US",
          language: "en-US",
          createdByUserId: newUser.id,
        })
        .returning({ id: organizations.id, slug: organizations.slug });

      await db.insert(orgMembers).values({
        organizationId: org.id,
        userId: newUser.id,
        role: "owner",
        acceptedAt: new Date(),
      });

      sendEmail({
        to: newUser.email,
        subject: `Welcome to Groware, ${newUser.name}!`,
        html: welcomeEmail({
          userName: newUser.name,
          dashboardUrl: `${baseUrl}/${org.slug}`,
        }),
      }).catch((err) => {
        console.error("[welcome-email-google]", err);
      });

      return true;
    },
    async jwt({ token, user, trigger, session, account }) {
      if (trigger === "update") {
        if (session?.onboardingCompleted !== undefined) {
          token.onboardingCompleted = session.onboardingCompleted as boolean;
        }
        if (session?.locale !== undefined) {
          token.locale = session.locale as string;
        }
      }

      if (user && account?.provider === "google") {
        const [dbUser] = await db
          .select()
          .from(users)
          .where(eq(users.email, user.email ?? ""))
          .limit(1);

        if (dbUser) {
          token.id = dbUser.id;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.role = dbUser.role;
          token.locale = dbUser.locale;
          token.onboardingCompleted = dbUser.onboardingCompleted;
          token.authProvider = dbUser.authProvider ?? "google";
        }
      } else if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email ?? "";
        token.role = user.role;
        token.locale = user.locale;
        token.onboardingCompleted = user.onboardingCompleted;
        token.authProvider = user.authProvider ?? "credentials";
      }

      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        name: token.name,
        email: token.email ?? "",
        role: token.role,
        locale: token.locale,
        onboardingCompleted: token.onboardingCompleted,
        authProvider: token.authProvider ?? "credentials",
        isPlatformAdmin: isPlatformAdmin(token.email),
      };
      return session;
    },
  },
};
