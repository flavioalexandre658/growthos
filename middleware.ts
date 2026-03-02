import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;

    const isNewOrg = req.nextUrl.searchParams.get("new-org") === "1";
    if (path.startsWith("/onboarding") && token?.onboardingCompleted && !isNewOrg) {
      return NextResponse.redirect(new URL("/organizations", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|login|register|tracker\\.js|favicon\\.ico|$).*)",
  ],
};
