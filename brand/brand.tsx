import { useState } from "react";

// ─── Icon Mark ────────────────────────────────────────────────────────────────
const GrowareIcon = ({ size = 48 }) => {
  const id = `g${size}`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id={`${id}-bg`}
          x1="0"
          y1="0"
          x2="100"
          y2="100"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#111118" />
          <stop offset="100%" stopColor="#0c0c14" />
        </linearGradient>

        <linearGradient
          id={`${id}-mark`}
          x1="18"
          y1="75"
          x2="82"
          y2="20"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4338ca" />
          <stop offset="50%" stopColor="#6366f1" />
          <stop offset="100%" stopColor="#a5b4fc" />
        </linearGradient>

        <filter id={`${id}-glow`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
          <feColorMatrix
            in="blur"
            type="matrix"
            values="0 0 0 0 0.31  0 0 0 0 0.27  0 0 0 0 0.9  0 0 0 0.55 0"
            result="coloredBlur"
          />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id={`${id}-bloom`} cx="60%" cy="30%" r="60%">
          <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.07" />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Background */}
      <rect width="100" height="100" rx="22" ry="22" fill={`url(#${id}-bg)`} />
      <rect
        width="100"
        height="100"
        rx="22"
        ry="22"
        fill={`url(#${id}-bloom)`}
      />

      {/* 1px border */}
      <rect
        x="0.75"
        y="0.75"
        width="98.5"
        height="98.5"
        rx="21.5"
        ry="21.5"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.07"
        strokeWidth="1.5"
      />

      {/* ── MARK: trending line with arrow ── */}
      {/* Main path — 4 nodes forming a growth curve with a dip (realistic data) */}
      <path
        d="M 19 74  L 40 46  L 57 57  L 79 22"
        stroke={`url(#${id}-mark)`}
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${id}-glow)`}
      />

      {/* Arrow wings at top-right */}
      <path
        d="M 67 19  L 81 22  L 78 36"
        stroke={`url(#${id}-mark)`}
        strokeWidth="8.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        filter={`url(#${id}-glow)`}
      />

      {/* Node dots */}
      <circle cx="19" cy="74" r="5" fill="#4338ca" opacity="0.9" />
      <circle cx="40" cy="46" r="4" fill="#6366f1" opacity="0.9" />
      <circle cx="57" cy="57" r="4" fill="#6366f1" opacity="0.9" />
      <circle
        cx="79"
        cy="22"
        r="5.5"
        fill="#a5b4fc"
        opacity="1"
        filter={`url(#${id}-glow)`}
      />
    </svg>
  );
};

// ─── Logo Lockup ─────────────────────────────────────────────────────────────
const GrowareLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" | "xl" }) => {
  const cfg = {
    sm: { icon: 26, fontSize: "15px", gap: "9px", track: "-0.035em" },
    md: { icon: 36, fontSize: "21px", gap: "11px", track: "-0.04em" },
    lg: { icon: 48, fontSize: "28px", gap: "14px", track: "-0.045em" },
    xl: { icon: 64, fontSize: "40px", gap: "18px", track: "-0.05em" },
  };
  const c = cfg[size];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: c.gap }}>
      <GrowareIcon size={c.icon} />
      <span
        style={{
          fontSize: c.fontSize,
          fontWeight: 600,
          letterSpacing: c.track,
          color: "#fafafa",
          lineHeight: 1,
          fontFamily: "'Inter', system-ui, sans-serif",
        }}
      >
        grow<span style={{ color: "#818cf8" }}>are</span>
      </span>
    </div>
  );
};

// ─── Badge ────────────────────────────────────────────────────────────────────
const GrowareBadge = () => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      background: "rgba(79,70,229,0.1)",
      border: "1px solid rgba(99,102,241,0.2)",
      borderRadius: "8px",
      padding: "5px 10px 5px 5px",
    }}
  >
    <GrowareIcon size={18} />
    <span
      style={{
        fontSize: "12px",
        fontWeight: 500,
        color: "#a5b4fc",
        letterSpacing: "-0.02em",
        fontFamily: "system-ui",
      }}
    >
      groware
    </span>
  </div>
);

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("mark");
  const tabs = ["mark", "lockup", "contexts"];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#09090b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "44px",
        padding: "48px 24px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Header + tabs */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
        }}
      >
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#3f3f46",
            fontWeight: 500,
          }}
        >
          Groware · Brand System
        </span>
        <div
          style={{
            display: "flex",
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: "10px",
            padding: "3px",
            gap: "2px",
          }}
        >
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: "6px 18px",
                borderRadius: "7px",
                fontSize: "12px",
                fontWeight: 500,
                letterSpacing: "-0.01em",
                border: "none",
                cursor: "pointer",
                transition: "all 0.15s",
                background: tab === t ? "#1a1a2e" : "transparent",
                color: tab === t ? "#818cf8" : "#52525b",
                outline: "none",
                boxShadow:
                  tab === t ? "inset 0 0 0 1px rgba(99,102,241,0.25)" : "none",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* ── MARK ── */}
      {tab === "mark" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "36px",
          }}
        >
          <GrowareIcon size={152} />
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              gap: "20px",
              background: "#111113",
              border: "1px solid #1c1c1f",
              borderRadius: "14px",
              padding: "22px 30px",
            }}
          >
            {[16, 20, 24, 32, 40, 48, 64].map((s) => (
              <div
                key={s}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <GrowareIcon size={s} />
                <span
                  style={{
                    fontSize: "10px",
                    color: "#3f3f46",
                    fontFamily: "monospace",
                  }}
                >
                  {s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── LOCKUP ── */}
      {tab === "lockup" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            background: "#111113",
            border: "1px solid #1c1c1f",
            borderRadius: "18px",
            padding: "36px 48px",
          }}
        >
          {(["sm", "md", "lg", "xl"] as const).map((s) => (
            <div
              key={s}
              style={{ display: "flex", alignItems: "center", gap: "20px" }}
            >
              <span
                style={{
                  fontSize: "10px",
                  color: "#3f3f46",
                  fontFamily: "monospace",
                  width: "16px",
                }}
              >
                {s}
              </span>
              <GrowareLogo size={s} />
            </div>
          ))}
        </div>
      )}

      {/* ── CONTEXTS ── */}
      {tab === "contexts" && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "12px",
            width: "660px",
          }}
        >
          {/* Sidebar mock */}
          <div
            style={{
              background: "#111113",
              border: "1px solid #1c1c1f",
              borderRadius: "14px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "#3f3f46",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Sidebar
            </span>
            <GrowareLogo size="sm" />
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "4px",
                marginTop: "4px",
              }}
            >
              {(
                [
                  ["Overview", true],
                  ["Revenue", false],
                  ["Channels", false],
                  ["MRR", false],
                ] as [string, boolean][]
              ).map(([label, active]) => (
                <div
                  key={label}
                  style={{
                    fontSize: "12px",
                    color: active ? "#a5b4fc" : "#52525b",
                    padding: "5px 8px",
                    borderRadius: "6px",
                    background: active ? "rgba(79,70,229,0.1)" : "transparent",
                    letterSpacing: "-0.01em",
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Tab + badge */}
          <div
            style={{
              background: "#111113",
              border: "1px solid #1c1c1f",
              borderRadius: "14px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "#3f3f46",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              Browser / Badge
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
                padding: "7px 12px",
              }}
            >
              <GrowareIcon size={16} />
              <span
                style={{
                  fontSize: "12px",
                  color: "#71717a",
                  letterSpacing: "-0.01em",
                }}
              >
                groware.io
              </span>
            </div>
            <GrowareBadge />
          </div>

          {/* npm / CLI */}
          <div
            style={{
              background: "#111113",
              border: "1px solid #1c1c1f",
              borderRadius: "14px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <span
              style={{
                fontSize: "10px",
                color: "#3f3f46",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              npm
            </span>
            <div
              style={{
                background: "#0c0c0e",
                borderRadius: "8px",
                padding: "14px",
                fontFamily: "monospace",
                fontSize: "11px",
                display: "flex",
                flexDirection: "column",
                gap: "5px",
              }}
            >
              <span style={{ color: "#52525b" }}>$ npm install</span>
              <div
                style={{ display: "flex", alignItems: "center", gap: "6px" }}
              >
                <GrowareIcon size={14} />
                <span style={{ color: "#818cf8" }}>@groware/tracker</span>
              </div>
              <span style={{ color: "#27272a", marginTop: "4px" }}>
                ✓ 2.1 kB added
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Token */}
      <div
        style={{
          fontSize: "11px",
          color: "#27272a",
          letterSpacing: "0.05em",
          fontFamily: "monospace",
        }}
      >
        #4f46e5 · #6366f1 · #818cf8 · #09090b
      </div>
    </div>
  );
}
