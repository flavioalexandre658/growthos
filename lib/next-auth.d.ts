import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      uuid: string;
      name: string;
      email: string;
      access_token: string;
      role: string | null;
      role_id: number | null;
    };
  }

  interface User {
    id: string;
    uuid: string;
    name: string;
    email: string;
    access_token: string;
    role: string | null;
    role_id: number | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    uuid: string;
    name: string;
    email: string;
    access_token: string;
    role: string | null;
    role_id: number | null;
  }
}
