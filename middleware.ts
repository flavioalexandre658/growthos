import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
  "/changelog",
  "/docs",
  "/blog",
]);

function isPublicPage(pathname: string): boolean {
  const withoutLocale = pathname.replace(/^\/en(\/|$)/, "/");
  const basePath = withoutLocale.split("/").slice(0, 2).join("/") || "/";

  if (PUBLIC_PATHS.has(basePath)) return true;
  if (withoutLocale.startsWith("/p/")) return true;
  if (withoutLocale.startsWith("/invite/")) return true;
  if (withoutLocale.startsWith("/docs/")) return true;
  if (withoutLocale.startsWith("/blog/")) return true;

  return false;
}

function extractLocale(pathname: string): string {
  const match = pathname.match(/^\/en(\/|$)/);
  return match ? "en" : "pt";
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const intlResponse = intlMiddleware(req);

  if (!isPublicPage(pathname)) {
    const secureCookie = process.env.NODE_ENV === "production";
    const cookieName = secureCookie
      ? "__Secure-next-auth.session-token"
      : "next-auth.session-token";

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      cookieName,
    });

    if (!token) {
      const locale = extractLocale(pathname);
      const loginPath = locale === "pt" ? "/login" : "/en/login";
      const loginUrl = new URL(loginPath, req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const isNewOrg = req.nextUrl.searchParams.get("new-org") === "1";
    const hasStepParam = req.nextUrl.searchParams.has("step");
    if (pathname.includes("/onboarding") && token.onboardingCompleted && !isNewOrg && !hasStepParam) {
      const locale = extractLocale(pathname);
      const orgPath = locale === "pt" ? "/organizations" : "/en/organizations";
      return NextResponse.redirect(new URL(orgPath, req.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|tracker\\.js|tracker\\.min\\.js|tracker\\.min\\.js\\.map|favicon\\.ico|assets|icon|apple-icon|sitemap\\.xml|robots\\.txt).*)",
  ],
};
