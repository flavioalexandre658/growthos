export interface IGeoData {
  country: string | null;
  region: string | null;
  city: string | null;
}

export function extractGeo(headers: Headers): IGeoData {
  const rawCity = headers.get("x-vercel-ip-city");
  let city: string | null = null;
  if (rawCity) {
    try {
      city = decodeURIComponent(rawCity) || null;
    } catch {
      city = rawCity || null;
    }
  }

  return {
    country: headers.get("x-vercel-ip-country") ?? null,
    region: headers.get("x-vercel-ip-country-region") ?? null,
    city,
  };
}
