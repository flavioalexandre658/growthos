export function maskName(name: string | null | undefined): string {
  if (!name) return "•••••";
  return name
    .split(" ")
    .map((word) => {
      if (word.length <= 1) return word;
      return word[0] + "•".repeat(Math.min(word.length - 1, 4));
    })
    .join(" ");
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "•••@•••.•••";
  const [local, domain] = email.split("@");
  if (!domain) return email[0] + "•".repeat(Math.min(local.length - 1, 5));
  const [domainName, ...tld] = domain.split(".");
  const maskedLocal = local[0] + "•".repeat(Math.min(local.length - 1, 5));
  const maskedDomain = domainName[0] + "•".repeat(Math.min(domainName.length - 1, 5));
  return `${maskedLocal}@${maskedDomain}.${tld.join(".")}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "••••••••";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return "••••" + digits.slice(-4);
}

export function maskLocation(city: string | null | undefined, country: string | null | undefined): string {
  const parts: string[] = [];
  if (city) {
    parts.push(city[0] + "•".repeat(Math.min(city.length - 1, 5)));
  }
  if (country) {
    parts.push(country.slice(0, 2).toUpperCase().split("").map(() => "•").join("") + "");
  }
  return parts.length > 0 ? parts.join(", ") : "•••";
}

export function maskCustomerId(id: string | null | undefined): string {
  if (!id) return "•••";
  if (id.length <= 6) return id[0] + "•".repeat(id.length - 1);
  const prefix = id.slice(0, 4);
  const suffix = id.slice(-3);
  return `${prefix}•••${suffix}`;
}
