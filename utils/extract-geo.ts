import geoip from "geoip-lite";

export interface IGeoData {
  country: string | null;
  region: string | null;
  city: string | null;
}

function safeDecodeCity(raw: string | null): string | null {
  if (!raw) return null;
  try {
    return decodeURIComponent(raw) || null;
  } catch {
    return raw || null;
  }
}

function extractClientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return null;
}

export function extractGeo(headers: Headers): IGeoData {
  // 1. Vercel headers
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCountry) {
    return {
      country: vercelCountry,
      region: headers.get("x-vercel-ip-country-region") ?? null,
      city: safeDecodeCity(headers.get("x-vercel-ip-city")),
    };
  }

  // 2. Cloudflare header
  const cfCountry = headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX") {
    return { country: cfCountry, region: null, city: null };
  }

  // 3. geoip-lite lookup by IP
  const ip = extractClientIp(headers);
  if (ip) {
    const geo = geoip.lookup(ip);
    if (geo) {
      return {
        country: geo.country || null,
        region: geo.region || null,
        city: geo.city || null,
      };
    }
  }

  return { country: null, region: null, city: null };
}
