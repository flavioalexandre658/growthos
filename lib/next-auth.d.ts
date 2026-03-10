import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: string;
      locale: string;
      onboardingCompleted: boolean;
      authProvider: string;
    };
  }

  interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    locale: string;
    onboardingCompleted: boolean;
    authProvider: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    name: string;
    email: string;
    role: string;
    locale: string;
    onboardingCompleted: boolean;
    authProvider: string;
  }
}
