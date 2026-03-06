import { ImageResponse } from "next/og";
import type { IPublicPageData } from "@/interfaces/public-page.interface";

export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function fetchData(slug: string): Promise<IPublicPageData | null> {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";

  const res = await fetch(`${baseUrl}/api/public/${slug}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) return null;
  return res.json();
}

function formatCurrency(value: number, locale: string, currency: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value / 100);
}

function getCurrentMonth(): string {
  return new Date().toLocaleString("pt-BR", { month: "long", year: "numeric" });
}

function buildSparkline(values: number[], width: number, height: number): string {
  if (!values.length) return "";

  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return `M ${points.join(" L ")}`;
}

interface OGImageProps {
  params: Promise<{ slug: string }>;
}

export default async function OGImage({ params }: OGImageProps) {
  const { slug } = await params;
  const data = await fetchData(slug);

  if (!data) {
    return new ImageResponse(
      (
        <div
          style={{
            background: "#09090b",
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <span style={{ color: "#52525b", fontSize: 24 }}>Página não encontrada</span>
        </div>
      ),
      { width: 1200, height: 630 },
    );
  }

  const mode = data.businessMode;

  let primaryValue: string | null = null;
  let primaryLabel = "";
  let growth: number | null = null;

  if (mode === "recurring") {
    if (data.metrics.mrr !== null && data.metrics.mrr !== undefined) {
      primaryValue =
        typeof data.metrics.mrr.value === "number"
          ? formatCurrency(data.metrics.mrr.value, data.org.locale, data.org.currency)
          : String(data.metrics.mrr.value);
      primaryLabel = "MRR";
      growth = data.metrics.mrrGrowthRate ?? null;
    }
  } else {
    if (data.metrics.monthlyRevenue !== null && data.metrics.monthlyRevenue !== undefined) {
      let revenueVal =
        typeof data.metrics.monthlyRevenue.value === "number"
          ? data.metrics.monthlyRevenue.value
          : 0;

      if (mode === "hybrid" && data.metrics.mrr && typeof data.metrics.mrr.value === "number") {
        revenueVal += data.metrics.mrr.value;
      }

      primaryValue = formatCurrency(revenueVal, data.org.locale, data.org.currency);
      primaryLabel = mode === "hybrid" ? "Receita Total" : "Receita";
      growth = data.metrics.revenueGrowthRate ?? null;
    }
  }

  let sparklinePath: string | null = null;
  if (mode === "recurring" && data.charts.mrrHistory) {
    sparklinePath = buildSparkline(data.charts.mrrHistory.map((d) => d.mrr), 320, 60);
  } else if (data.charts.revenueHistory) {
    sparklinePath = buildSparkline(data.charts.revenueHistory.map((d) => d.revenue), 320, 60);
  }

  const month = getCurrentMonth();
  const monthFormatted = month.charAt(0).toUpperCase() + month.slice(1);

  const secondaryMetrics: Array<{ label: string; value: string }> = [];

  if (mode === "recurring" || mode === "hybrid") {
    if (data.metrics.activeSubscriptions !== null && data.metrics.activeSubscriptions !== undefined) {
      secondaryMetrics.push({
        label: "Assinantes",
        value: String(data.metrics.activeSubscriptions.value),
      });
    }
    if (data.metrics.churnRate !== null && data.metrics.churnRate !== undefined) {
      secondaryMetrics.push({
        label: "Churn",
        value: `${data.metrics.churnRate.toFixed(1)}%`,
      });
    }
  }

  if (mode === "one_time" || mode === "hybrid") {
    if (data.metrics.uniqueCustomers !== null && data.metrics.uniqueCustomers !== undefined) {
      secondaryMetrics.push({
        label: "Clientes",
        value: String(data.metrics.uniqueCustomers.value),
      });
    }
    if (data.metrics.ticketMedio !== null && data.metrics.ticketMedio !== undefined) {
      secondaryMetrics.push({
        label: "Ticket médio",
        value:
          typeof data.metrics.ticketMedio.value === "number"
            ? formatCurrency(data.metrics.ticketMedio.value, data.org.locale, data.org.currency)
            : String(data.metrics.ticketMedio.value),
      });
    }
    if (data.metrics.repurchaseRate !== null && data.metrics.repurchaseRate !== undefined) {
      secondaryMetrics.push({
        label: "Recompra",
        value: `${data.metrics.repurchaseRate.toFixed(1)}%`,
      });
    }
  }

  if (data.metrics.arpu !== null && data.metrics.arpu !== undefined && mode === "recurring") {
    secondaryMetrics.push({
      label: "ARPU",
      value:
        typeof data.metrics.arpu.value === "number"
          ? formatCurrency(data.metrics.arpu.value, data.org.locale, data.org.currency)
          : String(data.metrics.arpu.value),
    });
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: "#09090b",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "72px 80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(99,102,241,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(99,102,241,0.04) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 52,
            position: "relative",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span
              style={{
                color: "#a1a1aa",
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "1.5px",
              }}
            >
              BUILDING IN PUBLIC
            </span>
            <span
              style={{
                color: "#fafafa",
                fontSize: 36,
                fontWeight: 800,
                letterSpacing: "-0.8px",
                lineHeight: 1.1,
              }}
            >
              {data.org.name}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <span style={{ color: "#52525b", fontSize: 14, fontWeight: 500 }}>
              {monthFormatted}
            </span>
            {data.org.verified && (
              <span
                style={{
                  background: "#052e16",
                  border: "1px solid #14532d",
                  borderRadius: 20,
                  padding: "4px 12px",
                  color: "#86efac",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                ✓ Verificado via Stripe
              </span>
            )}
          </div>
        </div>

        {primaryValue && (
          <div
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 16,
              marginBottom: 40,
              position: "relative",
            }}
          >
            <span
              style={{
                color: "#6366f1",
                fontSize: 88,
                fontWeight: 900,
                letterSpacing: "-2px",
                lineHeight: 1,
              }}
            >
              {primaryValue}
            </span>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <span style={{ color: "#71717a", fontSize: 24, fontWeight: 600 }}>{primaryLabel}</span>
              {growth !== null && growth !== undefined && (
                <span
                  style={{
                    color: growth >= 0 ? "#10b981" : "#a1a1aa",
                    fontSize: 18,
                    fontWeight: 700,
                  }}
                >
                  {growth > 0 ? "+" : ""}
                  {growth.toFixed(1)}%
                </span>
              )}
            </div>
          </div>
        )}

        <div style={{ display: "flex", gap: 48, marginBottom: 40, position: "relative" }}>
          {secondaryMetrics.slice(0, 3).map((m) => (
            <div key={m.label} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ color: "#52525b", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "1px" }}>
                {m.label}
              </span>
              <span style={{ color: "#e4e4e7", fontSize: 32, fontWeight: 800, letterSpacing: "-0.5px" }}>
                {m.value}
              </span>
            </div>
          ))}
        </div>

        {sparklinePath && (
          <div style={{ display: "flex", position: "relative", marginBottom: 28 }}>
            <svg width={320} height={60} viewBox="0 0 320 60">
              <defs>
                <linearGradient id="sparkGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#4f46e5" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={1} />
                </linearGradient>
              </defs>
              <path
                d={sparklinePath}
                fill="none"
                stroke="url(#sparkGrad)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "relative",
          }}
        >
          <span style={{ color: "#3f3f46", fontSize: 13, fontWeight: 500 }}>
            Building in public
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 24,
                height: 24,
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span style={{ color: "#fff", fontSize: 14, fontWeight: 800 }}>G</span>
            </div>
            <span style={{ color: "#52525b", fontSize: 13, fontWeight: 600 }}>
              powered by GrowthOS
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
