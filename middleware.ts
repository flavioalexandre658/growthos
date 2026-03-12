import createIntlMiddleware from "next-intl/middleware";
import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

const PUBLIC_PAGE_PATTERNS = [
  /^\/[a-z]{2}$/,
  /^\/[a-z]{2}\/$/,
  /^\/[a-z]{2}\/(login|register|forgot-password|reset-password|privacy|terms|changelog|docs)(\/.*)?$/,
  /^\/[a-z]{2}\/p\//,
  /^\/[a-z]{2}\/invite\//,
];

function isPublicPage(pathname: string): boolean {
  return PUBLIC_PAGE_PATTERNS.some((pattern) => pattern.test(pathname));
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const hasLocalePrefix = /^\/[a-z]{2}(\/|$)/.test(pathname);
  if (!hasLocalePrefix) {
    return intlMiddleware(req);
  }

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
      const localeMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
      const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
      const loginUrl = new URL(`/${locale}/login`, req.url);
      loginUrl.searchParams.set("callbackUrl", req.url);
      return NextResponse.redirect(loginUrl);
    }

    const isNewOrg = req.nextUrl.searchParams.get("new-org") === "1";
    const hasStepParam = req.nextUrl.searchParams.has("step");
    if (pathname.includes("/onboarding") && token.onboardingCompleted && !isNewOrg && !hasStepParam) {
      const localeMatch = pathname.match(/^\/([a-z]{2})(\/.*)?$/);
      const locale = localeMatch ? localeMatch[1] : routing.defaultLocale;
      return NextResponse.redirect(new URL(`/${locale}/organizations`, req.url));
    }
  }

  return intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|tracker\\.js|tracker\\.min\\.js|tracker\\.min\\.js\\.map|favicon\\.ico|assets|icon|apple-icon).*)",
  ],
};
