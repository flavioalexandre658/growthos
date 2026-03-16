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

  return { country: null, region: null, city: null };
}
