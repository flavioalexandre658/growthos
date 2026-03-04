export const TIMEZONE_OPTIONS = [
  { value: "America/Sao_Paulo", label: "Brasília (UTC-3)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Belem", label: "Belém (UTC-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (UTC-3)" },
  { value: "America/Recife", label: "Recife (UTC-3)" },
  { value: "America/Porto_Velho", label: "Porto Velho (UTC-4)" },
  { value: "America/Boa_Vista", label: "Boa Vista (UTC-4)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Rio_Branco", label: "Rio Branco (UTC-5)" },
  { value: "America/New_York", label: "Nova York (UTC-5/4)" },
  { value: "America/Chicago", label: "Chicago (UTC-6/5)" },
  { value: "America/Denver", label: "Denver (UTC-7/6)" },
  { value: "America/Los_Angeles", label: "Los Angeles (UTC-8/7)" },
  { value: "America/Mexico_City", label: "Cidade do México (UTC-6)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (UTC-3)" },
  { value: "America/Santiago", label: "Santiago (UTC-4/3)" },
  { value: "America/Bogota", label: "Bogotá (UTC-5)" },
  { value: "America/Lima", label: "Lima (UTC-5)" },
  { value: "Europe/London", label: "Londres (UTC+0/1)" },
  { value: "Europe/Paris", label: "Paris (UTC+1/2)" },
  { value: "Europe/Berlin", label: "Berlim (UTC+1/2)" },
  { value: "Europe/Lisbon", label: "Lisboa (UTC+0/1)" },
  { value: "Europe/Madrid", label: "Madri (UTC+1/2)" },
  { value: "Asia/Tokyo", label: "Tóquio (UTC+9)" },
  { value: "Asia/Shanghai", label: "Xangai (UTC+8)" },
  { value: "Asia/Dubai", label: "Dubai (UTC+4)" },
  { value: "Australia/Sydney", label: "Sydney (UTC+10/11)" },
  { value: "UTC", label: "UTC (UTC+0)" },
];

export const CURRENCY_OPTIONS = [
  { value: "BRL", label: "Real Brasileiro (BRL)", country: "BR" },
  { value: "USD", label: "Dólar Americano (USD)", country: "US" },
  { value: "EUR", label: "Euro (EUR)", country: "PT" },
  { value: "GBP", label: "Libra Esterlina (GBP)", country: "GB" },
  { value: "ARS", label: "Peso Argentino (ARS)", country: "AR" },
  { value: "CLP", label: "Peso Chileno (CLP)", country: "CL" },
  { value: "COP", label: "Peso Colombiano (COP)", country: "CO" },
  { value: "MXN", label: "Peso Mexicano (MXN)", country: "MX" },
  { value: "PEN", label: "Sol Peruano (PEN)", country: "PE" },
  { value: "CAD", label: "Dólar Canadense (CAD)", country: "CA" },
  { value: "AUD", label: "Dólar Australiano (AUD)", country: "AU" },
  { value: "JPY", label: "Iene Japonês (JPY)", country: "JP" },
];

export const LOCALE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)", currency: "BRL", country: "BR", language: "pt-BR" },
  { value: "pt-PT", label: "Português (Portugal)", currency: "EUR", country: "PT", language: "pt-PT" },
  { value: "en-US", label: "English (United States)", currency: "USD", country: "US", language: "en-US" },
  { value: "en-GB", label: "English (United Kingdom)", currency: "GBP", country: "GB", language: "en-GB" },
  { value: "es-ES", label: "Español (España)", currency: "EUR", country: "ES", language: "es-ES" },
  { value: "es-MX", label: "Español (México)", currency: "MXN", country: "MX", language: "es-MX" },
  { value: "es-AR", label: "Español (Argentina)", currency: "ARS", country: "AR", language: "es-AR" },
  { value: "fr-FR", label: "Français (France)", currency: "EUR", country: "FR", language: "fr-FR" },
  { value: "de-DE", label: "Deutsch (Deutschland)", currency: "EUR", country: "DE", language: "de-DE" },
  { value: "ja-JP", label: "日本語 (Japan)", currency: "JPY", country: "JP", language: "ja-JP" },
];

export const LANGUAGE_OPTIONS = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
  { value: "de-DE", label: "Deutsch" },
];

export function detectBrowserRegional(): {
  timezone: string;
  locale: string;
  currency: string;
  country: string;
  language: string;
} {
  if (typeof window === "undefined") {
    return {
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      currency: "BRL",
      country: "BR",
      language: "pt-BR",
    };
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";
  const browserLocale = navigator.language || "pt-BR";

  const matchedLocale = LOCALE_OPTIONS.find(
    (l) => l.value === browserLocale || l.value.split("-")[0] === browserLocale.split("-")[0]
  ) ?? LOCALE_OPTIONS[0];

  return {
    timezone,
    locale: matchedLocale.value,
    currency: matchedLocale.currency,
    country: matchedLocale.country,
    language: matchedLocale.language,
  };
}
