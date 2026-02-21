import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

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
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/signin`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              password: credentials.password,
            }),
          }
        );

        if (!res.ok) return null;

        const data = await res.json();

        if (!data?.user || !data?.access_token) return null;

        const user = data.user;
        const rawRole = user.role ?? null;
        const role = rawRole && typeof rawRole === "object" ? (rawRole.name ?? null) : rawRole;
        const roleId = user.role_id ?? null;

        const isAdmin = role === "admin" || roleId === 1;

        if (!isAdmin) return null;

        return {
          id: String(user.id ?? user.uuid),
          uuid: user.uuid,
          name: user.name,
          email: user.email,
          access_token: data.access_token,
          role: role,
          role_id: roleId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.uuid = user.uuid;
        token.name = user.name;
        token.email = user.email ?? "";
        token.access_token = user.access_token;
        token.role = user.role;
        token.role_id = user.role_id;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = {
        id: token.id,
        uuid: token.uuid,
        name: token.name,
        email: token.email ?? "",
        access_token: token.access_token,
        role: token.role,
        role_id: token.role_id,
      };
      return session;
    },
  },
};
